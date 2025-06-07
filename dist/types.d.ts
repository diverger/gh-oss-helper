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
    success: boolean;
    filePath: string;
    objectKey: string;
    size: number;
    etag?: string;
    url?: string;
    error?: string;
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
export declare class OSSActionError extends Error {
    readonly code?: string;
    readonly statusCode?: number;
    readonly filePath?: string;
    constructor(message: string, code?: string, statusCode?: number, filePath?: string);
}
export declare class ValidationError extends OSSActionError {
    constructor(message: string);
}
export declare class NetworkError extends OSSActionError {
    constructor(message: string, statusCode?: number);
}
export declare class FileNotFoundError extends OSSActionError {
    constructor(filePath: string);
}
export interface OSSResponse {
    name: string;
    url: string;
    res: {
        status: number;
        headers: Record<string, string>;
        size: number;
        aborted: boolean;
        rt: number;
        keepAliveSocket: boolean;
    };
}
