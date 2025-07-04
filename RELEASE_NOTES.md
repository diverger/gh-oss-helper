# 🚀 GH OSS Helper Release v1.0.4

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
