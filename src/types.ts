export interface OSSConfig {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  timeout: number;
  secure?: boolean;
  cname?: boolean;
}

export interface UploadRule {
  source: string;
  destination: string;
  isDirectory: boolean;
}

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  etag?: string;
  versionId?: string;
  duration: number;
}

export interface UploadStats {
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  totalSize: number;
  uploadedSize: number;
  totalDuration: number;
  successRate: number;
}

export interface ActionInputs {
  accessKey: string;
  secretKey: string;
  bucket: string;
  assets: string;
  region?: string | undefined;
  endpoint?: string | undefined;
  timeout?: string | undefined;
  maxRetries?: string | undefined;
  continueOnError?: string | undefined;
  enableGzip?: string | undefined;
  publicRead?: string | undefined;
  headers?: string | undefined;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface UploadOptions {
  timeout?: number;
  headers?: Record<string, string>;
  gzip?: boolean;
  'x-oss-storage-class'?: 'Standard' | 'IA' | 'Archive' | 'ColdArchive';
  'x-oss-object-acl'?: 'private' | 'public-read' | 'public-read-write';
  meta?: Record<string, string>;
}

export class OSSActionError extends Error {
   
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly filePath?: string
  ) {
    super(message);
    this.name = 'OSSActionError';
  }
}

export class ValidationError extends OSSActionError {
  constructor(message: string, field?: string) {
    super(`Validation Error: ${message}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    // Field parameter is available for future error context
    if (field) {
      // Field can be used for detailed error reporting
    }
  }
}

export class NetworkError extends OSSActionError {
  constructor(message: string, statusCode?: number) {
    super(`Network Error: ${message}`, 'NETWORK_ERROR', statusCode);
    this.name = 'NetworkError';
  }
}

export class FileNotFoundError extends OSSActionError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', undefined, filePath);
    this.name = 'FileNotFoundError';
  }
}
