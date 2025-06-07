/**
 * Tests for OSS Uploader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OSSUploader } from './uploader';
import { OSSConfig, RetryConfig } from './types';

// Mock ali-oss
vi.mock('ali-oss', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      put: vi.fn(),
      getBucketInfo: vi.fn()
    }))
  };
});

// Mock fast-glob
vi.mock('fast-glob', () => ({
  sync: vi.fn()
}));

// Mock utils
vi.mock('./utils', () => ({
  getFileStats: vi.fn(),
  formatFileSize: vi.fn((size) => `${size} bytes`),
  formatDuration: vi.fn((duration) => `${duration}ms`),
  calculateBackoffDelay: vi.fn(() => 1000),
  sanitizeRemotePath: vi.fn((path) => path),
  extractRelativePath: vi.fn(() => '/file.txt'),
  delay: vi.fn(),
  logOperation: vi.fn(),
  logSuccess: vi.fn(),
  logWarning: vi.fn(),
  logError: vi.fn()
}));

describe('OSSUploader', () => {
  let uploader: OSSUploader;
  let mockConfig: OSSConfig;
  let mockRetryConfig: RetryConfig;

  beforeEach(() => {
    mockConfig = {
      accessKeyId: 'test-key',
      accessKeySecret: 'test-secret',
      bucket: 'test-bucket',
      region: 'oss-cn-hangzhou',
      timeout: 120000
    };

    mockRetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    uploader = new OSSUploader(mockConfig, mockRetryConfig);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(uploader).toBeInstanceOf(OSSUploader);

      const stats = uploader.getStats();
      expect(stats.totalFiles).toBe(0);
      expect(stats.uploadedFiles).toBe(0);
      expect(stats.failedFiles).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should use default retry config when not provided', () => {
      const uploaderWithDefaults = new OSSUploader(mockConfig);
      expect(uploaderWithDefaults).toBeInstanceOf(OSSUploader);
    });
  });

  describe('getStats', () => {
    it('should return current upload statistics', () => {
      const stats = uploader.getStats();

      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('uploadedFiles');
      expect(stats).toHaveProperty('failedFiles');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('uploadedSize');
      expect(stats).toHaveProperty('totalDuration');
      expect(stats).toHaveProperty('successRate');
    });

    it('should return a copy of stats to prevent mutation', () => {
      const stats1 = uploader.getStats();
      const stats2 = uploader.getStats();

      expect(stats1).not.toBe(stats2); // Different object references
      expect(stats1).toEqual(stats2); // Same values
    });
  });

  describe('testConnection', () => {
    it('should return true when connection test succeeds', async () => {
      const mockOss = uploader['oss'] as any;
      mockOss.getBucketInfo.mockResolvedValue({ name: 'test-bucket' });

      const result = await uploader.testConnection();

      expect(result).toBe(true);
      expect(mockOss.getBucketInfo).toHaveBeenCalledWith('test-bucket');
    });

    it('should return false when connection test fails', async () => {
      const mockOss = uploader['oss'] as any;
      mockOss.getBucketInfo.mockRejectedValue(new Error('Connection failed'));

      const result = await uploader.testConnection();

      expect(result).toBe(false);
    });
  });
});
