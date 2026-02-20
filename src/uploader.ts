/**
 * OSS Uploader class with retry logic and better error handling
 */

import OSS from 'ali-oss';
import { resolve, basename } from 'path';
import * as core from '@actions/core';
import fg from 'fast-glob';
import { existsSync, statSync } from 'fs';
import {
  OSSConfig,
  UploadRule,
  UploadResult,
  UploadStats,
  RetryConfig,
  UploadOptions,
  OSSResponse,
  OSSSDKError,
  NetworkError,
  FileNotFoundError
} from './types';
import {
  formatFileSize,
  formatDuration,
  calculateBackoffDelay,
  getFileStats,
  sanitizeRemotePath,
  extractRelativePath,
  delay,
  logOperation,
  logSuccess,
  logWarning,
  logError,
  logDebug
} from './utils';

export class OSSUploader {
  private oss: OSS;
  private retryConfig: RetryConfig;
  private stats: UploadStats;
  private config: OSSConfig;

  constructor(
    config: OSSConfig,
    retryConfig: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    }
  ) {
    this.config = config;
    this.oss = new OSS(config);
    this.retryConfig = retryConfig;
    this.stats = {
      totalFiles: 0,
      uploadedFiles: 0,
      failedFiles: 0,
      totalSize: 0,
      uploadedSize: 0,
      totalDuration: 0,
      successRate: 0
    };
  }

  /**
   * Upload files based on rules with retry logic
   */
  async uploadFiles(rules: UploadRule[], options: UploadOptions = {}): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const startTime = Date.now();

    logOperation('Starting upload process', `${rules.length} rule(s)`);
    logDebug('Upload process started', { rulesCount: rules.length, options });

    for (const rule of rules) {
      try {
        logDebug('Processing upload rule', { rule, ruleIndex: rules.indexOf(rule) + 1 });
        const ruleResults = await this.processRule(rule, options);
        results.push(...ruleResults);
        logDebug('Rule processing completed', {
          rule: rule.source + ' → ' + rule.destination,
          resultCount: ruleResults.length
        });
      } catch (error) {
        logError(`Failed to process rule: ${rule.source} → ${rule.destination}`);
        logDebug('Rule processing failed', { rule, error: error instanceof Error ? error.message : error });
        if (error instanceof Error) {
          core.error(error.message);
        }
        this.stats.failedFiles++;
      }
    }

    this.stats.totalDuration = Date.now() - startTime;
    this.stats.successRate = this.stats.totalFiles > 0
      ? (this.stats.uploadedFiles / this.stats.totalFiles) * 100
      : 0;

    this.logFinalStats();
    return results;
  }

  /**
   * Process a single upload rule
   */
  private async processRule(rule: UploadRule, options: UploadOptions): Promise<UploadResult[]> {
    logOperation(`Processing rule`, `${rule.source} → ${rule.destination}`);
    logDebug('Processing upload rule', rule);

    // For directory uploads, ensure source pattern includes glob to find all files
    // But first check if the source is actually a file - if so, don't convert to directory pattern
    let sourcePattern = rule.source;
    if (rule.isDirectory && !sourcePattern.includes('*') && !sourcePattern.includes('?') && !sourcePattern.includes('[')) {
      // Check if the source path exists and is a file
      if (existsSync(sourcePattern) && statSync(sourcePattern).isFile()) {
        // Source is a file but destination is a directory - this is valid (single file to directory)
        // Don't modify the source pattern
      } else {
        // Source is not a file or doesn't exist, treat as directory pattern
        sourcePattern = sourcePattern.endsWith('/') ? `${sourcePattern}**/*` : `${sourcePattern}/**/*`;
        logOperation(`Converted directory pattern`, `${rule.source} → ${sourcePattern}`);
      }
    }

    const globPattern = sourcePattern.replace(/\\/g, '/');

    logDebug('Searching for files with pattern', globPattern);
    const files = fg.sync([globPattern], {
      dot: false,
      onlyFiles: true,
      absolute: true
    });
    logDebug('Found files', { pattern: globPattern, count: files.length, files });

    // Check if this is a specific file path that doesn't exist
    // (as opposed to a glob pattern that legitimately finds no files)
    const isSpecificFile = !sourcePattern.includes('*') && !sourcePattern.includes('?') && !sourcePattern.includes('[');

    if (files.length === 0) {
      if (isSpecificFile) {
        // This is a specific file that doesn't exist - count as a failure
        logError(`File not found: ${rule.source}`);
        this.stats.totalFiles += 1;
        this.stats.failedFiles += 1;
        return [];
      } else {
        // This is a glob pattern that found no files - not an error
        logWarning(`No files found matching pattern: ${sourcePattern}`);
        return [];
      }
    }

    this.stats.totalFiles += files.length;
    logOperation(`Found ${files.length} file(s) to upload`);

    const results: UploadResult[] = [];

    if (!rule.isDirectory) {
      // Single file upload
      if (files.length > 1) {
        logWarning(`Multiple files found but destination is single file. Using first file: ${files[0]}`);
      }

      const result = await this.uploadSingleFile(files[0], rule.destination, options);
      if (result) results.push(result);
    } else {
      // Directory upload - process files sequentially
      for (const file of files) {
        let remotePath: string;

        // Check if this is a single file being uploaded to a directory destination
        if (files.length === 1 && !rule.source.includes('*') && !rule.source.includes('?') && !rule.source.includes('[')) {
          // Single file to directory - use just the filename
          const filename = basename(file);
          remotePath = sanitizeRemotePath(`${rule.destination}${filename}`);
        } else {
          // Multiple files or glob pattern - use relative path extraction
          const relativePath = extractRelativePath(file, rule.source);
          remotePath = sanitizeRemotePath(`${rule.destination}${relativePath}`);
        }

        const result = await this.uploadSingleFile(file, remotePath, options);
        if (result) results.push(result);
      }
    }

    return results;
  }

  /**
   * Upload a single file with retry logic
   */
  private async uploadSingleFile(
    localPath: string,
    remotePath: string,
    options: UploadOptions
  ): Promise<UploadResult | null> {
    try {
      logDebug('Starting single file upload', { localPath, remotePath });
      const fileStats = await getFileStats(localPath);
      this.stats.totalSize += fileStats.size;
      logDebug('File stats obtained', { localPath, size: fileStats.size, name: fileStats.name });

      const result = await this.uploadWithRetry(
        () => this.performUpload(localPath, remotePath, options),
        localPath,
        fileStats
      );

      if (result) {
        this.stats.uploadedFiles++;
        this.stats.uploadedSize += fileStats.size;
      }

      return result;
    } catch (error) {
      this.stats.failedFiles++;
      logError(`Failed to upload ${localPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Re-throw if it's a critical error
      if (error instanceof FileNotFoundError) {
        throw error;
      }

      return null;
    }
  }

  /**
   * Perform the actual upload with OSS
   */
  private async performUpload(
    localPath: string,
    remotePath: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    logDebug('Performing OSS upload', { localPath, remotePath, options });

    const uploadOptions: Record<string, unknown> = {
      timeout: options.timeout || 600000,
      ...options
    };

    // Handle gzip compression
    if (options.gzip) {
      uploadOptions.headers = {
        ...(uploadOptions.headers as Record<string, string> || {}),
        'Content-Encoding': 'gzip'
      };
    }

    const response = await this.oss.put(remotePath, resolve(localPath), uploadOptions);
    logDebug('OSS upload response received', { remotePath, responseStatus: response?.res?.status });

    // Handle OSS response structure safely
    const ossResponse = response as unknown as OSSResponse;
    const fileStats = await getFileStats(localPath);

    const result = {
      success: true,
      filePath: localPath,
      objectKey: remotePath,
      size: fileStats.size,
      ...(ossResponse.res?.headers?.etag && { etag: ossResponse.res.headers.etag }),
      ...(ossResponse.url && { url: ossResponse.url })
    };

    logDebug('Upload result created', result);
    return result;
  }

  /**
   * Upload with retry logic and exponential backoff
   */
  private async uploadWithRetry(
    uploadFn: () => Promise<UploadResult>,
    _filePath: string,
    fileStats: { size: number; name: string }
  ): Promise<UploadResult | null> {
    const fileSizeFormatted = formatFileSize(fileStats.size);
    logDebug('Starting upload with retry', { fileName: fileStats.name, size: fileSizeFormatted, maxRetries: this.retryConfig.maxRetries });

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const retryLabel = attempt > 0 ? ` - Retry ${attempt}` : '';
        logOperation(`⬆️  Uploading ${fileStats.name} (${fileSizeFormatted})${retryLabel}`);
        logDebug('Upload attempt', { attempt: attempt + 1, fileName: fileStats.name });

        const startTime = Date.now();
        const result = await uploadFn();
        const duration = Date.now() - startTime;

        logSuccess(`Uploaded ${fileStats.name} in ${formatDuration(duration)}`);
        logDebug('Upload successful', { fileName: fileStats.name, duration, attempt: attempt + 1 });
        return result;

      } catch (error: unknown) {
        const isLastAttempt = attempt === this.retryConfig.maxRetries - 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logWarning(`Upload failed for ${fileStats.name}: ${errorMessage}`);
        logDebug('Upload attempt failed', { fileName: fileStats.name, attempt: attempt + 1, error: errorMessage, isLastAttempt });

        // Convert to Error for the retry check
        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Check if it's a retryable error
        if (!this.isRetryableError(errorObj) || isLastAttempt) {
          if (isLastAttempt) {
            logError(`💥 All ${this.retryConfig.maxRetries} attempts failed for ${fileStats.name}`);
          }
          throw errorObj;
        }

        // Calculate backoff delay
        const delayMs = calculateBackoffDelay(
          attempt,
          this.retryConfig.baseDelay,
          this.retryConfig.maxDelay,
          this.retryConfig.backoffMultiplier
        );

        logOperation(`⏳ Retrying in ${formatDuration(delayMs)}... (attempt ${attempt + 2}/${this.retryConfig.maxRetries})`);
        logDebug('Retry delay calculated', { delayMs, attempt, fileName: fileStats.name });
        await delay(delayMs);
      }
    }

    return null;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof FileNotFoundError) {
      return false; // File not found is not retryable
    }

    // Network-related errors are retryable
    if (error instanceof NetworkError) {
      return true;
    }

    // OSS SDK specific errors
    const ossError = error as Error & OSSSDKError;
    if (ossError.code) {
      const retryableCodes = [
        'RequestTimeout',
        'ServiceUnavailable',
        'Throttling',
        'InternalError',
        'ConnectionTimeout',
        'SocketTimeout'
      ];
      return retryableCodes.includes(ossError.code);
    }

    // HTTP status codes that are retryable
    if (ossError.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(ossError.status);
    }

    // Timeout errors
    if (error.message && error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Get current upload statistics
   */
  getStats(): UploadStats {
    return { ...this.stats };
  }

  /**
   * Log final upload statistics
   */
  private logFinalStats(): void {
    const duration = formatDuration(this.stats.totalDuration);
    const totalSize = formatFileSize(this.stats.totalSize);
    const uploadedSize = formatFileSize(this.stats.uploadedSize);

    logSuccess(
      `Upload completed! ${this.stats.uploadedFiles}/${this.stats.totalFiles} files ` +
      `(${uploadedSize}/${totalSize}) uploaded in ${duration}`
    );

    if (this.stats.failedFiles > 0) {
      logWarning(`${this.stats.failedFiles} file(s) failed to upload`);
    }
  }

  /**
   * Test OSS connection
   */
  async testConnection(): Promise<boolean> {
    try {
      logDebug('Testing OSS connection', { bucket: this.config.bucket, region: this.config.region });
      await this.oss.getBucketInfo(this.config.bucket);
      logSuccess('OSS connection test successful');
      logDebug('OSS connection test details', { bucket: this.config.bucket, status: 'success' });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError(`OSS connection test failed: ${errorMessage}`);
      logDebug('OSS connection test failed', { bucket: this.config.bucket, error: errorMessage });
      return false;
    }
  }
}
