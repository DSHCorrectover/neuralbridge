// Copyright 2024-2026 NeuralBridge Team
// Licensed under the Apache License, Version 2.0 (the "License")
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
/**
 * AgentSession — manages a checkpointed agent workflow session.
 */
export class AgentSession {
    sessionId;
    checkpoints = [];
    storageDir;
    constructor(sessionId, storageDir) {
        this.sessionId = sessionId ?? crypto.randomUUID();
        this.storageDir = storageDir;
        // Load existing checkpoints if storage dir provided
        if (this.storageDir) {
            this.loadFromDisk();
        }
    }
    /** Create a new checkpoint. */
    checkpoint(stepIndex, state, metadata) {
        const cp = {
            id: crypto.randomUUID(),
            sessionId: this.sessionId,
            stepIndex,
            state,
            createdAt: Date.now(),
            metadata,
        };
        this.checkpoints.push(cp);
        // Persist to disk if storage configured
        if (this.storageDir) {
            this.saveToDisk(cp);
        }
        return cp;
    }
    /** Get the latest checkpoint for a given step index. */
    getLatest(stepIndex) {
        if (stepIndex !== undefined) {
            return this.checkpoints
                .filter((cp) => cp.stepIndex === stepIndex)
                .sort((a, b) => b.createdAt - a.createdAt)[0];
        }
        return this.checkpoints
            .sort((a, b) => b.createdAt - a.createdAt)[0];
    }
    /** Get all checkpoints for the session. */
    getAll() {
        return [...this.checkpoints];
    }
    /** Get checkpoints for a specific step. */
    getByStep(stepIndex) {
        return this.checkpoints
            .filter((cp) => cp.stepIndex === stepIndex)
            .sort((a, b) => a.createdAt - b.createdAt);
    }
    /** Create a step result from a checkpoint. */
    createStepResult(stepIndex, output, latencyMs) {
        const cp = this.checkpoint(stepIndex, { output });
        return {
            stepIndex,
            output,
            checkpoint: cp,
            latencyMs,
        };
    }
    /** Restore state from the latest checkpoint. */
    restore() {
        const latest = this.getLatest();
        if (!latest)
            return null;
        return {
            state: latest.state,
            stepIndex: latest.stepIndex,
        };
    }
    // ── Disk Persistence ────────────────────────────────────
    getStoragePath() {
        if (!this.storageDir)
            return '';
        return path.join(this.storageDir, `session-${this.sessionId}.json`);
    }
    saveToDisk(cp) {
        try {
            const storagePath = this.getStoragePath();
            if (!storagePath)
                return;
            fs.mkdirSync(path.dirname(storagePath), { recursive: true });
            let existing = [];
            if (fs.existsSync(storagePath)) {
                existing = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            }
            existing.push(cp);
            fs.writeFileSync(storagePath, JSON.stringify(existing, null, 2));
        }
        catch {
            // Silently fail — checkpoints are best-effort
        }
    }
    loadFromDisk() {
        try {
            const storagePath = this.getStoragePath();
            if (!storagePath || !fs.existsSync(storagePath))
                return;
            const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
            this.checkpoints.push(...data);
        }
        catch {
            // Silently fail
        }
    }
    /** Clear all checkpoints for this session (both in-memory and disk). */
    clear() {
        this.checkpoints = [];
        try {
            const storagePath = this.getStoragePath();
            if (storagePath && fs.existsSync(storagePath)) {
                fs.unlinkSync(storagePath);
            }
        }
        catch {
            // Silently fail
        }
    }
}
//# sourceMappingURL=checkpoint.js.map