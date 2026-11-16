/**
 * Checkpoint — Agent workflow state persistence.
 *
 * Captures execution state at points in an agent workflow,
 * enabling crash recovery and multi-step agent orchestration.
 */
import { CheckpointData, StepResult } from './types.js';
export type { CheckpointData, StepResult };
/**
 * AgentSession — manages a checkpointed agent workflow session.
 */
export declare class AgentSession {
    readonly sessionId: string;
    private checkpoints;
    private storageDir?;
    constructor(sessionId?: string, storageDir?: string);
    /** Create a new checkpoint. */
    checkpoint(stepIndex: number, state: Record<string, unknown>, metadata?: Record<string, string>): CheckpointData;
    /** Get the latest checkpoint for a given step index. */
    getLatest(stepIndex?: number): CheckpointData | undefined;
    /** Get all checkpoints for the session. */
    getAll(): CheckpointData[];
    /** Get checkpoints for a specific step. */
    getByStep(stepIndex: number): CheckpointData[];
    /** Create a step result from a checkpoint. */
    createStepResult(stepIndex: number, output: string, latencyMs: number): StepResult;
    /** Restore state from the latest checkpoint. */
    restore(): {
        state: Record<string, unknown>;
        stepIndex: number;
    } | null;
    private getStoragePath;
    private saveToDisk;
    private loadFromDisk;
    /** Clear all checkpoints for this session (both in-memory and disk). */
    clear(): void;
}
//# sourceMappingURL=checkpoint.d.ts.map