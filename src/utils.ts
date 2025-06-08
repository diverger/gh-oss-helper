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

    const [source, destination] = trimmed.split(':');
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
  // Remove glob patterns and normalize the base path
  const base = basePath.replace(/\*+.*$/g, '').replace(/\/$/, '');

  // If the file path starts with the base, extract the relative part
  if (filePath.startsWith(base)) {
    const relativePath = filePath.substring(base.length);
    // Remove leading slash if present
    return relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  }

  // Fallback: just return the filename
  return filePath.split('/').pop() || filePath;
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
