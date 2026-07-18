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

export function extractFrontmatterFolderTags(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return [];
  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---"
  );
  if (closingIndex === -1) return [];

  for (let index = 1; index < closingIndex; index += 1) {
    const match = lines[index].match(/^tags:\s*(.*)$/);
    if (!match) continue;
    const value = match[1].trim();
    if (!value || value === "[]") {
      const blockTags: string[] = [];
      for (let child = index + 1; child < closingIndex; child += 1) {
        const childMatch = lines[child].match(/^\s+-\s+(.+?)\s*$/);
        if (!childMatch) break;
        blockTags.push(childMatch[1].replace(/^['"]|['"]$/g, ""));
      }
      return normalizeExistingFolderTags(blockTags);
    }

    const values = value.startsWith("[") && value.endsWith("]")
      ? value.slice(1, -1).split(",")
      : [value];
    return normalizeExistingFolderTags(
      values.map((tag) => tag.trim().replace(/^['"]|['"]$/g, ""))
    );
  }

  return [];
}
