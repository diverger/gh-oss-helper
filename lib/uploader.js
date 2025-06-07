"use strict";
/**
 * OSS Uploader class with retry logic and better error handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSSUploader = void 0;
const ali_oss_1 = __importDefault(require("ali-oss"));
const path_1 = require("path");
const core = __importStar(require("@actions/core"));
const fg = __importStar(require("fast-glob"));
const types_1 = require("./types");
const utils_1 = require("./utils");
class OSSUploader {
    oss;
    retryConfig;
    stats;
    config;
    constructor(config, retryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
    }) {
        this.config = config;
        this.oss = new ali_oss_1.default(config);
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
    async uploadFiles(rules, options = {}) {
        const results = [];
        const startTime = Date.now();
        (0, utils_1.logOperation)('Starting upload process', `${rules.length} rule(s)`);
        for (const rule of rules) {
            try {
                const ruleResults = await this.processRule(rule, options);
                results.push(...ruleResults);
            }
            catch (error) {
                (0, utils_1.logError)(`Failed to process rule: ${rule.source} → ${rule.destination}`);
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
    async processRule(rule, options) {
        (0, utils_1.logOperation)(`Processing rule`, `${rule.source} → ${rule.destination}`);
        const files = fg.sync([rule.source], {
            dot: false,
            onlyFiles: true,
            absolute: true
        });
        if (files.length === 0) {
            (0, utils_1.logWarning)(`No files found matching pattern: ${rule.source}`);
            return [];
        }
        this.stats.totalFiles += files.length;
        (0, utils_1.logOperation)(`Found ${files.length} file(s) to upload`);
        const results = [];
        if (!rule.isDirectory) {
            // Single file upload
            if (files.length > 1) {
                (0, utils_1.logWarning)(`Multiple files found but destination is single file. Using first file: ${files[0]}`);
            }
            const result = await this.uploadSingleFile(files[0], rule.destination, options);
            if (result)
                results.push(result);
        }
        else {
            // Directory upload - process files sequentially
            for (const file of files) {
                const relativePath = (0, utils_1.extractRelativePath)(file, rule.source);
                const remotePath = (0, utils_1.sanitizeRemotePath)(`${rule.destination}${relativePath}`);
                const result = await this.uploadSingleFile(file, remotePath, options);
                if (result)
                    results.push(result);
            }
        }
        return results;
    }
    /**
     * Upload a single file with retry logic
     */
    async uploadSingleFile(localPath, remotePath, options) {
        try {
            const fileStats = await (0, utils_1.getFileStats)(localPath);
            this.stats.totalSize += fileStats.size;
            const result = await this.uploadWithRetry(() => this.performUpload(localPath, remotePath, options), localPath, fileStats);
            if (result) {
                this.stats.uploadedFiles++;
                this.stats.uploadedSize += fileStats.size;
            }
            return result;
        }
        catch (error) {
            this.stats.failedFiles++;
            (0, utils_1.logError)(`Failed to upload ${localPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Re-throw if it's a critical error
            if (error instanceof types_1.FileNotFoundError) {
                throw error;
            }
            return null;
        }
    }
    /**
     * Perform the actual upload with OSS
     */
    async performUpload(localPath, remotePath, options) {
        const uploadOptions = {
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
        const response = await this.oss.put(remotePath, (0, path_1.resolve)(localPath), uploadOptions);
        const duration = Date.now() - startTime;
        // Handle OSS response structure safely
        const ossResponse = response;
        return {
            url: ossResponse.url,
            name: ossResponse.name,
            size: (await (0, utils_1.getFileStats)(localPath)).size,
            etag: ossResponse.res?.headers?.etag || ossResponse.etag,
            versionId: ossResponse.res?.headers?.['x-oss-version-id'] || ossResponse.versionId,
            duration
        };
    }
    /**
     * Upload with retry logic and exponential backoff
     */
    async uploadWithRetry(uploadFn, _filePath, fileStats) {
        const fileSizeFormatted = (0, utils_1.formatFileSize)(fileStats.size);
        for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
            try {
                const retryLabel = attempt > 0 ? ` - Retry ${attempt}` : '';
                (0, utils_1.logOperation)(`⬆️  Uploading ${fileStats.name} (${fileSizeFormatted})${retryLabel}`);
                const startTime = Date.now();
                const result = await uploadFn();
                const duration = Date.now() - startTime;
                (0, utils_1.logSuccess)(`Uploaded ${fileStats.name} in ${(0, utils_1.formatDuration)(duration)}`);
                return result;
            }
            catch (error) {
                const isLastAttempt = attempt === this.retryConfig.maxRetries - 1;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                (0, utils_1.logWarning)(`Upload failed for ${fileStats.name}: ${errorMessage}`);
                // Check if it's a retryable error
                if (!this.isRetryableError(error) || isLastAttempt) {
                    if (isLastAttempt) {
                        (0, utils_1.logError)(`💥 All ${this.retryConfig.maxRetries} attempts failed for ${fileStats.name}`);
                    }
                    throw error;
                }
                // Calculate backoff delay
                const delayMs = (0, utils_1.calculateBackoffDelay)(attempt, this.retryConfig.baseDelay, this.retryConfig.maxDelay, this.retryConfig.backoffMultiplier);
                (0, utils_1.logOperation)(`⏳ Retrying in ${(0, utils_1.formatDuration)(delayMs)}... (attempt ${attempt + 2}/${this.retryConfig.maxRetries})`);
                await (0, utils_1.delay)(delayMs);
            }
        }
        return null;
    }
    /**
     * Check if an error is retryable
     */
    isRetryableError(error) {
        if (error instanceof types_1.FileNotFoundError) {
            return false; // File not found is not retryable
        }
        // Network-related errors are retryable
        if (error instanceof types_1.NetworkError) {
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
    getStats() {
        return { ...this.stats };
    }
    /**
     * Log final upload statistics
     */
    logFinalStats() {
        const duration = (0, utils_1.formatDuration)(this.stats.totalDuration);
        const totalSize = (0, utils_1.formatFileSize)(this.stats.totalSize);
        const uploadedSize = (0, utils_1.formatFileSize)(this.stats.uploadedSize);
        (0, utils_1.logSuccess)(`Upload completed! ${this.stats.uploadedFiles}/${this.stats.totalFiles} files ` +
            `(${uploadedSize}/${totalSize}) uploaded in ${duration}`);
        if (this.stats.failedFiles > 0) {
            (0, utils_1.logWarning)(`${this.stats.failedFiles} file(s) failed to upload`);
        }
    }
    /**
     * Test OSS connection
     */
    async testConnection() {
        try {
            await this.oss.getBucketInfo(this.config.bucket);
            (0, utils_1.logSuccess)('OSS connection test successful');
            return true;
        }
        catch (error) {
            (0, utils_1.logError)(`OSS connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
}
exports.OSSUploader = OSSUploader;
//# sourceMappingURL=uploader.js.map