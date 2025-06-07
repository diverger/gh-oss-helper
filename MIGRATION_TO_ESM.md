# Migration to ESM Guide

## Why ESM is Better Long-term

### ✅ Advantages of ESM
- **Modern Standard**: Native support in browsers and Node.js
- **Better Performance**: Static analysis enables tree-shaking and optimization
- **Cleaner Syntax**: `import/export` is more readable than `require()`
- **Future-proof**: The direction the ecosystem is moving
- **Better TypeScript Integration**: More natural type imports

### ❌ Challenges for GitHub Actions
- **Bundling Complexity**: `@vercel/ncc` works better with CommonJS
- **Ecosystem**: Some dependencies still prefer CommonJS
- **Runtime Environment**: GitHub Actions runner expectations

## How to Convert to ESM

### 1. Update package.json
```json
{
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js"
  }
}
```

### 2. Update tsconfig.json
```json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "node",
    "target": "ES2022"
  }
}
```

### 3. Update imports/exports
```typescript
// Instead of:
const core = require('@actions/core');
module.exports = { run };

// Use:
import * as core from '@actions/core';
export { run };
```

### 4. Update file extensions
- Rename `.js` files to `.mjs` or add `"type": "module"`
- Update import paths to include extensions: `./utils.js`

### 5. Handle CommonJS dependencies
```typescript
// For CommonJS modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const someCommonJSModule = require('some-package');
```

## Recommendation

For this GitHub Action, **CommonJS is the pragmatic choice** because:
1. ✅ Simpler bundling and distribution
2. ✅ Better ecosystem compatibility
3. ✅ Standard pattern for GitHub Actions
4. ✅ Fewer configuration headaches

For new standalone Node.js projects, **ESM is preferred**.
