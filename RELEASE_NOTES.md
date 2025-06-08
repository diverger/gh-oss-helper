# 🚀 GH OSS Helper Release v1.0.3

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
