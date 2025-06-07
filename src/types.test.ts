/**
 * Tests for TypeScript type definitions
 */

import { describe, it, expect } from 'vitest';
import type {
  ActionInputs,
  OSSConfig,
  RetryConfig,
  UploadOptions,
  UploadRule,
  UploadStats,
  UploadResult
} from './types';

describe('Type Definitions', () => {
  describe('ActionInputs', () => {
    it('should define all required input properties', () => {
      const inputs: ActionInputs = {
        region: 'oss-cn-hangzhou',
        accessKey: 'test-key',
        secretKey: 'test-secret',
        bucket: 'test-bucket',
        assets: 'src/**/*:dist/',
        timeout: '600',
        continueOnError: 'false',
        headers: '{}',
        maxRetries: '3',
        enableGzip: 'false',
        publicRead: 'false'
      };

      expect(inputs.region).toBe('oss-cn-hangzhou');
      expect(inputs.accessKey).toBe('test-key');
      expect(inputs.secretKey).toBe('test-secret');
      expect(inputs.bucket).toBe('test-bucket');
      expect(inputs.assets).toBe('src/**/*:dist/');
      expect(inputs.timeout).toBe('600');
      expect(inputs.continueOnError).toBe('false');
      expect(inputs.headers).toBe('{}');
      expect(inputs.maxRetries).toBe('3');
      expect(inputs.enableGzip).toBe('false');
      expect(inputs.publicRead).toBe('false');
    });
  });

  describe('OSSConfig', () => {
    it('should define OSS client configuration', () => {
      const config: OSSConfig = {
        accessKeyId: 'test-key',
        accessKeySecret: 'test-secret',
        bucket: 'test-bucket',
        region: 'oss-cn-hangzhou',
        timeout: 600000
      };

      expect(config.accessKeyId).toBe('test-key');
      expect(config.accessKeySecret).toBe('test-secret');
      expect(config.bucket).toBe('test-bucket');
      expect(config.region).toBe('oss-cn-hangzhou');
      expect(config.timeout).toBe(600000);
    });

    it('should allow optional endpoint', () => {
      const config: OSSConfig = {
        accessKeyId: 'test-key',
        accessKeySecret: 'test-secret',
        bucket: 'test-bucket',
        region: 'oss-cn-hangzhou',
        timeout: 600000,
        endpoint: 'https://custom-endpoint.com'
      };

      expect(config.endpoint).toBe('https://custom-endpoint.com');
    });
  });

  describe('RetryConfig', () => {
    it('should define retry configuration', () => {
      const retryConfig: RetryConfig = {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 3
      };

      expect(retryConfig.maxRetries).toBe(5);
      expect(retryConfig.baseDelay).toBe(2000);
      expect(retryConfig.maxDelay).toBe(30000);
      expect(retryConfig.backoffMultiplier).toBe(3);
    });
  });

  describe('UploadOptions', () => {
    it('should define upload options', () => {
      const uploadOptions: UploadOptions = {
        headers: {
          'Cache-Control': 'max-age=3600',
          'Content-Type': 'application/json'
        },
        continueOnError: true
      };

      expect(uploadOptions.headers).toEqual({
        'Cache-Control': 'max-age=3600',
        'Content-Type': 'application/json'
      });
      expect(uploadOptions.continueOnError).toBe(true);
    });

    it('should allow empty headers', () => {
      const uploadOptions: UploadOptions = {
        headers: {},
        continueOnError: false
      };

      expect(uploadOptions.headers).toEqual({});
      expect(uploadOptions.continueOnError).toBe(false);
    });
  });

  describe('UploadRule', () => {
    it('should define upload rule structure', () => {
      const rule: UploadRule = {
        source: 'src/**/*.js',
        destination: 'dist/js/',
        isDirectory: true
      };

      expect(rule.source).toBe('src/**/*.js');
      expect(rule.destination).toBe('dist/js/');
      expect(rule.isDirectory).toBe(true);
    });

    it('should work for file uploads', () => {
      const rule: UploadRule = {
        source: 'package.json',
        destination: 'config/package.json',
        isDirectory: false
      };

      expect(rule.source).toBe('package.json');
      expect(rule.destination).toBe('config/package.json');
      expect(rule.isDirectory).toBe(false);
    });
  });

  describe('UploadStats', () => {
    it('should define upload statistics', () => {
      const stats: UploadStats = {
        totalFiles: 10,
        uploadedFiles: 8,
        failedFiles: 2,
        totalSize: 1024 * 1024,
        uploadedSize: 800 * 1024,
        totalDuration: 5000,
        successRate: 80
      };

      expect(stats.totalFiles).toBe(10);
      expect(stats.uploadedFiles).toBe(8);
      expect(stats.failedFiles).toBe(2);
      expect(stats.totalSize).toBe(1024 * 1024);
      expect(stats.uploadedSize).toBe(800 * 1024);
      expect(stats.totalDuration).toBe(5000);
      expect(stats.successRate).toBe(80);
    });

    it('should calculate correct success rate', () => {
      const stats: UploadStats = {
        totalFiles: 4,
        uploadedFiles: 4,
        failedFiles: 0,
        totalSize: 2048,
        uploadedSize: 2048,
        totalDuration: 2000,
        successRate: 100
      };

      expect(stats.successRate).toBe(100);
      expect(stats.uploadedFiles + stats.failedFiles).toBe(stats.totalFiles);
    });
  });

  describe('UploadResult', () => {
    it('should define successful upload result', () => {
      const result: UploadResult = {
        success: true,
        filePath: '/path/to/file.js',
        remotePath: 'dist/file.js',
        size: 1024,
        duration: 500
      };

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/file.js');
      expect(result.remotePath).toBe('dist/file.js');
      expect(result.size).toBe(1024);
      expect(result.duration).toBe(500);
      expect(result.error).toBeUndefined();
    });

    it('should define failed upload result', () => {
      const result: UploadResult = {
        success: false,
        filePath: '/path/to/file.js',
        remotePath: 'dist/file.js',
        error: 'Network timeout'
      };

      expect(result.success).toBe(false);
      expect(result.filePath).toBe('/path/to/file.js');
      expect(result.remotePath).toBe('dist/file.js');
      expect(result.error).toBe('Network timeout');
      expect(result.size).toBeUndefined();
      expect(result.duration).toBeUndefined();
    });
  });

  describe('Type compatibility', () => {
    it('should work with partial configurations', () => {
      // Test that optional properties work correctly
      const partialConfig: Partial<OSSConfig> = {
        accessKeyId: 'test-key',
        bucket: 'test-bucket'
      };

      expect(partialConfig.accessKeyId).toBe('test-key');
      expect(partialConfig.bucket).toBe('test-bucket');
      expect(partialConfig.region).toBeUndefined();
    });

    it('should enforce required properties', () => {
      // This test ensures TypeScript compilation will catch missing required properties
      const createConfig = (config: OSSConfig): OSSConfig => config;

      const validConfig: OSSConfig = {
        accessKeyId: 'key',
        accessKeySecret: 'secret',
        bucket: 'bucket',
        region: 'region',
        timeout: 60000
      };

      expect(() => createConfig(validConfig)).not.toThrow();
    });
  });
});
