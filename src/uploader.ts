/**
 * OSS Uploader class with retry logic and better error handling
 */

import OSS from 'ali-oss';
import { resolve } from 'path';
import * as core from '@actions/core';
import * as fg from 'fast-glob';
import {
  OSSConfig,
  UploadRule,
  UploadResult,
  UploadStats,
  RetryConfig,
  UploadOptions,
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
  logError
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

    for (const rule of rules) {
      try {
        const ruleResults = await this.processRule(rule, options);
        results.push(...ruleResults);
      } catch (error) {
        logError(`Failed to process rule: ${rule.source} → ${rule.destination}`);
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

    const files = fg.sync([rule.source], {
      dot: false,
      onlyFiles: true,
      absolute: true
    });

    if (files.length === 0) {
      logWarning(`No files found matching pattern: ${rule.source}`);
      return [];
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
        const relativePath = extractRelativePath(file, rule.source);
        const remotePath = sanitizeRemotePath(`${rule.destination}${relativePath}`);

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
      const fileStats = await getFileStats(localPath);
      this.stats.totalSize += fileStats.size;

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
    const uploadOptions: any = {
      timeout: options.timeout || 120000,
      ...options
    };

    // Handle gzip compression
    if (options.gzip) {
      uploadOptions.headers = {
        ...uploadOptions.headers,
        'Content-Encoding': 'gzip'
      };
    }

    const startTime = Date.now();
    const response = await this.oss.put(remotePath, resolve(localPath), uploadOptions);
    const duration = Date.now() - startTime;

    // Handle OSS response structure safely
    const ossResponse = response as any;
    
    return {
      url: ossResponse.url,
      name: ossResponse.name,
      size: (await getFileStats(localPath)).size,
      etag: ossResponse.res?.headers?.etag || ossResponse.etag,
      versionId: ossResponse.res?.headers?.['x-oss-version-id'] || ossResponse.versionId,
      duration
    };
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

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const retryLabel = attempt > 0 ? ` - Retry ${attempt}` : '';
        logOperation(`⬆️  Uploading ${fileStats.name} (${fileSizeFormatted})${retryLabel}`);

        const startTime = Date.now();
        const result = await uploadFn();
        const duration = Date.now() - startTime;

        logSuccess(`Uploaded ${fileStats.name} in ${formatDuration(duration)}`);
        return result;

      } catch (error) {
        const isLastAttempt = attempt === this.retryConfig.maxRetries - 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logWarning(`Upload failed for ${fileStats.name}: ${errorMessage}`);

        // Check if it's a retryable error
        if (!this.isRetryableError(error) || isLastAttempt) {
          if (isLastAttempt) {
            logError(`💥 All ${this.retryConfig.maxRetries} attempts failed for ${fileStats.name}`);
          }
          throw error;
        }

        // Calculate backoff delay
        const delayMs = calculateBackoffDelay(
          attempt,
          this.retryConfig.baseDelay,
          this.retryConfig.maxDelay,
          this.retryConfig.backoffMultiplier
        );

        logOperation(`⏳ Retrying in ${formatDuration(delayMs)}... (attempt ${attempt + 2}/${this.retryConfig.maxRetries})`);
        await delay(delayMs);
      }
    }

    return null;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof FileNotFoundError) {
      return false; // File not found is not retryable
    }

    // Network-related errors are retryable
    if (error instanceof NetworkError) {
      return true;
    }

    // OSS SDK specific errors
    if (error.code) {
      const retryableCodes = [
        'RequestTimeout',
        'ServiceUnavailable',
        'Throttling',
        'InternalError',
        'ConnectionTimeout',
        'SocketTimeout'
      ];
      return retryableCodes.includes(error.code);
    }

    // HTTP status codes that are retryable
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
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
      await this.oss.getBucketInfo(this.config.bucket);
      logSuccess('OSS connection test successful');
      return true;
    } catch (error) {
      logError(`OSS connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}
