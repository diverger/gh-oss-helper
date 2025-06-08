
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

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/diverger/gh-oss-helper.git
cd gh-oss-helper

# Install dependencies
npm install

# Run tests
npm test

# Build the action
npm run build
```

### Scripts

- `npm run build` - Build TypeScript and bundle with ncc
- `npm run dev` - Watch mode for development
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Project Structure

```
gh-oss-helper/
├── src/                    # TypeScript source code
│   ├── index.ts           # Main action entry point
│   ├── uploader.ts        # OSS upload logic
│   ├── utils.ts           # Utility functions
│   ├── types.ts           # TypeScript type definitions
│   └── *.test.ts          # Test files
├── lib/                    # Compiled JavaScript
├── dist/                   # Bundled action (for GitHub)
├── action.yml             # Action metadata
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Test configuration
└── eslint.config.mjs      # ESLint configuration
```

## 🔍 Troubleshooting

### Common Issues

**TimeoutError during uploads**
- Increase the `timeout` value
- Check your network connection
- Verify OSS endpoint accessibility

**Authentication failures**
- Verify your Access Key ID and Secret
- Check bucket permissions
- Ensure the region is correct

**File not found errors**
- Verify source paths in assets configuration
- Check if files exist in the repository
- Ensure glob patterns are correct

### Debug Mode

Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository.

## 📊 Performance

This action is optimized for reliability and performance:

- **Sequential Processing**: Prevents overwhelming OSS with concurrent requests
- **Exponential Backoff**: Smart retry logic for transient failures
- **Memory Efficient**: Streams files without loading into memory
- **Progress Tracking**: Real-time upload progress and statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [ali-oss](https://github.com/ali-sdk/ali-oss) SDK
- Powered by [GitHub Actions](https://github.com/features/actions)
- TypeScript tooling by [Vitest](https://vitest.dev/) and [ESLint](https://eslint.org/)

## 📞 Support

- 📖 [Documentation](https://github.com/diverger/gh-oss-helper/wiki)
- 🐛 [Issues](https://github.com/diverger/gh-oss-helper/issues)
- 💬 [Discussions](https://github.com/diverger/gh-oss-helper/discussions)
