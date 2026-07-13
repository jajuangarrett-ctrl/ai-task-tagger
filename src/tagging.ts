export const FALLBACK_TAG = "unassigned";

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#+/, "");
}

export function normalizeVaultTags(rawTags: Iterable<string>): string[] {
  const canonical = new Map<string, string>();

  for (const rawTag of rawTags) {
    const tag = normalizeTag(rawTag);
    if (!tag || tag.toLocaleLowerCase() === FALLBACK_TAG) continue;
    const key = tag.toLocaleLowerCase();
    if (!canonical.has(key)) canonical.set(key, tag);
  }

  return [...canonical.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function frontmatterTagsToArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(normalizeTag)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map(normalizeTag)
      .filter(Boolean);
  }

  return [];
}

export function mergeAssignedTag(existingTags: string[], assignedTag: string): string[] {
  const assigned = normalizeTag(assignedTag) || FALLBACK_TAG;
  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of existingTags) {
    const tag = normalizeTag(rawTag);
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (assigned.toLocaleLowerCase() !== FALLBACK_TAG && key === FALLBACK_TAG) continue;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(tag);
    }
  }

  const assignedKey = assigned.toLocaleLowerCase();
  if (!seen.has(assignedKey)) result.push(assigned);
  return result;
}

export function canonicalizeAssignment(
  proposedTag: string,
  allowedTags: string[]
): string {
  const normalized = normalizeTag(proposedTag);
  if (normalized.toLocaleLowerCase() === FALLBACK_TAG) return FALLBACK_TAG;

  const allowed = allowedTags.find(
    (tag) => tag.toLocaleLowerCase() === normalized.toLocaleLowerCase()
  );
  return allowed ?? FALLBACK_TAG;
}

export function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown.trim();
  const match = markdown.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  return (match ? markdown.slice(match[0].length) : markdown).trim();
}

export function truncateNote(markdown: string, maxCharacters: number): string {
  if (markdown.length <= maxCharacters) return markdown;
  const marker = "\n\n[... middle of note omitted ...]\n\n";
  const available = Math.max(0, maxCharacters - marker.length);
  const beginning = Math.ceil(available * 0.75);
  const end = available - beginning;
  return `${markdown.slice(0, beginning)}${marker}${markdown.slice(markdown.length - end)}`;
}

