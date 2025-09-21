# 🚀 GH OSS Helper Release v1.0.5

## 🔧 Changes

- npm devDependencies
  - `@eslint/js`: `^9.15.0` → `^9.35.0`
  - `@types/node`: `^22.15.0` → `^24.4.0`
  - `@typescript-eslint/eslint-plugin`: `^8.33.0` → `^8.43.0`
  - `@typescript-eslint/parser`: `^8.33.0` → `^8.43.0`
  - `@vitest/coverage-v8`: `^3.2.0` → `^3.2.4`
  - `eslint`: `^9.15.0` → `^9.35.0`
  - `tsx`: `^4.19.4` → `^4.20.3`
  - `vitest`: `^3.2.0` → `^3.2.4`

- GitHub Actions versions used in workflows
  - `actions/checkout`: `@v4` → `@v5`
  - `actions/setup-node`: `@v4` → `@v5`
  - `codecov/codecov-action`: `@v4` → `@v5`
  - `softprops/action-gh-release`: `@v1` → `@v2`

## 📖 Usage Examples

### Basic Upload

```yaml
- name: Upload to OSS
  uses: diverger/gh-oss-helper@v1.0.5
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

**Full Changelog**: https://github.com/diverger/gh-oss-helper/compare/v1.0.4...v1.0.5

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*
