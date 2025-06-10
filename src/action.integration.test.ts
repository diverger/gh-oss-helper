/**
 * GitHub Action Integration Tests
 *
 * These tests verify the action works end-to-end as users would expect,
 * testing the action.yml interface and actual workflow behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock @actions/core to capture outputs
const mockOutputs: Record<string, string> = {};
const mockInfo: string[] = [];
const mockWarnings: string[] = [];
const mockErrors: string[] = [];
let mockFailed = false;

vi.mock('@actions/core', () => ({
  info: vi.fn((msg: string) => mockInfo.push(msg)),
  warning: vi.fn((msg: string) => mockWarnings.push(msg)),
  error: vi.fn((msg: string) => mockErrors.push(msg)),
  debug: vi.fn((msg: string) => mockInfo.push(`DEBUG: ${msg}`)), // Add debug mock
  setFailed: vi.fn((msg: string) => {
    mockFailed = true;
    mockErrors.push(msg);
  }),
  setOutput: vi.fn((key: string, value: string) => {
    mockOutputs[key] = value;
  }),
  getInput: vi.fn((name: string) => process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`] || ''),
  getBooleanInput: vi.fn((name: string) => {
    const value = process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`];
    return value === 'true';
  }),
  summary: {
    addHeading: vi.fn().mockReturnThis(),
    addTable: vi.fn().mockReturnThis(),
    addDetails: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock @actions/github
vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    ref: 'refs/heads/main',
    sha: 'abc123def',
    workflow: 'test-workflow',
    job: 'test-job',
    runId: 123456
  }
}));

// Mock OSS SDK to simulate successful uploads
vi.mock('ali-oss', () => ({
  default: vi.fn().mockImplementation(() => ({
    put: vi.fn().mockResolvedValue({
      res: { headers: { etag: 'mock-etag' } },
      url: 'https://test-bucket.oss-cn-hangzhou.aliyuncs.com/test-file.txt'
    }),
    getBucketInfo: vi.fn().mockResolvedValue({ name: 'test-bucket' })
  }))
}));

describe('GitHub Action Integration Tests', () => {
  let tempDir: string;
  let testFile1: string;
  let testFile2: string;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    Object.keys(mockOutputs).forEach(key => delete mockOutputs[key]);
    mockInfo.length = 0;
    mockWarnings.length = 0;
    mockErrors.length = 0;
    mockFailed = false;

    // Create temporary test files
    tempDir = await fs.mkdtemp(join(tmpdir(), 'gh-oss-test-'));
    testFile1 = join(tempDir, 'test1.txt');
    testFile2 = join(tempDir, 'test2.json');

    await fs.writeFile(testFile1, 'Hello World!');
    await fs.writeFile(testFile2, JSON.stringify({ test: 'data' }));

    // Clear environment
    Object.keys(process.env)
      .filter(key => key.startsWith('INPUT_'))
      .forEach(key => delete process.env[key]);
  });

  afterEach(async () => {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Action Input/Output Interface', () => {
    it('should handle minimal required inputs and produce expected outputs', async () => {
      // Set action inputs as GitHub Actions would
      process.env.INPUT_ACCESS_KEY = 'test-access-key';
      process.env.INPUT_SECRET_KEY = 'test-secret-key';
      process.env.INPUT_BUCKET = 'test-bucket';
      process.env.INPUT_REGION = 'oss-cn-hangzhou';
      process.env.INPUT_ASSETS = `${testFile1}:upload/test1.txt`;

      // Import and run the action
      const { run } = await import('./index');
      await run();

      // Verify action didn't fail
      expect(mockFailed).toBe(false);

      // Verify expected outputs are set
      expect(mockOutputs).toHaveProperty('count');
      expect(mockOutputs).toHaveProperty('total-files');
      expect(mockOutputs).toHaveProperty('uploaded-files');
      expect(mockOutputs).toHaveProperty('failed-files');
      expect(mockOutputs).toHaveProperty('total-size');
      expect(mockOutputs).toHaveProperty('uploaded-size');
      expect(mockOutputs).toHaveProperty('success-rate');
      expect(mockOutputs).toHaveProperty('duration');
      expect(mockOutputs).toHaveProperty('bucket', 'test-bucket');
      expect(mockOutputs).toHaveProperty('region', 'oss-cn-hangzhou');

      // Verify successful upload
      expect(mockOutputs['uploaded-files']).toBe('1');
      expect(mockOutputs['failed-files']).toBe('0');
      expect(mockOutputs['success-rate']).toBe('100.0');
    });

    it('should handle multiple file uploads with directory patterns', async () => {
      process.env.INPUT_ACCESS_KEY = 'test-access-key';
      process.env.INPUT_SECRET_KEY = 'test-secret-key';
      process.env.INPUT_BUCKET = 'test-bucket';
      process.env.INPUT_REGION = 'oss-cn-hangzhou';
      process.env.INPUT_ASSETS = `${tempDir}/*:uploads/`;

      const { run } = await import('./index');
      await run();

      expect(mockFailed).toBe(false);
      expect(mockOutputs['uploaded-files']).toBe('2'); // Both test files
      expect(mockOutputs['success-rate']).toBe('100.0');
    });

    it('should handle advanced options (gzip, headers, public-read)', async () => {
      process.env.INPUT_ACCESS_KEY = 'test-access-key';
      process.env.INPUT_SECRET_KEY = 'test-secret-key';
      process.env.INPUT_BUCKET = 'test-bucket';
      process.env.INPUT_REGION = 'oss-cn-hangzhou';
      process.env.INPUT_ASSETS = `${testFile1}:upload/test1.txt`;
      process.env.INPUT_ENABLE_GZIP = 'true';
      process.env.INPUT_PUBLIC_READ = 'true';
      process.env.INPUT_HEADERS = '{"Cache-Control":"max-age=3600","X-Custom":"test"}';
      process.env.INPUT_TIMEOUT = '300';
      process.env.INPUT_MAX_RETRIES = '5';

      const { run } = await import('./index');
      await run();

      expect(mockFailed).toBe(false);
      expect(mockOutputs['uploaded-files']).toBe('1');
    });

    it('should fail gracefully with invalid inputs', async () => {
      // Missing required inputs
      process.env.INPUT_ACCESS_KEY = '';
      process.env.INPUT_SECRET_KEY = '';
      process.env.INPUT_BUCKET = '';
      process.env.INPUT_ASSETS = '';

      const { run } = await import('./index');
      await run();

      expect(mockFailed).toBe(true);
      expect(mockErrors.length).toBeGreaterThan(0);
    });

    it('should handle invalid assets format gracefully', async () => {
      process.env.INPUT_ACCESS_KEY = 'test-access-key';
      process.env.INPUT_SECRET_KEY = 'test-secret-key';
      process.env.INPUT_BUCKET = 'test-bucket';
      process.env.INPUT_REGION = 'oss-cn-hangzhou';
      process.env.INPUT_ASSETS = 'invalid-format-no-colon';

      const { run } = await import('./index');
      await run();

      expect(mockFailed).toBe(true);
      expect(mockErrors.some(err => err.includes('No valid upload rules'))).toBe(true);
    });
  });

  describe('Action Workflow Simulation', () => {
    it('should simulate real GitHub Action workflow execution', async () => {
      // Simulate GitHub Actions environment
      process.env.GITHUB_WORKFLOW = 'Deploy to OSS';
      process.env.GITHUB_RUN_ID = '123456789';
      process.env.GITHUB_JOB = 'deploy';
      process.env.GITHUB_ACTION = 'gh-oss-helper';
      process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';

      // Set realistic action inputs
      process.env.INPUT_ACCESS_KEY = 'LTAI5tMockAccessKey';
      process.env.INPUT_SECRET_KEY = 'MockSecretKey123456789';
      process.env.INPUT_BUCKET = 'my-production-bucket';
      process.env.INPUT_REGION = 'oss-cn-hangzhou';
      process.env.INPUT_ASSETS = [
        `${testFile1}:static/assets/test1.txt`,
        `${testFile2}:api/data/test2.json`
      ].join('\n');
      process.env.INPUT_TIMEOUT = '600';
      process.env.INPUT_MAX_RETRIES = '3';
      process.env.INPUT_CONTINUE_ON_ERROR = 'false';
      process.env.INPUT_ENABLE_GZIP = 'true';
      process.env.INPUT_PUBLIC_READ = 'true';

      const { run } = await import('./index');
      await run();

      // Verify workflow succeeded
      expect(mockFailed).toBe(false);

      // Verify proper logging occurred
      expect(mockInfo.some(msg => msg.includes('Starting OSS upload process'))).toBe(true);
      expect(mockInfo.some(msg => msg.includes('upload rule(s)'))).toBe(true);

      // Verify outputs match action.yml specification
      const expectedOutputs = [
        'url', 'urls', 'count', 'total-files', 'uploaded-files',
        'failed-files', 'total-size', 'uploaded-size', 'success-rate',
        'duration', 'bucket', 'region'
      ];

      expectedOutputs.forEach(output => {
        expect(mockOutputs).toHaveProperty(output);
      });

      // Verify numeric outputs are properly formatted
      expect(Number(mockOutputs['uploaded-files'])).toBeGreaterThan(0);
      expect(Number(mockOutputs['duration'])).toBeGreaterThan(0);
      expect(Number(mockOutputs['success-rate'])).toBeGreaterThanOrEqual(0);
    });

    it('should handle continue-on-error behavior', async () => {
      // Create scenario where one file exists and one doesn't
      const missingFile = join(tempDir, 'missing.txt');

      process.env.INPUT_ACCESS_KEY = 'test-access-key';
      process.env.INPUT_SECRET_KEY = 'test-secret-key';
      process.env.INPUT_BUCKET = 'test-bucket';
      process.env.INPUT_REGION = 'oss-cn-hangzhou';
      process.env.INPUT_ASSETS = [
        `${testFile1}:uploads/existing.txt`,
        `${missingFile}:uploads/missing.txt`
      ].join('\n');
      process.env.INPUT_CONTINUE_ON_ERROR = 'true';

      const { run } = await import('./index');
      await run();

      // Should not fail the action due to continue-on-error
      expect(mockFailed).toBe(false);

      // Should have some uploads succeed and some fail
      expect(Number(mockOutputs['uploaded-files'])).toBeGreaterThan(0);
      expect(Number(mockOutputs['failed-files'])).toBeGreaterThan(0);
      expect(Number(mockOutputs['success-rate'])).toBeLessThan(100);
    });
  });

  describe('Action Outputs Validation', () => {
    it('should produce outputs that match action.yml specification', async () => {
      process.env.INPUT_ACCESS_KEY = 'test-access-key';
      process.env.INPUT_SECRET_KEY = 'test-secret-key';
      process.env.INPUT_BUCKET = 'test-bucket';
      process.env.INPUT_REGION = 'oss-cn-hangzhou';
      process.env.INPUT_ASSETS = `${testFile1}:test.txt`;

      const { run } = await import('./index');
      await run();

      // Validate output formats match what users expect
      expect(mockOutputs['url']).toMatch(/^https?:\/\/.+/); // Valid URL
      expect(mockOutputs['count']).toMatch(/^\d+$/); // Numeric string
      expect(mockOutputs['success-rate']).toMatch(/^\d+(\.\d+)?$/); // Decimal number
      expect(mockOutputs['duration']).toMatch(/^\d+$/); // Milliseconds as number
      expect(mockOutputs['bucket']).toBe('test-bucket');
      expect(mockOutputs['region']).toBe('oss-cn-hangzhou');

      // Validate arrays are properly formatted
      const urls = JSON.parse(mockOutputs['urls'] || '[]');
      expect(Array.isArray(urls)).toBe(true);
      expect(urls.length).toBeGreaterThan(0);
    });
  });
});
