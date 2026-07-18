import { PROGRAM_TAG_RULES } from "./programs";
import { FALLBACK_TAG, normalizeTag, resolveAllowedTag } from "./tagging";

export function getApprovedProgramTags(): string[] {
  return PROGRAM_TAG_RULES.map((rule) => rule.tag);
}

export function selectApprovedProgramTag(tags: string[]): string | null {
  const approvedTags = getApprovedProgramTags();

  for (const tag of tags) {
    if (tag.toLocaleLowerCase() === FALLBACK_TAG) continue;
    const approved = resolveAllowedTag(tag, approvedTags);
    if (approved) return approved;
  }

  return null;
}

export function isApprovedProgramTag(tag: string): boolean {
  return resolveAllowedTag(tag, getApprovedProgramTags()) !== null;
}

export function normalizeExistingFolderTags(rawTags: Iterable<string>): string[] {
  const tags = new Map<string, string>();

  for (const rawTag of rawTags) {
    const tag = normalizeTag(rawTag);
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (!tags.has(key)) tags.set(key, tag);
  }

  return [...tags.values()];
}
