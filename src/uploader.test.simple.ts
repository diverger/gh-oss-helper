/**
 * Simplified unit tests for OSS Uploader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OSSUploader } from './uploader';
import { OSSConfig, RetryConfig } from './types';

// Mock ali-oss
const mockOSSInstance = {
  put: vi.fn(),
  getBucketInfo: vi.fn()
};

vi.mock('ali-oss', () => ({
  default: vi.fn().mockImplementation(() => mockOSSInstance)
}));

describe('OSSUploader - Basic Tests', () => {
  let uploader: OSSUploader;
  let config: OSSConfig;
  let retryConfig: RetryConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      region: 'test-region',
      accessKeyId: 'test-key',
      accessKeySecret: 'test-secret',
      bucket: 'test-bucket',
      timeout: 600000
    };

    retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    uploader = new OSSUploader(config, retryConfig);
  });

  it('should create uploader instance with correct config', () => {
    expect(uploader).toBeInstanceOf(OSSUploader);
  });

  it('should have default stats', () => {
    const stats = uploader.getStats();
    expect(stats.totalFiles).toBe(0);
    expect(stats.uploadedFiles).toBe(0);
    expect(stats.failedFiles).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.totalDuration).toBe(0);
  });

  it('should return a copy of stats to prevent mutation', () => {
    const stats1 = uploader.getStats();
    const stats2 = uploader.getStats();
    
    expect(stats1).not.toBe(stats2); // Different object references
    expect(stats1).toEqual(stats2); // Same values
    expect(stats1.totalFiles).toBe(0);
    expect(stats1.uploadedFiles).toBe(0);
    expect(stats1.failedFiles).toBe(0);
  });
});
