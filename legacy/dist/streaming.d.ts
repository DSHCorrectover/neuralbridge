/**
 * Streaming — real-time streaming support for LLM responses.
 * Parses Server-Sent Events (SSE) from OpenAI-compatible streaming endpoints.
 */
import { Provider } from './provider.js';
import { CallOptions, ChatMessage, StreamChunk } from './types.js';
/**
 * Stream an LLM call, yielding chunks as they arrive.
 */
export declare function streamCall(provider: Provider, messages: ChatMessage[], options: CallOptions): AsyncGenerator<StreamChunk>;
//# sourceMappingURL=streaming.d.ts.map