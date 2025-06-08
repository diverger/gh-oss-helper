
# GH OSS Helper

[![GitHub](https://img.shields.io/github/license/diverger/gh-oss-helper)](https://github.com/diverger/gh-oss-helper/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/release/diverger/gh-oss-helper)](https://github.com/diverger/gh-oss-helper/releases)
[![Build and Package](https://github.com/diverger/gh-oss-helper/actions/workflows/build-and-package.yml/badge.svg)](https://github.com/diverger/gh-oss-helper/actions)
[![Unit Tests](https://github.com/diverger/gh-oss-helper/actions/workflows/unit-test.yml/badge.svg)](https://github.com/diverger/gh-oss-helper/actions)
[![Integration Tests](https://github.com/diverger/gh-oss-helper/actions/workflows/integration-test.yml/badge.svg)](https://github.com/diverger/gh-oss-helper/actions)
[![Action Tests](https://github.com/diverger/gh-oss-helper/actions/workflows/action-test.yml/badge.svg)](https://github.com/diverger/gh-oss-helper/actions)

A TypeScript GitHub Action for uploading assets to Alibaba Cloud OSS (Object Storage Service) with advanced retry logic, comprehensive error handling, and extensive customization options.

## ✨ Features

- 🚀 **Fast & Reliable**: Built with TypeScript for type safety and performance
- 🔄 **Smart Retry Logic**: Exponential backoff with configurable retry attempts
- 📊 **Comprehensive Reporting**: Detailed upload statistics and summaries
- 🛡️ **Error Handling**: Graceful error handling with detailed error messages
- ⚡ **Flexible Configuration**: Support for custom headers, compression, and ACL settings
- 🔧 **Modern Toolchain**: ESLint 9, Vitest, TypeScript 5.7, and @vercel/ncc bundling
- 🎯 **Sequential Processing**: Prevents race conditions and connection overload
- ⏱️ **Timeout Management**: Configurable timeouts for all operations
- 📈 **GitHub Job Summaries**: Rich upload reports in GitHub Actions UI

## 🚀 Quick Start

```yaml
name: Deploy to OSS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Upload to OSS
        uses: diverger/gh-oss-helper@v1
        with:
          access-key: ${{ secrets.OSS_ACCESS_KEY }}
          secret-key: ${{ secrets.OSS_SECRET_KEY }}
          bucket: my-website-bucket
          region: oss-cn-hangzhou
          assets: |
            dist/**/*:/
            public/favicon.ico:favicon.ico
```

## 📋 Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `access-key` | ✅ | - | Alibaba Cloud Access Key ID |
| `secret-key` | ✅ | - | Alibaba Cloud Access Key Secret |
| `bucket` | ✅ | - | OSS bucket name |
| `assets` | ✅ | - | Upload rules (see format below) |
| `region` | ❌ | - | OSS region (e.g., `oss-cn-hangzhou`) |
| `endpoint` | ❌ | - | Custom OSS endpoint URL |
| `timeout` | ❌ | `600` | Upload timeout in seconds |
| `max-retries` | ❌ | `3` | Maximum retry attempts for failed uploads |
| `continue-on-error` | ❌ | `false` | Continue even if some uploads fail |
| `enable-gzip` | ❌ | `false` | Enable gzip compression |
| `public-read` | ❌ | `false` | Set public-read ACL on uploaded files |
| `headers` | ❌ | - | Custom headers as JSON string |

## 📤 Outputs

| Output | Description |
|--------|-------------|
| `url` | Comma-separated list of uploaded file URLs |
| `urls` | Array of uploaded file URLs |
| `count` | Number of successfully uploaded files |
| `total-files` | Total number of files processed |
| `uploaded-files` | Number of successfully uploaded files |
| `failed-files` | Number of failed uploads |
| `total-size` | Total size of all files in bytes |
| `uploaded-size` | Total size of successfully uploaded files |
| `success-rate` | Upload success rate as percentage |
| `duration` | Total upload duration in milliseconds |
| `bucket` | OSS bucket name used |
| `region` | OSS region used |

## 📝 Assets Format

The `assets` input uses a simple format: `source:destination`

- **Single files**: `src/file.txt:path/to/file.txt`
- **Directories**: `dist/**/*:website/` (note the trailing `/`)
- **Multiple rules**: One per line

### Examples

```yaml
assets: |
  # Upload entire dist folder to root
  dist/**/*:/

  # Upload specific files
  package.json:meta/package.json
  README.md:docs/readme.md

  # Upload with custom path structure
  src/assets/**/*:static/assets/
  public/favicon.ico:favicon.ico
```

## 🔧 Advanced Configuration

### Custom Headers

```yaml
- name: Upload with custom headers
  uses: diverger/gh-oss-helper@v1
  with:
    # ... other inputs
    headers: |
      {
        "Cache-Control": "max-age=31536000",
        "Content-Type": "application/json"
      }
```

### Retry Configuration

```yaml
- name: Upload with custom retry logic
  uses: diverger/gh-oss-helper@v1
  with:
    # ... other inputs
    max-retries: 5
    timeout: 300
    continue-on-error: true
```

### Gzip Compression

```yaml
- name: Upload with compression
  uses: diverger/gh-oss-helper@v1
  with:
    # ... other inputs
    enable-gzip: true
    public-read: true
```

## 🎯 Example Workflows

### Static Website Deployment

```yaml
name: Deploy Website
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build website
        run: npm run build

      - name: Upload to OSS
        uses: diverger/gh-oss-helper@v1
        with:
          access-key: ${{ secrets.OSS_ACCESS_KEY }}
          secret-key: ${{ secrets.OSS_SECRET_KEY }}
          bucket: my-website
          region: oss-cn-hangzhou
          public-read: true
          enable-gzip: true
          assets: |
            dist/**/*:/

      - name: Display upload results
        run: |
          echo "Uploaded ${{ steps.upload.outputs.count }} files"
          echo "Success rate: ${{ steps.upload.outputs.success-rate }}%"
```

### Documentation Upload

```yaml
name: Update Documentation
on:
  push:
    paths: ['docs/**']

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Upload documentation
        uses: diverger/gh-oss-helper@v1
        with:
          access-key: ${{ secrets.OSS_ACCESS_KEY }}
          secret-key: ${{ secrets.OSS_SECRET_KEY }}
          bucket: documentation-bucket
          region: oss-cn-beijing
          timeout: 60
          max-retries: 2
          headers: '{"Cache-Control": "max-age=3600"}'
          assets: |
            docs/**/*:documentation/
            README.md:documentation/index.md
```

## 🔍 Troubleshooting

### Debug Mode

Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
