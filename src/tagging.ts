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

export function mergeAssignedTags(existingTags: string[], assignedTags: string[]): string[] {
  const assignments = assignedTags
    .map((tag) => normalizeTag(tag) || FALLBACK_TAG)
    .filter((tag, index, all) =>
      all.findIndex((candidate) => candidate.toLocaleLowerCase() === tag.toLocaleLowerCase()) === index
    );
  const hasRealAssignment = assignments.some(
    (tag) => tag.toLocaleLowerCase() !== FALLBACK_TAG
  );
  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of existingTags) {
    const tag = normalizeTag(rawTag);
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (hasRealAssignment && key === FALLBACK_TAG) continue;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(tag);
    }
  }

  for (const assigned of assignments) {
    const assignedKey = assigned.toLocaleLowerCase();
    if (hasRealAssignment && assignedKey === FALLBACK_TAG) continue;
    if (!seen.has(assignedKey)) {
      seen.add(assignedKey);
      result.push(assigned);
    }
  }

  if (assignments.length === 0 && !seen.has(FALLBACK_TAG)) result.push(FALLBACK_TAG);
  return result;
}

export function resolveAllowedTag(
  proposedTag: string,
  allowedTags: string[]
): string | null {
  const normalized = normalizeTag(proposedTag);
  if (normalized.toLocaleLowerCase() === FALLBACK_TAG) return FALLBACK_TAG;
  return allowedTags.find(
    (tag) => tag.toLocaleLowerCase() === normalized.toLocaleLowerCase()
  ) ?? null;
}

export function canonicalizeAssignment(
  proposedTag: string,
  allowedTags: string[]
): string {
  return resolveAllowedTag(proposedTag, allowedTags) ?? FALLBACK_TAG;
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
