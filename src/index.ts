/**
 * Main entry point for OSS GitHub Action (TypeScript)
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { OSSUploader } from './uploader';
import { ActionInputs, OSSConfig, RetryConfig, UploadOptions, UploadResult, UploadStats } from './types';
import { validateInputs, parseUploadRules, parseHeaders, formatFileSize, formatDuration, logDebug, isDebugEnabled } from './utils';

/**
 * Main action runner
 */
async function run(): Promise<void> {
  const startTime = Date.now();  try {
    core.info('🚀 Starting OSS upload process...');

    if (isDebugEnabled()) {
      core.info('🐛 ===============================================');
      core.info('🐛 DEBUG MODE ENABLED - Verbose logging active');
      core.info('🐛 ===============================================');
      logDebug('Debug mode enabled', {
        ACTIONS_STEP_DEBUG: process.env.ACTIONS_STEP_DEBUG,
        enableDebugInput: core.getInput('enable-debug')
      });
    }

    // Get and validate inputs
    const inputs = getActionInputs();
    if (isDebugEnabled()) {
      logDebug('Raw action inputs received', {
        region: inputs.region,
        bucket: inputs.bucket,
        timeout: inputs.timeout,
        maxRetries: inputs.maxRetries,
        enableDebug: inputs.enableDebug,
        assetsLength: inputs.assets.length
      });
    }
    validateInputs(inputs);

    // Create OSS configuration
    const ossConfig = createOSSConfig(inputs);
    logDebug('OSS configuration created', {
      bucket: ossConfig.bucket,
      region: ossConfig.region,
      endpoint: ossConfig.endpoint,
      timeout: ossConfig.timeout
    });
    logConnectionInfo(ossConfig);

    // Create retry configuration
    const retryConfig = createRetryConfig(inputs);
    logDebug('Retry configuration', retryConfig);

    // Create upload options
    const uploadOptions = createUploadOptions(inputs);
    logDebug('Upload options', uploadOptions);

    // Initialize uploader
    const uploader = new OSSUploader(ossConfig, retryConfig);

    // Test connection (optional)
    const connectionOk = await uploader.testConnection();
    if (!connectionOk) {
      core.warning('⚠️  OSS connection test failed, but continuing with upload...');
    }

    // Parse upload rules
    const rules = parseUploadRules(inputs.assets);
    logDebug('Parsed upload rules', rules);
    if (rules.length === 0) {
      core.setFailed('No valid upload rules found in assets input');
      return;
    }

    core.info(`📋 Processing ${rules.length} upload rule(s)`);

    // Perform uploads
    const results = await uploader.uploadFiles(rules, uploadOptions);
    const stats = uploader.getStats();
    logDebug('Upload results', { results, stats });

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

    const totalTime = formatDuration(Date.now() - startTime);
    core.info(`🎉 Action completed successfully in ${totalTime}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    core.error(`💥 Action failed: ${errorMessage}`);
    core.setFailed(errorMessage);
  }
}

/**
 * Extract and parse action inputs
 */
function getActionInputs(): ActionInputs {
  return {
    accessKey: core.getInput('access-key', { required: true }),
    secretKey: core.getInput('secret-key', { required: true }),
    bucket: core.getInput('bucket', { required: true }),
    assets: core.getInput('assets', { required: true }),
    region: core.getInput('region') || undefined,
    endpoint: core.getInput('endpoint') || undefined,
    timeout: core.getInput('timeout') || '120',
    maxRetries: core.getInput('max-retries') || '3',
    continueOnError: core.getInput('continue-on-error') || 'false',
    enableGzip: core.getInput('enable-gzip') || 'false',
    publicRead: core.getInput('public-read') || 'false',
    headers: core.getInput('headers') || undefined,
    enableDebug: core.getInput('enable-debug') || 'false'
  };
}

/**
 * Create OSS configuration from inputs
 */
function createOSSConfig(inputs: ActionInputs): OSSConfig {
  const config: OSSConfig = {
    accessKeyId: inputs.accessKey,
    accessKeySecret: inputs.secretKey,
    bucket: inputs.bucket,
    timeout: parseInt(inputs.timeout || '600', 10) * 1000 // Convert to milliseconds
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
function createRetryConfig(inputs: ActionInputs): RetryConfig {
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
function createUploadOptions(inputs: ActionInputs): UploadOptions {
  const options: UploadOptions = {
    timeout: parseInt(inputs.timeout || '600', 10) * 1000
  };

  // Parse custom headers
  const customHeaders = parseHeaders(inputs.headers);
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
function logConnectionInfo(config: OSSConfig): void {
  core.info(`📦 Connecting to OSS bucket: ${config.bucket}`);
  if (config.region) core.info(`🌍 Region: ${config.region}`);
  if (config.endpoint) core.info(`🔗 Endpoint: ${config.endpoint}`);
  core.info(`⏱️ Timeout: ${config.timeout / 1000}s`);
}

/**
 * Set GitHub Action outputs
 */
async function setActionOutputs(results: UploadResult[], stats: UploadStats, config: OSSConfig): Promise<void> {
  // Set URL outputs only if there are results
  if (results.length > 0) {
    core.setOutput('url', results.map(r => r.url).join(','));
    core.setOutput('urls', JSON.stringify(results.map(r => r.url)));
  } else {
    core.setOutput('url', '');
    core.setOutput('urls', JSON.stringify([]));
  }

  // Always set stats and config outputs
  core.setOutput('count', stats.uploadedFiles.toString());
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

/**
 * Create detailed job summary
 */
async function createJobSummary(stats: UploadStats, config: OSSConfig, startTime: number): Promise<void> {
  const totalTime = formatDuration(Date.now() - startTime);
  const totalSize = formatFileSize(stats.totalSize);
  const uploadedSize = formatFileSize(stats.uploadedSize);

  await core.summary
    .addHeading('OSS Upload Summary 📦')
    .addTable([
      [{data: 'Metric', header: true}, {data: 'Value', header: true}],
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

export { run };
