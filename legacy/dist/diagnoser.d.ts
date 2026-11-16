import { Diagnosis } from './types.js';
/**
 * Diagnoser — classifies errors into fault categories.
 *
 * L1 boundary: identifies only, NEVER takes action.
 * Maps raw HTTP errors → structured Diagnosis with confidence.
 */
export declare class Diagnoser {
    /** Classify an error into a structured Diagnosis. */
    diagnose(error: unknown, statusCode?: number): Diagnosis;
    private normalizeError;
    private diagnoseByStatus;
    private diagnoseByMessage;
    private matchAny;
    private make;
}
//# sourceMappingURL=diagnoser.d.ts.map