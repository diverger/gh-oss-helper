/**
 * Utility functions for OSS Action
 */

import { promises as fs } from 'fs';
import { basename } from 'path';
import * as core from '@actions/core';
import { ValidationError, FileNotFoundError, UploadRule, ActionInputs } from './types';

/**
 * Validates required GitHub Action inputs
 */
export function validateInputs(inputs: ActionInputs): void {
  const requiredFields = ['accessKey', 'secretKey', 'bucket', 'assets'];

  for (const field of requiredFields) {
    if (!inputs[field as keyof ActionInputs]) {
      throw new ValidationError(`Required input '${field}' is missing`);
    }
  }

  // Validate timeout
  if (inputs.timeout) {
    const timeout = parseInt(inputs.timeout, 10);
    if (isNaN(timeout) || timeout <= 0) {
      throw new ValidationError('Timeout must be a positive number');
    }
  }

  // Validate maxRetries
  if (inputs.maxRetries) {
    const retries = parseInt(inputs.maxRetries, 10);
    if (isNaN(retries) || retries < 0) {
      throw new ValidationError('Max retries must be a non-negative number');
    }
  }
}

/**
 * Parses upload rules from assets string
 */
export function parseUploadRules(assets: string): UploadRule[] {
  const rules: UploadRule[] = [];

  for (const line of assets.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.lastIndexOf(':');
    if (separatorIndex === -1) {
      core.warning(`⚠️  Skipping invalid rule: ${trimmed}`);
      continue;
    }

    // Windows absolute paths might contain ':' (e.g. C:\path), so we need to be careful.
    // However, the rule format is source:destination.
    // If we split by the last colon, we assume destination doesn't contain a colon.
    // This is generally true for OSS keys.
    // But what if source is C:\file and destination is omitted? The loop check handles empty destination.

    // Check if the colon is part of a Windows drive letter (e.g. C:\...) and there is NO destination
    // This heuristic checks if the colon is at index 1 and followed by \ or /
    // But here we are looking for the separator between source and destination.

    const source = trimmed.substring(0, separatorIndex).trim();
    const destination = trimmed.substring(separatorIndex + 1).trim();

    if (!source || !destination) {
      core.warning(`⚠️  Skipping invalid rule: ${trimmed}`);
      continue;
    }

    rules.push({
      source: source.trim(),
      destination: destination.trim(),
      isDirectory: destination.trim().endsWith('/')
    });
  }

  return rules;
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Formats duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = milliseconds / 1000;

  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Calculates exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
  multiplier: number = 2
): number {
  const delay = baseDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Validates if file exists and is readable
 */
export async function validateFile(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new FileNotFoundError(`Path is not a file: ${filePath}`);
    }
  } catch (error: unknown) {
    const nodeError = error as { code?: string };
    if (nodeError.code === 'ENOENT') {
      throw new FileNotFoundError(filePath);
    }
    throw error;
  }
}

/**
 * Gets file stats safely
 */
export async function getFileStats(filePath: string): Promise<{ size: number; name: string }> {
  await validateFile(filePath);
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    name: basename(filePath)
  };
}

/**
 * Parses custom headers from string
 */
export function parseHeaders(headersString?: string): Record<string, string> {
  if (!headersString) return {};

  try {
    return JSON.parse(headersString);
  } catch {
    core.warning(`⚠️  Failed to parse headers JSON: ${headersString}`);
    return {};
  }
}

/**
 * Sanitizes remote path to ensure it's valid
 */
export function sanitizeRemotePath(path: string): string {
  // Remove leading slashes and normalize
  return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}

/**
 * Creates a delay promise for retry backoff
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts relative path from a file path based on glob pattern
 */
export function extractRelativePath(filePath: string, basePath: string): string {
  // Normalize paths to forward slashes for consistent comparison
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedBasePath = basePath.replace(/\\/g, '/');

  // Remove glob patterns and normalize the base path
  // Also handle cases where glob pattern is not at the end of the path
  const baseParts = normalizedBasePath.split(/[*?[]/);
  let base = baseParts[0];

  // Ensure base ends with a separator if it's a directory
  if (base.length > 0 && !base.endsWith('/')) {
    // If original base path had a separator before the glob, keep it, otherwise potentially misleading
    // But safely removing trailing slash is safer for comparison
    base = base.replace(/\/$/, '');
  }

  // If the file path starts with the base, extract the relative part
  if (normalizedFilePath.startsWith(base)) {
    let relativePath = normalizedFilePath.substring(base.length);
    // Remove leading slash if present
    relativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

    // If the relative path became empty (e.g. file equals base), return just the filename
    if (!relativePath) {
      return normalizedFilePath.split('/').pop() || normalizedFilePath;
    }

    return relativePath;
  }

  // Fallback: just return the filename
  return normalizedFilePath.split('/').pop() || normalizedFilePath;
}

/**
 * Logs operation with consistent formatting
 */
export function logOperation(operation: string, details?: string): void {
  const message = details ? `${operation}: ${details}` : operation;
  core.info(`🔧 ${message}`);
}

/**
 * Logs success with consistent formatting
 */
export function logSuccess(message: string): void {
  core.info(`✅ ${message}`);
}

/**
 * Logs warning with consistent formatting
 */
export function logWarning(message: string): void {
  core.warning(`⚠️  ${message}`);
}

/**
 * Logs error with consistent formatting
 */
export function logError(message: string): void {
  core.error(`❌ ${message}`);
}

/**
 * Logs debug information (visible when debug mode is enabled)
 *
 * Note: We use core.info() instead of core.debug() because:
 * - core.debug() often doesn't appear even in raw logs due to GitHub Actions limitations
 * - Runner-level filtering and action context issues can suppress debug output
 * - Using core.info() with conditional checking provides better visibility and control
 */
export function logDebug(message: string, details?: unknown): void {
  if (!isDebugEnabled()) {
    return;

  }

  if (details && typeof details === 'object') {
    // Use core.info() instead of core.debug() for better visibility
    core.info(`🐛 DEBUG: ${message}: ${JSON.stringify(details, null, 2)}`);
  } else if (details !== undefined) {
    core.info(`🐛 DEBUG: ${message}: ${details}`);
  } else {
    core.info(`🐛 DEBUG: ${message}`);
  }
}

/**
 * Checks if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  // Check environment variable first (GitHub Actions standard)
  if (process.env.ACTIONS_STEP_DEBUG === 'true') {
    return true;
  }

  // Check action input (our custom option)
  try {
    return core.getInput('enable-debug') === 'true';
  } catch {
    // If core.getInput fails (e.g., in tests), default to false
    return false;
  }
}
