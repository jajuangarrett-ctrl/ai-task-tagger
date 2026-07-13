import { FALLBACK_TAG, resolveAllowedTag } from "./tagging";

export interface TagAssignment {
  tags: string[];
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
  allowedTags: string[],
  forcedProgramTag: string | null = null
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
  const proposed = Array.isArray(record.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === "string")
    : typeof record.tag === "string"
      ? [record.tag]
      : [];
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";

  const validTags: string[] = [];
  for (const proposedTag of proposed) {
    const allowed = resolveAllowedTag(proposedTag, allowedTags);
    if (!allowed) continue;
    if (!validTags.some((tag) => tag.toLocaleLowerCase() === allowed.toLocaleLowerCase())) {
      validTags.push(allowed);
    }
  }

  const realTags = validTags.filter(
    (tag) => tag.toLocaleLowerCase() !== FALLBACK_TAG
  );
  const forced = forcedProgramTag
    ? resolveAllowedTag(forcedProgramTag, allowedTags)
    : null;

  const tags: string[] = [];
  if (forced && forced.toLocaleLowerCase() !== FALLBACK_TAG) tags.push(forced);
  for (const tag of realTags) {
    if (tags.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) continue;
    tags.push(tag);
    if (tags.length === 2) break;
  }
  if (tags.length === 0) tags.push(FALLBACK_TAG);

  return {
    tags,
    reason,
  };
}
