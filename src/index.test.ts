/**
 * Tests for main action entry point
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as core from '@actions/core';
import * as github from '@actions/github';

// Mock external dependencies
vi.mock('@actions/core');
vi.mock('@actions/github');
vi.mock('./uploader');
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

  // Mock uploader instance
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
        'key-id': 'test-key-id',
        'key-secret': 'test-key-secret',
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

    mockOSSUploader.mockImplementation(() => mockUploaderInstance as any);
    mockUploaderInstance.testConnection.mockResolvedValue(true);
    mockUploaderInstance.uploadFiles.mockResolvedValue([]);
    mockUploaderInstance.getStats.mockReturnValue({
      totalFiles: 5,
      uploadedFiles: 5,
      failedFiles: 0,
      totalSize: 1024 * 1024,
      uploadedSize: 1024 * 1024,
      totalDuration: 5000,
      successRate: 100
    });
  });

  afterEach(() => {
    delete process.env.INPUT_REGION;
    delete process.env.INPUT_KEY_ID;
    delete process.env.INPUT_KEY_SECRET;
    delete process.env.INPUT_BUCKET;
    delete process.env.INPUT_ASSETS;
  });

  describe('run function', () => {
    it('should execute successfully with valid inputs', async () => {
      await run();

      expect(mockCore.info).toHaveBeenCalledWith('🚀 Starting OSS upload process...');
      expect(mockValidateInputs).toHaveBeenCalled();
      expect(mockOSSUploader).toHaveBeenCalled();
      expect(mockUploaderInstance.testConnection).toHaveBeenCalled();
      expect(mockUploaderInstance.uploadFiles).toHaveBeenCalled();
      expect(mockCore.setOutput).toHaveBeenCalledWith('uploaded-files', '5');
      expect(mockCore.setOutput).toHaveBeenCalledWith('total-size', '1048576');
      expect(mockCore.setOutput).toHaveBeenCalledWith('success-rate', '100');
    });

    it('should handle connection test failure gracefully', async () => {
      mockUploaderInstance.testConnection.mockResolvedValue(false);

      await run();

      expect(mockCore.warning).toHaveBeenCalledWith('⚠️  OSS connection test failed, but continuing with upload...');
      expect(mockUploaderInstance.uploadFiles).toHaveBeenCalled();
    });

    it('should fail when no valid upload rules are found', async () => {
      mockParseUploadRules.mockReturnValue([]);

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('No valid upload rules found in assets input');
    });

    it('should handle upload failures when continue-on-error is false', async () => {
      mockUploaderInstance.uploadFiles.mockRejectedValue(new Error('Upload failed'));

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Upload failed: Upload failed');
    });

    it('should continue on upload failures when continue-on-error is true', async () => {
      mockCore.getBooleanInput.mockImplementation((name: string) => {
        return name === 'continue-on-error' ? true : false;
      });
      mockUploaderInstance.uploadFiles.mockRejectedValue(new Error('Upload failed'));

      await run();

      expect(mockCore.error).toHaveBeenCalledWith('Upload failed: Upload failed');
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });

    it('should handle input validation errors', async () => {
      mockValidateInputs.mockImplementation(() => {
        throw new Error('Invalid region');
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Input validation failed: Invalid region');
    });

    it('should handle OSS configuration errors', async () => {
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'region') return ''; // Invalid empty region
        return 'test-value';
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalled();
    });

    it('should set correct outputs for successful upload', async () => {
      const mockStats = {
        totalFiles: 10,
        uploadedFiles: 8,
        failedFiles: 2,
        totalSize: 2048,
        uploadedSize: 1800,
        totalDuration: 3000,
        successRate: 80
      };

      mockUploaderInstance.getStats.mockReturnValue(mockStats);

      await run();

      expect(mockCore.setOutput).toHaveBeenCalledWith('uploaded-files', '8');
      expect(mockCore.setOutput).toHaveBeenCalledWith('failed-files', '2');
      expect(mockCore.setOutput).toHaveBeenCalledWith('total-size', '2048');
      expect(mockCore.setOutput).toHaveBeenCalledWith('uploaded-size', '1800');
      expect(mockCore.setOutput).toHaveBeenCalledWith('success-rate', '80');
      expect(mockCore.setOutput).toHaveBeenCalledWith('duration', expect.stringMatching(/\d+\.\ds/));
    });

    it('should log upload statistics correctly', async () => {
      await run();

      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('📊 Upload completed!'));
      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('✅ Files uploaded: 5'));
      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('📁 Total size'));
      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('⏱️  Duration'));
      expect(mockCore.info).toHaveBeenCalledWith(expect.stringContaining('🎯 Success rate: 100%'));
    });

    it('should handle custom headers correctly', async () => {
      const customHeaders = { 'Cache-Control': 'max-age=3600' };
      mockParseHeaders.mockReturnValue(customHeaders);
      mockCore.getInput.mockImplementation((name: string) => {
        if (name === 'headers') return JSON.stringify(customHeaders);
        return 'test-value';
      });

      await run();

      expect(mockParseHeaders).toHaveBeenCalledWith(JSON.stringify(customHeaders));
    });
  });

  describe('environment variable handling', () => {
    it('should work with environment variables', async () => {
      // Test that the action works when inputs are provided via environment variables
      process.env.INPUT_REGION = 'oss-cn-shanghai';
      process.env.INPUT_KEY_ID = 'env-key-id';
      process.env.INPUT_KEY_SECRET = 'env-key-secret';
      process.env.INPUT_BUCKET = 'env-bucket';
      process.env.INPUT_ASSETS = 'package.json:test.json';

      await run();

      expect(mockOSSUploader).toHaveBeenCalled();
      expect(mockUploaderInstance.uploadFiles).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const unexpectedError = new Error('Unexpected system error');
      mockOSSUploader.mockImplementation(() => {
        throw unexpectedError;
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Unexpected system error');
    });

    it('should handle uploader instantiation errors', async () => {
      mockOSSUploader.mockImplementation(() => {
        throw new Error('Failed to initialize OSS client');
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('Failed to initialize OSS client');
    });
  });
});
