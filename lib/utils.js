"use strict";
/**
 * Utility functions for OSS Action
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInputs = validateInputs;
exports.parseUploadRules = parseUploadRules;
exports.formatFileSize = formatFileSize;
exports.formatDuration = formatDuration;
exports.calculateBackoffDelay = calculateBackoffDelay;
exports.validateFile = validateFile;
exports.getFileStats = getFileStats;
exports.parseHeaders = parseHeaders;
exports.sanitizeRemotePath = sanitizeRemotePath;
exports.delay = delay;
exports.extractRelativePath = extractRelativePath;
exports.logOperation = logOperation;
exports.logSuccess = logSuccess;
exports.logWarning = logWarning;
exports.logError = logError;
const fs_1 = require("fs");
const path_1 = require("path");
const core = __importStar(require("@actions/core"));
const types_1 = require("./types");
/**
 * Validates required GitHub Action inputs
 */
function validateInputs(inputs) {
    const requiredFields = ['keyId', 'keySecret', 'bucket', 'assets'];
    for (const field of requiredFields) {
        if (!inputs[field]) {
            throw new types_1.ValidationError(`Required input '${field}' is missing`, field);
        }
    }
    // Validate timeout
    if (inputs.timeout) {
        const timeout = parseInt(inputs.timeout, 10);
        if (isNaN(timeout) || timeout <= 0) {
            throw new types_1.ValidationError('Timeout must be a positive number', 'timeout');
        }
    }
    // Validate maxRetries
    if (inputs.maxRetries) {
        const retries = parseInt(inputs.maxRetries, 10);
        if (isNaN(retries) || retries < 0) {
            throw new types_1.ValidationError('Max retries must be a non-negative number', 'maxRetries');
        }
    }
}
/**
 * Parses upload rules from assets string
 */
function parseUploadRules(assets) {
    const rules = [];
    for (const line of assets.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
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
function formatFileSize(bytes) {
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
function formatDuration(milliseconds) {
    const seconds = milliseconds / 1000;
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    }
    else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}
/**
 * Calculates exponential backoff delay
 */
function calculateBackoffDelay(attempt, baseDelay = 1000, maxDelay = 10000, multiplier = 2) {
    const delay = baseDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
}
/**
 * Validates if file exists and is readable
 */
async function validateFile(filePath) {
    try {
        const stats = await fs_1.promises.stat(filePath);
        if (!stats.isFile()) {
            throw new types_1.FileNotFoundError(`Path is not a file: ${filePath}`);
        }
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new types_1.FileNotFoundError(filePath);
        }
        throw error;
    }
}
/**
 * Gets file stats safely
 */
async function getFileStats(filePath) {
    await validateFile(filePath);
    const stats = await fs_1.promises.stat(filePath);
    return {
        size: stats.size,
        name: (0, path_1.basename)(filePath)
    };
}
/**
 * Parses custom headers from string
 */
function parseHeaders(headersString) {
    if (!headersString)
        return {};
    try {
        return JSON.parse(headersString);
    }
    catch (error) {
        core.warning(`⚠️  Failed to parse headers JSON: ${headersString}`);
        return {};
    }
}
/**
 * Sanitizes remote path to ensure it's valid
 */
function sanitizeRemotePath(path) {
    // Remove leading slashes and normalize
    return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}
/**
 * Creates a delay promise for retry backoff
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Extracts filename from glob pattern base
 */
function extractRelativePath(filePath, basePath) {
    const base = basePath.replace(/\*+$/g, '');
    return filePath.replace(base, '');
}
/**
 * Logs operation with consistent formatting
 */
function logOperation(operation, details) {
    const message = details ? `${operation}: ${details}` : operation;
    core.info(`🔧 ${message}`);
}
/**
 * Logs success with consistent formatting
 */
function logSuccess(message) {
    core.info(`✅ ${message}`);
}
/**
 * Logs warning with consistent formatting
 */
function logWarning(message) {
    core.warning(`⚠️  ${message}`);
}
/**
 * Logs error with consistent formatting
 */
function logError(message) {
    core.error(`❌ ${message}`);
}
//# sourceMappingURL=utils.js.map