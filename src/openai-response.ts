import { FALLBACK_TAG, canonicalizeAssignment } from "./tagging";

export interface TagAssignment {
  tag: string;
  reason: string;
}

export function extractResponseText(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const candidate = response as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };

  if (typeof candidate.output_text === "string") return candidate.output_text;

  for (const output of candidate.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

export function parseTagAssignment(
  response: unknown,
  allowedTags: string[]
): TagAssignment {
  const text = extractResponseText(response);
  if (!text) throw new Error("OpenAI returned no classification text.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OpenAI returned an unreadable classification.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI returned an invalid classification.");
  }

  const record = parsed as Record<string, unknown>;
  const proposed = typeof record.tag === "string" ? record.tag : FALLBACK_TAG;
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";

  return {
    tag: canonicalizeAssignment(proposed, allowedTags),
    reason,
  };
}

