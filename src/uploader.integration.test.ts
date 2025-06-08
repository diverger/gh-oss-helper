/**
 * Integration tests for OSS Uploader
 * These tests use more realistic scenarios with actual file system operations
 * but still mock the OSS SDK to avoid requiring real credentials
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { resolve, join } from 'path';
import { OSSUploader } from './uploader';
import { OSSConfig, RetryConfig } from './types';

// Mock ali-oss but allow more realistic behavior
vi.mock('ali-oss', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      put: vi.fn(),
      getBucketInfo: vi.fn()
    }))
  };
});

// Partially mock utils to allow real file operations but control logging
vi.mock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    logOperation: vi.fn(),
    logSuccess: vi.fn(),
    logWarning: vi.fn(),
    logError: vi.fn()
  };
});

describe('OSSUploader Integration Tests', () => {
  let uploader: OSSUploader;
  let mockConfig: OSSConfig;
  let tempDir: string;

  beforeEach(async () => {
    mockConfig = {
      accessKeyId: 'test-integration-key',
      accessKeySecret: 'test-integration-secret',
      bucket: 'test-integration-bucket',
      region: 'oss-cn-hangzhou',
      timeout: 600000
    };

    uploader = new OSSUploader(mockConfig);

    // Create temporary directory for test files
    tempDir = resolve(__dirname, '../temp-test-files');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up temporary test files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist or have permissions issues
    }
  });

  describe('realistic file upload scenarios', () => {
    it('should handle uploading actual test files', async () => {
      // Create test files
      const testFile1 = join(tempDir, 'test1.txt');
      const testFile2 = join(tempDir, 'test2.js');

      await fs.writeFile(testFile1, 'This is test content for file 1');
      await fs.writeFile(testFile2, 'console.log("Hello from test file 2");');

      // Mock successful OSS uploads
      const mockOss = uploader['oss'] as any;
      mockOss.put.mockImplementation((remotePath: string, localPath: string) => {
        return Promise.resolve({
          res: { headers: { etag: `etag-${remotePath}` } },
          url: `https://test-bucket.oss.com/${remotePath}`
        });
      });

      const rules = [{
        source: join(tempDir, '*.txt'),
        destination: 'uploads/text/',
        isDirectory: true
      }, {
        source: join(tempDir, '*.js'),
        destination: 'uploads/scripts/',
        isDirectory: true
      }];

      const results = await uploader.uploadFiles(rules);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);

      const stats = uploader.getStats();
      expect(stats.totalFiles).toBe(2);
      expect(stats.uploadedFiles).toBe(2);
      expect(stats.failedFiles).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Create test files
      const successFile = join(tempDir, 'success.txt');
      const failFile = join(tempDir, 'fail.txt');

      await fs.writeFile(successFile, 'This upload will succeed');
      await fs.writeFile(failFile, 'This upload will fail');

      // Mock OSS with mixed responses
      const mockOss = uploader['oss'] as any;
      mockOss.put.mockImplementation((remotePath: string) => {
        if (remotePath.includes('fail')) {
          return Promise.reject(new Error('Simulated upload failure'));
        }
        return Promise.resolve({
          res: { headers: { etag: `etag-${remotePath}` } },
          url: `https://test-bucket.oss.com/${remotePath}`
        });
      });

      const rules = [{
        source: join(tempDir, '*.txt'),
        destination: 'mixed/',
        isDirectory: true
      }];

      const results = await uploader.uploadFiles(rules, { continueOnError: true });

      expect(results).toHaveLength(1); // Only successful uploads are returned
      expect(results[0].success).toBe(true);
      expect(results[0].filePath).toContain('success.txt');

      const stats = uploader.getStats();
      expect(stats.totalFiles).toBe(2);
      expect(stats.uploadedFiles).toBe(1);
      expect(stats.failedFiles).toBe(1);
      expect(stats.successRate).toBe(50);
    });

    it('should handle large file uploads with proper timeout', async () => {
      // Create a larger test file
      const largeFile = join(tempDir, 'large-file.bin');
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB of content

      await fs.writeFile(largeFile, largeContent);

      // Mock OSS upload with delay to simulate large file
      const mockOss = uploader['oss'] as any;
      mockOss.put.mockImplementation((remotePath: string) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              res: { headers: { etag: `etag-${remotePath}` } },
              url: `https://test-bucket.oss.com/${remotePath}`
            });
          }, 100); // Small delay to simulate upload time
        });
      });

      const rules = [{
        source: largeFile,
        destination: 'large-files/large-file.bin',
        isDirectory: false
      }];

      const startTime = Date.now();
      const results = await uploader.uploadFiles(rules);
      const uploadDuration = Date.now() - startTime;

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(uploadDuration).toBeGreaterThan(90); // Should take at least the mock delay

      const stats = uploader.getStats();
      expect(stats.totalSize).toBeGreaterThanOrEqual(1024 * 1024); // Should track the large file size
    });

    it('should handle directory structure uploads correctly', async () => {
      // Create nested directory structure
      const subDir = join(tempDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });

      const file1 = join(tempDir, 'root.txt');
      const file2 = join(subDir, 'nested.txt');

      await fs.writeFile(file1, 'Root level file');
      await fs.writeFile(file2, 'Nested file');

      // Mock OSS uploads
      const mockOss = uploader['oss'] as any;
      const uploadedPaths: string[] = [];
      mockOss.put.mockImplementation((remotePath: string, localPath: string) => {
        uploadedPaths.push(remotePath);
        return Promise.resolve({
          res: { headers: { etag: `etag-${remotePath}` } },
          url: `https://test-bucket.oss.com/${remotePath}`
        });
      });

      const rules = [{
        source: join(tempDir, '**/*.txt'),
        destination: 'structured/',
        isDirectory: true
      }];

      const results = await uploader.uploadFiles(rules);

      expect(results).toHaveLength(2);
      expect(uploadedPaths).toContain('structured/root.txt');
      expect(uploadedPaths).toContain('structured/subdir/nested.txt');
    });
  });

  describe('error resilience', () => {
    it('should handle file system errors gracefully', async () => {
      // Try to upload a non-existent file
      const rules = [{
        source: join(tempDir, 'non-existent-file.txt'),
        destination: 'uploads/non-existent.txt',
        isDirectory: false
      }];

      const results = await uploader.uploadFiles(rules, { continueOnError: true });

      expect(results).toHaveLength(0); // No successful uploads
      const stats = uploader.getStats();
      expect(stats.totalFiles).toBe(0); // No files found to upload
    });

    it('should handle permission errors during file reading', async () => {
      // This test is platform dependent, so we'll mock the behavior
      const testFile = join(tempDir, 'permission-test.txt');
      await fs.writeFile(testFile, 'Test content');

      // Mock OSS to throw permission error
      const mockOss = uploader['oss'] as any;
      mockOss.put.mockRejectedValue(new Error('EACCES: permission denied'));

      const rules = [{
        source: testFile,
        destination: 'uploads/permission-test.txt',
        isDirectory: false
      }];

      const results = await uploader.uploadFiles(rules, { continueOnError: true });

      expect(results).toHaveLength(0);
      const stats = uploader.getStats();
      expect(stats.failedFiles).toBe(1);
    });
  });

  describe('connection and configuration', () => {
    it('should test OSS connection with realistic mock', async () => {
      const mockOss = uploader['oss'] as any;
      mockOss.getBucketInfo.mockResolvedValue({
        bucket: 'test-integration-bucket',
        region: 'oss-cn-hangzhou',
        creationDate: new Date().toISOString()
      });

      const connectionResult = await uploader.testConnection();

      expect(connectionResult).toBe(true);
      expect(mockOss.getBucketInfo).toHaveBeenCalledWith('test-integration-bucket');
    });

    it('should handle connection failures appropriately', async () => {
      const mockOss = uploader['oss'] as any;
      mockOss.getBucketInfo.mockRejectedValue(new Error('Network unreachable'));

      const connectionResult = await uploader.testConnection();

      expect(connectionResult).toBe(false);
    });
  });
});
