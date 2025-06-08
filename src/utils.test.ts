/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatDuration,
  calculateBackoffDelay,
  parseUploadRules,
  sanitizeRemotePath,
  extractRelativePath,
  parseHeaders
} from './utils';

describe('Utils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0.00 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatFileSize(500)).toBe('500.00 B');
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(500)).toBe('0.5s');
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3690000)).toBe('1h 1m');
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(calculateBackoffDelay(0, 1000, 10000, 2)).toBe(1000);
      expect(calculateBackoffDelay(1, 1000, 10000, 2)).toBe(2000);
      expect(calculateBackoffDelay(2, 1000, 10000, 2)).toBe(4000);
      expect(calculateBackoffDelay(3, 1000, 10000, 2)).toBe(8000);
      expect(calculateBackoffDelay(4, 1000, 10000, 2)).toBe(10000); // Should cap at maxDelay
    });
  });

  describe('parseUploadRules', () => {
    it('should parse upload rules correctly', () => {
      const assets = `
        src/**/*:dist/
        public/favicon.ico:favicon.ico
        README.md:docs/readme.md
      `;

      const rules = parseUploadRules(assets);

      expect(rules).toHaveLength(3);
      expect(rules[0]).toEqual({
        source: 'src/**/*',
        destination: 'dist/',
        isDirectory: true
      });
      expect(rules[1]).toEqual({
        source: 'public/favicon.ico',
        destination: 'favicon.ico',
        isDirectory: false
      });
      expect(rules[2]).toEqual({
        source: 'README.md',
        destination: 'docs/readme.md',
        isDirectory: false
      });
    });

    it('should skip empty lines and invalid rules', () => {
      const assets = `
        src/**/*:dist/

        invalid-rule-without-colon
        :missing-source
        missing-destination:
        valid.txt:valid.txt
      `;

      const rules = parseUploadRules(assets);

      expect(rules).toHaveLength(2); // Only valid rules
      expect(rules[0].source).toBe('src/**/*');
      expect(rules[1].source).toBe('valid.txt');
    });
  });

  describe('sanitizeRemotePath', () => {
    it('should sanitize remote paths correctly', () => {
      expect(sanitizeRemotePath('/path/to/file.txt')).toBe('path/to/file.txt');
      expect(sanitizeRemotePath('//path//to//file.txt')).toBe('path/to/file.txt');
      expect(sanitizeRemotePath('path/to/file.txt')).toBe('path/to/file.txt');
      expect(sanitizeRemotePath('///multiple///slashes///')).toBe('multiple/slashes/');
    });
  });

  describe('extractRelativePath', () => {
    it('should extract relative paths correctly from glob patterns', () => {
      expect(extractRelativePath('/home/user/project/src/file.js', '/home/user/project/**/*'))
        .toBe('src/file.js');
      expect(extractRelativePath('/project/dist/app.js', '/project/**/*'))
        .toBe('dist/app.js');
      expect(extractRelativePath('/project/src/components/Button.tsx', '/project/src/**/*'))
        .toBe('components/Button.tsx');
    });

    it('should handle nested directory structures', () => {
      expect(extractRelativePath('/temp/subdir/nested.txt', '/temp/**/*.txt'))
        .toBe('subdir/nested.txt');
      expect(extractRelativePath('/temp/root.txt', '/temp/**/*.txt'))
        .toBe('root.txt');
    });

    it('should handle fallback to filename when path does not match', () => {
      expect(extractRelativePath('/different/path/file.js', '/project/**/*'))
        .toBe('file.js');
    });
  });

  describe('parseHeaders', () => {
    it('should parse valid JSON headers', () => {
      const headers = parseHeaders('{"Cache-Control":"max-age=3600","Content-Type":"text/html"}');
      expect(headers).toEqual({
        'Cache-Control': 'max-age=3600',
        'Content-Type': 'text/html'
      });
    });

    it('should return empty object for invalid JSON', () => {
      expect(parseHeaders('invalid-json')).toEqual({});
      expect(parseHeaders('{invalid')).toEqual({});
      expect(parseHeaders('')).toEqual({});
      expect(parseHeaders(undefined)).toEqual({});
    });
  });
});
