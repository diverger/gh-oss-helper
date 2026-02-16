/**
 * Tests for OSS Uploader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OSSUploader } from './uploader';
import { OSSConfig, RetryConfig } from './types';

// Mock ali-oss
vi.mock('ali-oss', () => {
  return {
    default: class MockOSS {
      put = vi.fn();
      getBucketInfo = vi.fn();
    }
  };
});

// Mock fast-glob
vi.mock('fast-glob', () => ({
  sync: vi.fn()
}));

// Mock utils functions
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
  logError: vi.fn(),
  logDebug: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn()
  }
}));

// Mock path
vi.mock('path', () => ({
  resolve: vi.fn((path) => path)
}));

// Import the mocked modules
import * as fastGlob from 'fast-glob';
import * as utils from './utils';

describe('OSSUploader', () => {
  let uploader: OSSUploader;
  let mockConfig: OSSConfig;
  let mockRetryConfig: RetryConfig;

  // Get mocked functions
  const mockSync = vi.mocked(fastGlob.sync);
  const mockGetFileStats = vi.mocked(utils.getFileStats);

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      accessKeyId: 'test-key',
      accessKeySecret: 'test-secret',
      bucket: 'test-bucket',
      region: 'oss-cn-hangzhou',
      timeout: 600000
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

  describe('uploadFiles', () => {
    it('should handle empty rules array', async () => {
      const results = await uploader.uploadFiles([]);

      expect(results).toEqual([]);
      const stats = uploader.getStats();
      expect(stats.totalFiles).toBe(0);
      expect(stats.uploadedFiles).toBe(0);
    });

    it('should process upload rules and return results', async () => {
      // Mock file system operations
      mockSync.mockReturnValue(['/test/file1.js', '/test/file2.js']);
      mockGetFileStats.mockResolvedValue({ size: 1024, name: 'file1.js' });

      // Mock OSS upload success
      const mockOss = uploader['oss'] as any;
      mockOss.put.mockResolvedValue({
        res: { headers: { etag: 'test-etag' } },
        url: 'https://bucket.oss.com/file1.js'
      });

      const rules = [{
        source: '/test/*.js',
        destination: 'dist/',
        isDirectory: true
      }];

      const results = await uploader.uploadFiles(rules);

      expect(results).toHaveLength(2);
      expect(mockSync).toHaveBeenCalledWith(['/test/*.js'], {
        dot: false,
        onlyFiles: true,
        absolute: true
      });
    });

    it('should handle upload failures with retry logic', async () => {
      mockSync.mockReturnValue(['/test/failing-file.js']);
      mockGetFileStats.mockResolvedValue({ size: 1024, name: 'failing-file.js' });

      // Mock OSS upload failure
      const mockOss = uploader['oss'] as any;
      mockOss.put.mockRejectedValue(new Error('Network timeout'));

      const rules = [{
        source: '/test/failing-file.js',
        destination: 'dist/failing-file.js',
        isDirectory: false
      }];

      const results = await uploader.uploadFiles(rules);

      // Should still return results (even if failed)
      expect(results).toBeDefined();
      const stats = uploader.getStats();
      expect(stats.failedFiles).toBe(1);
    });
  });

  describe('upload retry logic', () => {
    it('should retry on retryable errors', async () => {
      mockSync.mockReturnValue(['/test/retry-file.js']);
      mockGetFileStats.mockResolvedValue({ size: 1024, name: 'retry-file.js' });

      const mockOss = uploader['oss'] as any;

      // First call fails, second succeeds
      mockOss.put
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({
          res: { headers: { etag: 'test-etag' } },
          url: 'https://bucket.oss.com/retry-file.js'
        });

      const rules = [{
        source: '/test/retry-file.js',
        destination: 'dist/retry-file.js',
        isDirectory: false
      }];

      const results = await uploader.uploadFiles(rules);

      expect(mockOss.put).toHaveBeenCalledTimes(2); // First attempt + 1 retry
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should stop retrying after max attempts', async () => {
      mockSync.mockReturnValue(['/test/permanent-fail.js']);
      mockGetFileStats.mockResolvedValue({ size: 1024, name: 'permanent-fail.js' });

      const mockOss = uploader['oss'] as any;
      mockOss.put.mockRejectedValue(new Error('Permanent failure'));

      const rules = [{
        source: '/test/permanent-fail.js',
        destination: 'dist/permanent-fail.js',
        isDirectory: false
      }];

      await uploader.uploadFiles(rules);

      // Should attempt maxRetries times (3 by default)
      expect(mockOss.put).toHaveBeenCalledTimes(3);
      const stats = uploader.getStats();
      expect(stats.failedFiles).toBe(1);
    });

    it('should apply upload options correctly', async () => {
      mockSync.mockReturnValue(['/test/file-with-options.js']);
      mockGetFileStats.mockResolvedValue({ size: 1024, name: 'file-with-options.js' });

      const mockOss = uploader['oss'] as any;
      mockOss.put.mockResolvedValue({
        res: { headers: { etag: 'test-etag' } },
        url: 'https://bucket.oss.com/file-with-options.js'
      });

      const rules = [{
        source: '/test/file-with-options.js',
        destination: 'dist/file-with-options.js',
        isDirectory: false
      }];

      const options = {
        headers: { 'Cache-Control': 'max-age=3600' },
        gzip: true,
        continueOnError: true
      };

      await uploader.uploadFiles(rules, options);

      expect(mockOss.put).toHaveBeenCalledWith(
        'dist/file-with-options.js',
        '/test/file-with-options.js',
        expect.objectContaining({
          timeout: 600000,
          headers: expect.objectContaining({
            'Cache-Control': 'max-age=3600',
            'Content-Encoding': 'gzip'
          })
        })
      );
    });
  });

  describe('statistics tracking', () => {
    it('should track upload statistics correctly', async () => {
      mockSync.mockReturnValue(['/test/stats1.js', '/test/stats2.js']);

      // Mock getFileStats - called twice per file (once in uploadSingleFile, once in performUpload)
      mockGetFileStats.mockClear();
      mockGetFileStats
        .mockResolvedValueOnce({ size: 1024, name: 'stats1.js' }) // uploadSingleFile call for file 1
        .mockResolvedValueOnce({ size: 1024, name: 'stats1.js' }) // performUpload call for file 1
        .mockResolvedValueOnce({ size: 2048, name: 'stats2.js' }) // uploadSingleFile call for file 2
        .mockResolvedValueOnce({ size: 2048, name: 'stats2.js' }); // performUpload call for file 2

      const mockOss = uploader['oss'] as any;
      mockOss.put
        .mockResolvedValueOnce({
          res: { headers: { etag: 'etag1' } },
          url: 'https://bucket.oss.com/stats1.js'
        })
        .mockResolvedValueOnce({
          res: { headers: { etag: 'etag2' } },
          url: 'https://bucket.oss.com/stats2.js'
        });

      const rules = [{
        source: '/test/stats*.js',
        destination: 'dist/',
        isDirectory: true
      }];

      await uploader.uploadFiles(rules);

      const stats = uploader.getStats();
      expect(stats.totalFiles).toBe(2);
      expect(stats.uploadedFiles).toBe(2);
      expect(stats.failedFiles).toBe(0);
      expect(stats.totalSize).toBe(3072); // 1024 + 2048
      expect(stats.uploadedSize).toBe(3072);
      expect(stats.successRate).toBe(100);
    });
  });
});
