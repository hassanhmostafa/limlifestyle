import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithBackoff } from "./_core/llm";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("LLM response deadlines", () => {
  it("keeps the deadline active when headers arrive but the body never completes", async () => {
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => {
            controller.error(new DOMException("deadline", "AbortError"));
          }, { once: true });
          // Intentionally send neither a chunk nor close: headers arrived, body hangs.
        },
      });
      return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    await expect(
      fetchWithBackoff("https://example.invalid/models", { headers: {} }, 20)
    ).rejects.toThrow("LLM request deadline exceeded");
  });
});
