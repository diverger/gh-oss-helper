# Security Policy

## Overview

This project implements a comprehensive security model that balances open contribution with credential protection. The security guards ensure that sensitive operations and credentials are only accessible to repository owners while allowing contributors to run comprehensive tests.

## Security Guards by Workflow

### 1. Unit Tests (`unit-test.yml`)
**Security Level**: Open to all contributors
```yaml
if: github.repository == 'diverger/gh-oss-helper' || github.event_name == 'pull_request'
```
- ✅ Runs on all pull requests from any contributor
- ✅ No secrets required
- ✅ Tests core functionality with mocks

### 2. Integration Tests (`integration-test.yml`)
**Security Level**: Open to all contributors
```yaml
if: github.repository == 'diverger/gh-oss-helper' || github.event_name == 'pull_request'
```
- ✅ Runs on all pull requests from any contributor
- ✅ Uses mocked OSS SDK for realistic testing
- ✅ No real credentials required

### 3. Action Tests (`action-test.yml`)
**Security Level**: Dual-tier security

#### Interface Test Job
```yaml
if: github.repository == 'diverger/gh-oss-helper' || github.event_name == 'pull_request'
```
- ✅ Runs on all pull requests from any contributor
- ✅ Tests action interface with mock credentials
- ✅ Validates `action.yml` compliance

#### Real OSS Test Job
```yaml
if: github.repository == 'diverger/gh-oss-helper' &&
    github.actor == github.repository_owner &&
    (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
```
- 🔒 Repository owner only
- 🔒 Only on push or manual dispatch (not PRs)
- 🔒 Requires real OSS credentials

### 4. Build and Package (`build-and-package.yml`)
**Security Level**: Open to all contributors
```yaml
if: github.repository == 'diverger/gh-oss-helper' || github.event_name == 'pull_request'
```
- ✅ Runs on all pull requests from any contributor
- ✅ No secrets required

### 5. Manual Tests (`manual-test.yml`)
**Security Level**: Conditional access
```yaml
if: github.repository == 'diverger/gh-oss-helper'
```
- 🔒 Repository-only (no fork execution)
- 🔐 Conditional secret access based on actor
- ⚠️ Warning notice for contributors about secret availability

### 6. Release (`release.yml`)
**Security Level**: Repository owner only
```yaml
if: github.repository == 'diverger/gh-oss-helper' &&
    github.actor == github.repository_owner
```
- 🔒 Repository owner only
- 🔒 Controls release process and sensitive operations

## Credential Security

### Environment Variable Safety
The real OSS test job uses environment variables for credentials:
```yaml
with:
  access-key: ${{ secrets.OSS_ACCESS_KEY_ID }}
  secret-key: ${{ secrets.OSS_ACCESS_KEY_SECRET }}
  bucket: ${{ secrets.OSS_BUCKET }}
  region: ${{ secrets.OSS_REGION }}
```

**This is secure because:**
1. **GitHub Secrets Encryption**: Secrets are encrypted at rest and in transit
2. **Access Control**: Multiple security guards prevent unauthorized access
3. **No Log Exposure**: GitHub automatically masks secrets in logs
4. **Scoped Access**: Environment variables are only available to the specific action step
5. **Audit Trail**: Clear conditions show when/why secrets are accessed

### Secret Validation
The workflow includes pre-checks to ensure all required secrets are configured before attempting real uploads.

## Contributor Access Levels

### 1. Public Contributors (Pull Requests)
**Can Access:**
- ✅ Unit tests with mocks
- ✅ Integration tests with mocked OSS SDK
- ✅ Action interface tests with mock credentials
- ✅ Build and packaging verification

**Cannot Access:**
- ❌ Real OSS credentials
- ❌ Live upload testing
- ❌ Release operations

### 2. Repository Owner
**Can Access:**
- ✅ All contributor capabilities
- ✅ Real OSS credential testing
- ✅ Manual test execution
- ✅ Release operations
- ✅ All secrets and sensitive operations

## Best Practices Implemented

1. **Principle of Least Privilege**: Only repository owner can access secrets
2. **Defense in Depth**: Multiple security conditions per workflow
3. **Separation of Concerns**: Mock tests for PRs, real tests for owner
4. **Audit Trail**: Clear conditions show when/why secrets are accessed
5. **Fail-Safe Defaults**: Workflows fail closed if conditions aren't met

## Reporting Security Issues

If you discover a security vulnerability, please report it by:
1. Creating a private issue in this repository
2. Emailing the repository owner directly
3. Do not create public issues for security vulnerabilities

## Security Updates

This security model is reviewed and updated as needed. Major changes to security guards or credential handling will be documented in release notes.
