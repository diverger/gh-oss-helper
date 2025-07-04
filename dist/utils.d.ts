/**
 * Utility functions for OSS Action
 */
import { UploadRule, ActionInputs } from './types';
/**
 * Validates required GitHub Action inputs
 */
export declare function validateInputs(inputs: ActionInputs): void;
/**
 * Parses upload rules from assets string
 */
export declare function parseUploadRules(assets: string): UploadRule[];
/**
 * Formats file size in human-readable format
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Formats duration in human-readable format
 */
export declare function formatDuration(milliseconds: number): string;
/**
 * Calculates exponential backoff delay
 */
export declare function calculateBackoffDelay(attempt: number, baseDelay?: number, maxDelay?: number, multiplier?: number): number;
/**
 * Validates if file exists and is readable
 */
export declare function validateFile(filePath: string): Promise<void>;
/**
 * Gets file stats safely
 */
export declare function getFileStats(filePath: string): Promise<{
    size: number;
    name: string;
}>;
/**
 * Parses custom headers from string
 */
export declare function parseHeaders(headersString?: string): Record<string, string>;
/**
 * Sanitizes remote path to ensure it's valid
 */
export declare function sanitizeRemotePath(path: string): string;
/**
 * Creates a delay promise for retry backoff
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Extracts relative path from a file path based on glob pattern
 */
export declare function extractRelativePath(filePath: string, basePath: string): string;
/**
 * Logs operation with consistent formatting
 */
export declare function logOperation(operation: string, details?: string): void;
/**
 * Logs success with consistent formatting
 */
export declare function logSuccess(message: string): void;
/**
 * Logs warning with consistent formatting
 */
export declare function logWarning(message: string): void;
/**
 * Logs error with consistent formatting
 */
export declare function logError(message: string): void;
/**
 * Logs debug information (visible when debug mode is enabled)
 *
 * Note: We use core.info() instead of core.debug() because:
 * - core.debug() often doesn't appear even in raw logs due to GitHub Actions limitations
 * - Runner-level filtering and action context issues can suppress debug output
 * - Using core.info() with conditional checking provides better visibility and control
 */
export declare function logDebug(message: string, details?: any): void;
/**
 * Checks if debug mode is enabled
 */
export declare function isDebugEnabled(): boolean;
