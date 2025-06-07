/**
 * OSS Uploader class with retry logic and better error handling
 */
import { OSSConfig, UploadRule, UploadResult, UploadStats, RetryConfig, UploadOptions } from './types';
export declare class OSSUploader {
    private oss;
    private retryConfig;
    private stats;
    private config;
    constructor(config: OSSConfig, retryConfig?: RetryConfig);
    /**
     * Upload files based on rules with retry logic
     */
    uploadFiles(rules: UploadRule[], options?: UploadOptions): Promise<UploadResult[]>;
    /**
     * Process a single upload rule
     */
    private processRule;
    /**
     * Upload a single file with retry logic
     */
    private uploadSingleFile;
    /**
     * Perform the actual upload with OSS
     */
    private performUpload;
    /**
     * Upload with retry logic and exponential backoff
     */
    private uploadWithRetry;
    /**
     * Check if an error is retryable
     */
    private isRetryableError;
    /**
     * Get current upload statistics
     */
    getStats(): UploadStats;
    /**
     * Log final upload statistics
     */
    private logFinalStats;
    /**
     * Test OSS connection
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=uploader.d.ts.map