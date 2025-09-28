export {}; // ensure this file is treated as a module

declare global {
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = any>(): Promise<T | null>;
    run<T = any>(): Promise<T>;
    all<T = any>(): Promise<{ results: T[] }>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    dump(): Promise<ArrayBuffer>;
  }

  interface KVNamespace {
    get<T = any>(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer'; cacheTtl?: number }): Promise<T | null>;
    put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: { expiration?: number; expirationTtl?: number; metadata?: any }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string; expiration?: number; metadata?: any }>; list_complete: boolean; cursor?: string }>;
  }

  interface R2ObjectBody {
    body: ReadableStream<Uint8Array> | null;
    bodyUsed: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    json<T = any>(): Promise<T>;
  }

  interface R2Object extends R2ObjectBody {
    key: string;
    size: number;
    version: string;
    uploaded: string;
    httpEtag: string;
    checksums?: Record<string, string>;
  }

  interface R2Bucket {
    get(key: string): Promise<R2Object | null>;
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string, options?: { httpMetadata?: Record<string, any>; customMetadata?: Record<string, string> }): Promise<R2Object>;
    delete(key: string): Promise<void>;
  }

  interface EventContext<Env = any, Params = Record<string, string>, Data = unknown> {
    request: Request;
    env: Env;
    params: Params;
    data: Data;
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}
