# Release Notes Archive

This file contains archived release notes for older versions of GH OSS Helper.

---

## ✨ What's New

- **Debug Mode**: Added `enable-debug` input for verbose logging without requiring `ACTIONS_STEP_DEBUG`
- Enhanced debug logging throughout the upload process for better troubleshooting
- Added `isDebugEnabled()` and `logDebug()` utility functions for improved debugging experience

## 🔧 Changes

- **Improved Directory Logic**: Refactored directory pattern conversion logic in uploader
- **Better Error Handling**: Enhanced error handling for specific files vs glob patterns
- **Enhanced Logging**: Improved debug logging and messaging in GitHub Actions

## 🐛 Bug Fixes

- **Critical Fix**: Resolved `ENOTDIR` error when uploading single files (like ZIP files) to directory destinations
- Fixed handling of single file uploads to directory paths by properly using basename for remote path
- Improved file existence checking before glob pattern conversion
- Prevented treating ZIP files as directories when destination ends with '/'

## ⚠️ Breaking Changes

None in this release.

## 📖 Usage Examples

### Basic Upload
```yaml
- name: Upload to OSS
  uses: your-username/gh-oss-helper@v1.0.4
  with:
    region: 'oss-cn-hangzhou'
    access-key: ${{ secrets.OSS_ACCESS_KEY }}
    secret-key: ${{ secrets.OSS_SECRET_KEY }}
    bucket: 'my-bucket'
    assets: |
      dist/:website/
      README.md:docs/readme.md
```

## 🔗 Full Changelog

**Full Changelog**: https://github.com/your-username/gh-oss-helper/compare/v1.0.3...v1.0.4

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*

---

## 🔧 Changes

- Updated release workflow to use `softprops/action-gh-release@v1` for better release management
- Improved manual test workflow with comprehensive test scenarios including large file uploads
- Enhanced logging output with better formatting and progress indicators


## 📖 Usage Examples

### Basic Upload
```yaml
- name: Upload to OSS
  uses: diverger/gh-oss-helper@v1.0.3
  with:
    region: 'oss-cn-hangzhou'
    access-key: ${{ secrets.OSS_ACCESS_KEY }}
    secret-key: ${{ secrets.OSS_SECRET_KEY }}
    bucket: 'my-bucket'
    assets: |
      dist/:website/
      README.md:docs/readme.md
```

### Advanced Wildcard Usage
```yaml
- name: Upload with wildcards
  uses: diverger/gh-oss-helper@v1.0.3
  with:
    region: 'oss-cn-hangzhou'
    access-key: ${{ secrets.OSS_ACCESS_KEY }}
    secret-key: ${{ secrets.OSS_SECRET_KEY }}
    bucket: 'my-bucket'
    assets: |
      output/debs***:packages/
      src/**/*.js:scripts/
      docs/**/*.md:documentation/
```

## 🔗 Full Changelog

**Full Changelog**: https://github.com/diverger/gh-oss-helper/compare/v1.0.2...v1.0.3

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*

---

## 🔧 Bug Fixes

- Fixed release workflow automation issues
- Resolved build artifacts cleanup

## 🛠️ Improvements

- Updated release workflow to properly handle GitHub release creation
- Enhanced error handling in release pipeline

## 🔗 Full Changelog

**Full Changelog**: https://github.com/diverger/gh-oss-helper/compare/v1.0.1...v1.0.2

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*

---


## 🔧 Changes
- Fixes issue with release workflow

## 🔗 Full Changelog

**Full Changelog**: https://github.com/your-username/gh-oss-helper/compare/v1.0.0...v1.0.1

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*

---

## ✨ What's New

- **Complete GitHub Action for Alibaba Cloud OSS uploads** with TypeScript implementation
- **Advanced retry logic** with exponential backoff and configurable retry policies
- **Comprehensive file upload support** including single files, multiple files, and directory uploads
- **Robust error handling** with detailed logging and failure reporting
- **Flexible configuration options** including gzip compression, public-read ACL, and custom headers
- **Real-time upload statistics** with success rates, file counts, and transfer speeds
- **Production-ready testing suite** with unit tests, integration tests, and action tests

## 📖 Usage Examples

