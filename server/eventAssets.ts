import type { Request, Response } from "express";
import { storageGet } from "./storage";

/**
 * The mobile Events page loads anatomy images through the LIM origin instead of
 * relying on a browser to follow a signed cross-origin storage redirect. This
 * is particularly important for Safari/PWA contexts, where the redirect was
 * intermittently rendered as a broken image.
 */
export const EVENT_ANATOMY_STORAGE_KEYS = {
  muscle: "body-muscle-v2_e7ba4c5c.png",
  fat: "body-fat-v2_1aa1b2ff.png",
} as const;

export type EventAnatomyKind = keyof typeof EVENT_ANATOMY_STORAGE_KEYS;

export function eventAnatomyStorageKey(kind: string): string | null {
  return Object.prototype.hasOwnProperty.call(EVENT_ANATOMY_STORAGE_KEYS, kind)
    ? EVENT_ANATOMY_STORAGE_KEYS[kind as EventAnatomyKind]
    : null;
}

export async function handleEventAnatomyAsset(req: Request, res: Response) {
  const key = eventAnatomyStorageKey(req.params.kind);
  if (!key) {
    res.status(404).json({ error: "Unknown Events anatomy asset." });
    return;
  }

  try {
    const { url } = await storageGet(key);
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(502).json({ error: "Unable to load Events anatomy asset." });
      return;
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/png");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(buffer);
  } catch (error) {
    console.error("[Events assets] Failed to proxy anatomy image:", error);
    res.status(502).json({ error: "Unable to load Events anatomy asset." });
  }
}
