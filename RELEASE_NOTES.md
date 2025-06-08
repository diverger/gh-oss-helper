# 🚀 GH OSS Helper Release v1.0.0

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
