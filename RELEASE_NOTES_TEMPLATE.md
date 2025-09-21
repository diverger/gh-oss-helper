# 🚀 GH OSS Helper Release [VERSION]

## ✨ What's New

<!-- Describe new features and improvements -->

## 🔧 Changes

<!-- List important changes -->

## 🐛 Bug Fixes

<!-- List bug fixes -->

## ⚠️ Breaking Changes

<!-- List any breaking changes (if any) -->

## 📋 Migration Guide

<!-- Include migration instructions for breaking changes (if needed) -->

## 🧰 For Developers

<!-- Changes relevant to contributors -->

## 📖 Usage Examples

### Basic Upload
```yaml
- name: Upload to OSS
  uses: diverger/gh-oss-helper@[VERSION]
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

**Full Changelog**: https://github.com/diverger/gh-oss-helper/compare/[PREVIOUS]...[VERSION]

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*
