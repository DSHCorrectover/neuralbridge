// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
import { FaultCategory } from './types.js';
/**
 * Diagnoser — classifies errors into fault categories.
 *
 * L1 boundary: identifies only, NEVER takes action.
 * Maps raw HTTP errors → structured Diagnosis with confidence.
 */
export class Diagnoser {
    /** Classify an error into a structured Diagnosis. */
    diagnose(error, statusCode) {
        const errMsg = this.normalizeError(error);
        // Check by status code first (most reliable)
        if (statusCode) {
            const fromStatus = this.diagnoseByStatus(statusCode, errMsg);
            if (fromStatus.confidence > 0.7)
                return fromStatus;
        }
        // Check by error message patterns
        return this.diagnoseByMessage(errMsg);
    }
    normalizeError(error) {
        if (error instanceof Error)
            return error.message;
        if (typeof error === 'string')
            return error;
        try {
            return JSON.stringify(error);
        }
        catch {
            return String(error);
        }
    }
    diagnoseByStatus(status, msg) {
        switch (status) {
            case 429:
                return this.make(FaultCategory.RATE_LIMIT, 0.95, true, true, 5.0, msg, 'rate_limit_exceeded');
            case 401:
            case 403:
                return this.make(FaultCategory.AUTH_ERROR, 0.98, false, true, 0, msg, 'auth_failed');
            case 404:
                if (msg.includes('model') || msg.includes('Model')) {
                    return this.make(FaultCategory.MODEL_NOT_FOUND, 0.95, true, false, 0, msg, 'model_not_found');
                }
                return this.make(FaultCategory.VALIDATION_ERROR, 0.6, true, false, 0, msg, 'not_found');
            case 408:
                return this.make(FaultCategory.TIMEOUT, 0.9, true, false, 2.0, msg, 'request_timeout');
            case 500:
            case 502:
            case 503:
                return this.make(FaultCategory.SERVER_ERROR, 0.8, true, true, 2.0, msg, 'server_error');
            case 400:
                if (msg.includes('quota') || msg.includes('Quota') || msg.includes('insufficient') || msg.includes('exceeded')) {
                    return this.make(FaultCategory.QUOTA_EXCEEDED, 0.9, true, true, 10.0, msg, 'quota_exceeded');
                }
                return this.make(FaultCategory.VALIDATION_ERROR, 0.7, true, false, 0, msg, 'bad_request');
            default:
                return this.make(FaultCategory.UNKNOWN, 0.3, true, false, 0, msg, `http_${status}`);
        }
    }
    diagnoseByMessage(msg) {
        const lower = msg.toLowerCase();
        // Rate limit patterns
        if (this.matchAny(lower, ['rate limit', 'too many requests', 'ratelimit', 'retry after'])) {
            return this.make(FaultCategory.RATE_LIMIT, 0.85, true, true, 5.0, msg, 'rate_limit_detected');
        }
        // Auth patterns
        if (this.matchAny(lower, ['unauthorized', 'invalid api key', 'authentication', 'permission denied',
            'access denied', '403', '401', 'invalid credentials', 'bad credentials'])) {
            return this.make(FaultCategory.AUTH_ERROR, 0.9, false, true, 0, msg, 'auth_detected');
        }
        // Model not found
        if (this.matchAny(lower, ['model not found', 'model_not_found', 'not found', 'does not exist',
            'not supported', 'unrecognized model', 'invalid model'])) {
            return this.make(FaultCategory.MODEL_NOT_FOUND, 0.8, true, false, 0, msg, 'model_not_found_detected');
        }
        // Timeout patterns
        if (this.matchAny(lower, ['timeout', 'timed out', 'deadline exceeded', 'request timed out'])) {
            return this.make(FaultCategory.TIMEOUT, 0.85, true, false, 2.0, msg, 'timeout_detected');
        }
        // Connection patterns
        if (this.matchAny(lower, ['econnrefused', 'econnreset', 'enotfound', 'network', 'dns',
            'socket hang up', 'fetch failed', 'unreachable'])) {
            return this.make(FaultCategory.CONNECTION_ERROR, 0.85, true, true, 3.0, msg, 'connection_error');
        }
        // Quota patterns
        if (this.matchAny(lower, ['quota', 'insufficient_quota', 'exceeded', 'limit reached',
            'out of credits', 'billing', 'payment required', '429'])) {
            return this.make(FaultCategory.QUOTA_EXCEEDED, 0.75, true, true, 10.0, msg, 'quota_detected');
        }
        // Server error patterns
        if (this.matchAny(lower, ['internal server', 'service unavailable', 'bad gateway',
            'overloaded', 'temporary', 'try again', 'retry', 'backoff'])) {
            return this.make(FaultCategory.SERVER_ERROR, 0.7, true, true, 2.0, msg, 'server_error_detected');
        }
        // Validation patterns
        if (this.matchAny(lower, ['validation', 'invalid', 'malformed', 'missing required',
            'bad request', 'input should be', 'value error'])) {
            return this.make(FaultCategory.VALIDATION_ERROR, 0.6, false, false, 0, msg, 'validation_detected');
        }
        return this.make(FaultCategory.UNKNOWN, 0.3, true, false, 0, msg, 'unclassified');
    }
    matchAny(text, patterns) {
        return patterns.some((p) => text.includes(p));
    }
    make(category, confidence, shouldRetry, skipToFailover, retryAfter, rawError, subCategory) {
        return {
            category,
            confidence,
            shouldRetry,
            skipToFailover,
            retryAfter,
            rawError,
            subCategory,
        };
    }
}
//# sourceMappingURL=diagnoser.js.map