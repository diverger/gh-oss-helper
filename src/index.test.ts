/**
 * Tests for main action entry point
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as core from '@actions/core';
import * as github from '@actions/github';

// Mock external dependencies
vi.mock('@actions/core');
vi.mock('@actions/github');
vi.mock('./uploader', () => ({
  OSSUploader: vi.fn()
}));
vi.mock('./utils');

// Import the module under test after mocking
import { run } from './index';
import { OSSUploader } from './uploader';
import { validateInputs, parseUploadRules, parseHeaders } from './utils';

describe('Main Action', () => {
  const mockCore = vi.mocked(core);
  const mockGithub = vi.mocked(github);
  const mockOSSUploader = vi.mocked(OSSUploader);
  const mockValidateInputs = vi.mocked(validateInputs);
  const mockParseUploadRules = vi.mocked(parseUploadRules);
  const mockParseHeaders = vi.mocked(parseHeaders);

  // Mock uploader instance (simple mock since we won't test actual uploads)
  const mockUploaderInstance = {
    testConnection: vi.fn(),
    uploadFiles: vi.fn(),
    getStats: vi.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockCore.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'region': 'oss-cn-hangzhou',
        'access-key': 'test-key-id',
        'secret-key': 'test-key-secret',
        'bucket': 'test-bucket',
        'assets': 'src/**/*:dist/',
        'timeout': '120',
        'continue-on-error': 'false',
        'headers': '{}',
        'max-retries': '3',
        'base-delay': '1000',
        'max-delay': '10000',
        'backoff-multiplier': '2'
      };
      return inputs[name] || '';
    });

    mockCore.getBooleanInput.mockImplementation((name: string) => {
      return name === 'continue-on-error' ? false : false;
    });

    mockCore.info.mockImplementation(() => {});
    mockCore.warning.mockImplementation(() => {});
    mockCore.error.mockImplementation(() => {});
    mockCore.setFailed.mockImplementation(() => {});
    mockCore.setOutput.mockImplementation(() => {});

    mockGithub.context = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      ref: 'refs/heads/main',
      sha: 'abc123'
    } as any;

    mockValidateInputs.mockImplementation(() => {});
    mockParseUploadRules.mockReturnValue([
      { source: 'src/**/*', destination: 'dist/', isDirectory: true }
    ]);
    mockParseHeaders.mockReturnValue({});

    // Mock uploader as a constructor that returns the instance
    (mockOSSUploader as any).mockImplementation(function(this: any) {
      return mockUploaderInstance;
    });
  });

  afterEach(() => {
    delete process.env.INPUT_REGION;
    delete process.env.INPUT_ACCESS_KEY;
    delete process.env.INPUT_SECRET_KEY;
    delete process.env.INPUT_BUCKET;
    delete process.env.INPUT_ASSETS;
  });

  describe('run function', () => {
    it('should fail when no valid upload rules are found', async () => {
      mockParseUploadRules.mockReturnValue([]);

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('No valid upload rules found in assets input');
    });

    it('should handle input validation errors', async () => {
      mockValidateInputs.mockImplementation(() => {
        throw new Error('Invalid region');
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Invalid region');
    });

    it('should handle OSS configuration errors', async () => {
      (mockOSSUploader as any).mockImplementation(function(this: any) {
        throw new Error('Failed to create OSS client');
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Failed to create OSS client');
    });

    it('should handle custom headers correctly', async () => {
      const customHeaders = { 'Cache-Control': 'max-age=3600' };
      mockParseHeaders.mockReturnValue(customHeaders);
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'headers') return JSON.stringify(customHeaders);
        const inputs: Record<string, string> = {
          'region': 'oss-cn-hangzhou',
          'access-key': 'test-key-id',
          'secret-key': 'test-key-secret',
          'bucket': 'test-bucket',
          'assets': 'src/**/*:dist/',
        };
        return inputs[name] || '';
      });

      // Mock to prevent actual upload
      mockParseUploadRules.mockReturnValue([]);

      await run();

      expect(mockParseHeaders).toHaveBeenCalledWith(JSON.stringify(customHeaders));
    });
  });

  describe('input processing', () => {
    it('should validate and process inputs correctly', async () => {
      // Mock to prevent actual upload but test input processing
      mockParseUploadRules.mockReturnValue([]);

      await run();

      expect(mockValidateInputs).toHaveBeenCalled();
      expect(mockParseUploadRules).toHaveBeenCalledWith('src/**/*:dist/');
      expect(mockParseHeaders).toHaveBeenCalledWith('{}');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const unexpectedError = new Error('Unexpected system error');
      (mockOSSUploader as any).mockImplementation(function(this: any) {
        throw unexpectedError;
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Unexpected system error');
    });

    it('should handle uploader instantiation errors', async () => {
      (mockOSSUploader as any).mockImplementation(function(this: any) {
        throw new Error('Failed to initialize OSS client');
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Failed to initialize OSS client');
    });
  });
});
