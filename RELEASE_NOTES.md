# 🚀 GH OSS Helper Release v2.0.0

## ✨ What's New

### Node.js 24 & ESM Support
- **Upgraded to Node.js 24 runtime** - Leveraging the latest Node.js features and performance improvements
- **Full ESM (ECMAScript Modules) migration** - Modern module system with better tree-shaking and optimization
- **Modernized bundling with tsup** - Reduced bundle size from ~73MB to ~6MB (90% reduction!)
- **Enhanced build process** - Faster builds with source maps and optimized output

## 🔧 Changes

- **Runtime**: Updated from Node.js 20 to Node.js 24
- **Module System**: Migrated from CommonJS to ESM
- **Bundler**: Switched from TypeScript compiler to tsup for better optimization
- **Dependencies**: Updated all dev dependencies to latest versions supporting Node 24
- **CI Actions**: Upgraded `actions/checkout` to v5, `actions/setup-node` to v5
- **Build Output**: Changed from `dist/index.js` to `dist/index.mjs` (ESM format)
- **Type System**: Enhanced TypeScript configuration for ESM and modern Node.js

## 📖 Usage Examples

### Basic Upload (No changes to usage!)
```yaml
- name: Upload to OSS
  uses: diverger/gh-oss-helper@v2.0.0
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

**Full Changelog**: https://github.com/diverger/gh-oss-helper/compare/v1.0.5...v2.0.0

---

*For older releases, see [RELEASE_NOTES_ARCHIVE.md](RELEASE_NOTES_ARCHIVE.md)*
