"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileNotFoundError = exports.NetworkError = exports.ValidationError = exports.OSSActionError = void 0;
class OSSActionError extends Error {
    code;
    statusCode;
    filePath;
    constructor(message, code, statusCode, filePath) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.filePath = filePath;
        this.name = 'OSSActionError';
    }
}
exports.OSSActionError = OSSActionError;
class ValidationError extends OSSActionError {
    constructor(message, _field) {
        super(`Validation Error: ${message}`, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NetworkError extends OSSActionError {
    constructor(message, statusCode) {
        super(`Network Error: ${message}`, 'NETWORK_ERROR', statusCode);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
class FileNotFoundError extends OSSActionError {
    constructor(filePath) {
        super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', undefined, filePath);
        this.name = 'FileNotFoundError';
    }
}
exports.FileNotFoundError = FileNotFoundError;
//# sourceMappingURL=types.js.map