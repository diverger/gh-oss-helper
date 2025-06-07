"use strict";
/**
 * Main entry point for OSS GitHub Action (TypeScript)
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
exports.run = run;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const uploader_1 = require("./uploader");
const utils_1 = require("./utils");
/**
 * Main action runner
 */
async function run() {
    const startTime = Date.now();
    try {
        core.info('🚀 Starting OSS upload process...');
        // Get and validate inputs
        const inputs = getActionInputs();
        (0, utils_1.validateInputs)(inputs);
        // Create OSS configuration
        const ossConfig = createOSSConfig(inputs);
        logConnectionInfo(ossConfig);
        // Create retry configuration
        const retryConfig = createRetryConfig(inputs);
        // Create upload options
        const uploadOptions = createUploadOptions(inputs);
        // Initialize uploader
        const uploader = new uploader_1.OSSUploader(ossConfig, retryConfig);
        // Test connection (optional)
        const connectionOk = await uploader.testConnection();
        if (!connectionOk) {
            core.warning('⚠️  OSS connection test failed, but continuing with upload...');
        }
        // Parse upload rules
        const rules = (0, utils_1.parseUploadRules)(inputs.assets);
        if (rules.length === 0) {
            core.setFailed('No valid upload rules found in assets input');
            return;
        }
        core.info(`📋 Processing ${rules.length} upload rule(s)`);
        // Perform uploads
        const results = await uploader.uploadFiles(rules, uploadOptions);
        const stats = uploader.getStats();
        // Set outputs
        await setActionOutputs(results, stats, ossConfig);
        // Create job summary
        await createJobSummary(stats, ossConfig, startTime);
        // Check if we should fail on incomplete uploads
        const continueOnError = inputs.continueOnError === 'true';
        if (!continueOnError && stats.failedFiles > 0) {
            core.setFailed(`Upload incomplete: ${stats.failedFiles} file(s) failed to upload`);
            return;
        }
        const totalTime = (0, utils_1.formatDuration)(Date.now() - startTime);
        core.info(`🎉 Action completed successfully in ${totalTime}`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        core.error(`💥 Action failed: ${errorMessage}`);
        core.setFailed(errorMessage);
    }
}
/**
 * Extract and parse action inputs
 */
function getActionInputs() {
    return {
        keyId: core.getInput('key-id', { required: true }),
        keySecret: core.getInput('key-secret', { required: true }),
        bucket: core.getInput('bucket', { required: true }),
        assets: core.getInput('assets', { required: true }),
        region: core.getInput('region') || undefined,
        endpoint: core.getInput('endpoint') || undefined,
        timeout: core.getInput('timeout') || '120',
        maxRetries: core.getInput('max-retries') || '3',
        continueOnError: core.getInput('continue-on-error') || 'false',
        enableGzip: core.getInput('enable-gzip') || 'false',
        publicRead: core.getInput('public-read') || 'false',
        headers: core.getInput('headers') || undefined
    };
}
/**
 * Create OSS configuration from inputs
 */
function createOSSConfig(inputs) {
    const config = {
        accessKeyId: inputs.keyId,
        accessKeySecret: inputs.keySecret,
        bucket: inputs.bucket,
        timeout: parseInt(inputs.timeout || '120', 10) * 1000 // Convert to milliseconds
    };
    if (inputs.region) {
        config.region = inputs.region;
    }
    if (inputs.endpoint) {
        config.endpoint = inputs.endpoint;
    }
    return config;
}
/**
 * Create retry configuration from inputs
 */
function createRetryConfig(inputs) {
    return {
        maxRetries: parseInt(inputs.maxRetries || '3', 10),
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
    };
}
/**
 * Create upload options from inputs
 */
function createUploadOptions(inputs) {
    const options = {
        timeout: parseInt(inputs.timeout || '120', 10) * 1000
    };
    // Parse custom headers
    const customHeaders = (0, utils_1.parseHeaders)(inputs.headers);
    if (Object.keys(customHeaders).length > 0) {
        options.headers = customHeaders;
    }
    // Enable gzip compression
    if (inputs.enableGzip === 'true') {
        options.gzip = true;
    }
    // Set public read ACL
    if (inputs.publicRead === 'true') {
        options['x-oss-object-acl'] = 'public-read';
    }
    return options;
}
/**
 * Log connection information
 */
function logConnectionInfo(config) {
    core.info(`📦 Connecting to OSS bucket: ${config.bucket}`);
    if (config.region)
        core.info(`🌍 Region: ${config.region}`);
    if (config.endpoint)
        core.info(`🔗 Endpoint: ${config.endpoint}`);
    core.info(`⏱️  Timeout: ${config.timeout / 1000}s`);
}
/**
 * Set GitHub Action outputs
 */
async function setActionOutputs(results, stats, config) {
    if (results.length > 0) {
        // Set primary outputs
        core.setOutput('url', results.map(r => r.url).join(','));
        core.setOutput('urls', results.map(r => r.url));
        core.setOutput('count', stats.uploadedFiles.toString());
        // Set detailed outputs
        core.setOutput('total-files', stats.totalFiles.toString());
        core.setOutput('uploaded-files', stats.uploadedFiles.toString());
        core.setOutput('failed-files', stats.failedFiles.toString());
        core.setOutput('total-size', stats.totalSize.toString());
        core.setOutput('uploaded-size', stats.uploadedSize.toString());
        core.setOutput('success-rate', stats.successRate.toFixed(1));
        core.setOutput('duration', stats.totalDuration.toString());
        // Set bucket info
        core.setOutput('bucket', config.bucket);
        core.setOutput('region', config.region || 'default');
    }
}
/**
 * Create detailed job summary
 */
async function createJobSummary(stats, config, startTime) {
    const totalTime = (0, utils_1.formatDuration)(Date.now() - startTime);
    const totalSize = (0, utils_1.formatFileSize)(stats.totalSize);
    const uploadedSize = (0, utils_1.formatFileSize)(stats.uploadedSize);
    await core.summary
        .addHeading('OSS Upload Summary 📦')
        .addTable([
        [{ data: 'Metric', header: true }, { data: 'Value', header: true }],
        ['Total Files Found', stats.totalFiles.toString()],
        ['Files Uploaded', stats.uploadedFiles.toString()],
        ['Files Failed', stats.failedFiles.toString()],
        ['Success Rate', `${stats.successRate.toFixed(1)}%`],
        ['Total Size', totalSize],
        ['Uploaded Size', uploadedSize],
        ['Total Time', totalTime],
        ['Bucket', config.bucket],
        ['Region', config.region || 'default']
    ])
        .addDetails('GitHub Action Context', [
        `**Repository**: ${github.context.repo.owner}/${github.context.repo.repo}`,
        `**Workflow**: ${github.context.workflow}`,
        `**Run ID**: ${github.context.runId}`,
        `**SHA**: ${github.context.sha.substring(0, 7)}`
    ].join('\n'))
        .write();
}
// Run the action
if (require.main === module) {
    run().catch(error => {
        core.setFailed(error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map