### Basic Upload
```yaml
- name: Upload to OSS
  uses: diverger/gh-oss-helper@v1.0.0
  with:
    region: 'oss-cn-hangzhou'
    access-key: ${{ secrets.OSS_ACCESS_KEY }}
    secret-key: ${{ secrets.OSS_SECRET_KEY }}
    bucket: 'my-bucket'
    assets: |
      dist/:website/
      README.md:docs/readme.md
```

## 🔗 Full Changelog

**Full Changelog**: https://github.com/your-username/gh-oss-helper/compare/[PREVIOUS]...v1.0.0

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*

---

## ✨ What's New

### 🏗️ **Modern Build System**
- **Single bundled output**: Now uses `dist/index.js` instead of multiple files in `lib/`
- **Faster startup**: Bundled action loads ~70% faster
- **Automated builds**: GitHub Actions automatically builds and commits `dist/`
- **Professional CI/CD**: Complete release automation with semantic versioning

### 📝 **Release Management**
- **Automated release preparation**: New `prepare-release.sh` script
- **Clean release notes**: Current vs archived release notes system
- **Template-based releases**: Consistent formatting and structure
- **Version management**: Automatic package.json updates

### 🔧 **Developer Experience**
- **Enhanced build script**: `./build.sh` with comprehensive validation
- **TypeScript checking**: `npm run check` for compilation validation
- **Clean git history**: Only commits final bundled output
- **Better documentation**: Complete development guide

## 🔧 Changes

### **Build System Migration**
- **BREAKING**: Action now uses `dist/index.js` instead of `lib/index.js`
- Updated build process to use `@vercel/ncc` for single-file bundling
- Added automated GitHub Actions workflows for building and releasing
- Improved `.gitignore` to exclude `lib/` and include `dist/`

### **Development Workflow**
- Added `prepare-release.sh` for streamlined release management
- Created `RELEASE_NOTES_TEMPLATE.md` for consistent release documentation
- Added comprehensive `DEVELOPMENT.md` guide
- Improved TypeScript compilation checking

## 🐛 Bug Fixes

- Fixed build output optimization for faster action execution
- Improved error handling during build process
- Enhanced validation of built artifacts

## 📋 Migration Guide

### For Users
**No changes required** - the action interface remains the same:

```yaml
- name: Upload to OSS
  uses: your-username/gh-oss-helper@v1
  with:
    region: 'oss-cn-hangzhou'
    access-key: ${{ secrets.OSS_ACCESS_KEY }}
    secret-key: ${{ secrets.OSS_SECRET_KEY }}
    bucket: 'my-bucket'
    assets: |
      dist/:website/
      README.md:docs/readme.md
```

### For Contributors
1. **Update your workflow**: Use `./build.sh` instead of manual `npm run build`
2. **Use release script**: Run `./prepare-release.sh` for releases
3. **Check dist/ folder**: Verify `dist/index.js` exists after building

## 🧰 For Developers

### **New Scripts**
- `./build.sh` - Complete build with validation
- `./prepare-release.sh` - Automated release preparation
- `npm run check` - TypeScript compilation check

### **Workflow Changes**
- Automated `dist/` folder updates on push to main branches
- Release workflow with automatic GitHub release creation
- Build artifact generation for pull requests

## 📖 Usage Examples

### Basic Upload
```yaml
- name: Upload to OSS
  uses: your-username/gh-oss-helper@v1.0.0
  with:
    region: 'oss-cn-hangzhou'
    access-key: ${{ secrets.OSS_ACCESS_KEY }}
    secret-key: ${{ secrets.OSS_SECRET_KEY }}
    bucket: 'my-bucket'
    assets: |
      dist/:website/
      README.md:docs/readme.md
```

### Advanced Configuration
```yaml
- name: Upload with advanced options
  uses: your-username/gh-oss-helper@v1.0.0
  with:
    region: 'oss-cn-hangzhou'
    access-key: ${{ secrets.OSS_ACCESS_KEY }}
    secret-key: ${{ secrets.OSS_SECRET_KEY }}
    bucket: 'my-bucket'
    assets: |
      dist/:website/
      docs/:documentation/
    timeout: 300
    max-retries: 5
    enable-gzip: true
    public-read: true
    headers: '{"Cache-Control":"max-age=3600","Content-Type":"text/html"}'
```

## 🔗 Full Changelog

This is the initial release with the new build system migration.

---

*For future releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*
