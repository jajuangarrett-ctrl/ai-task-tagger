import { PROGRAM_TAG_RULES } from "./programs";
import { FALLBACK_TAG, resolveAllowedTag } from "./tagging";

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
