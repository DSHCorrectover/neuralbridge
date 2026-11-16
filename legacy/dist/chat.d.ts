import { AsyncChatResult, CallOptions } from './types.js';
/**
 * Top-level Chat function. Auto-detects providers from environment variables.
 *
 * @param message The prompt to send.
 * @param options Optional call options (model, temperature, etc.)
 * @returns The response text.
 */
export declare function Chat(message: string, options?: CallOptions): Promise<string>;
/**
 * Async variant — returns a Promise that resolves to AsyncChatResult.
 */
export declare function ChatAsync(message: string, options?: CallOptions): Promise<AsyncChatResult>;
/**
 * Chat with a built-in timeout.
 */
export declare function ChatWithTimeout(message: string, timeoutMs: number, options?: CallOptions): Promise<string>;
//# sourceMappingURL=chat.d.ts.map