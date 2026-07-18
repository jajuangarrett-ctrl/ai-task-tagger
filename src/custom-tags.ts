import { PROGRAM_TAG_RULES } from "./programs";
import { normalizeTag, resolveAllowedTag } from "./tagging";

export interface CustomTagDefinition {
  tag: string;
  description: string;
  folderPaths: string[];
}

export const DEFAULT_CUSTOM_TAG_DEFINITIONS: readonly CustomTagDefinition[] = [
  {
    tag: "self-improvement",
    description: "Personal growth, habits, mindset, reflection, wellbeing, and self-development.",
    folderPaths: ["03 Areas/Self Improvement"],
  },
];

export function normalizeManualTagName(value: string): string | null {
  const normalized = normalizeTag(value)
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_/-]+/g, "-")
    .replace(/-+/g, "-")
    .split("/")
    .map((part) => part.replace(/^[-_]+|[-_]+$/g, ""))
    .filter(Boolean)
    .join("/");

  if (!normalized || /^\d+$/.test(normalized)) return null;
  return normalized;
}

export function normalizeFolderPath(value: string): string {
  return value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export function sanitizeCustomTagDefinitions(value: unknown): CustomTagDefinition[] {
  if (!Array.isArray(value)) return [];

  let result: CustomTagDefinition[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const rawTag = typeof record.tag === "string" ? record.tag : "";
    const tag = normalizeManualTagName(rawTag);
    if (!tag) continue;
    const description = typeof record.description === "string"
      ? record.description.trim()
      : "";
    const folderPaths = Array.isArray(record.folderPaths)
      ? record.folderPaths
          .filter((path): path is string => typeof path === "string")
          .map(normalizeFolderPath)
          .filter(Boolean)
      : [];
    result = mergeCustomTagDefinition(result, { tag, description, folderPaths });
  }

  return result;
}

export function mergeCustomTagDefinition(
  definitions: CustomTagDefinition[],
  candidate: CustomTagDefinition
): CustomTagDefinition[] {
  const tag = normalizeManualTagName(candidate.tag);
  if (!tag) return [...definitions];

  const normalizedCandidate: CustomTagDefinition = {
    tag,
    description: candidate.description.trim(),
    folderPaths: [...new Set(candidate.folderPaths.map(normalizeFolderPath).filter(Boolean))],
  };
  const existingIndex = definitions.findIndex(
    (definition) => definition.tag.toLocaleLowerCase() === tag.toLocaleLowerCase()
  );
  if (existingIndex === -1) return [...definitions, normalizedCandidate];

  const existing = definitions[existingIndex];
  const merged = {
    tag: existing.tag,
    description: normalizedCandidate.description || existing.description,
    folderPaths: [...new Set([...existing.folderPaths, ...normalizedCandidate.folderPaths])],
  };
  return definitions.map((definition, index) => index === existingIndex ? merged : definition);
}

export function getApprovedFolderTags(
  customDefinitions: CustomTagDefinition[]
): string[] {
  const tags = PROGRAM_TAG_RULES.map((rule) => rule.tag);
  for (const definition of customDefinitions) {
    if (!resolveAllowedTag(definition.tag, tags)) tags.push(definition.tag);
  }
  return tags;
}

export function resolveApprovedFolderTag(
  proposedTag: string,
  customDefinitions: CustomTagDefinition[]
): string | null {
  return resolveAllowedTag(proposedTag, getApprovedFolderTags(customDefinitions));
}

export function selectApprovedFolderTag(
  proposedTags: string[],
  customDefinitions: CustomTagDefinition[]
): string | null {
  for (const tag of proposedTags) {
    if (tag.toLocaleLowerCase() === "unassigned") continue;
    const approved = resolveApprovedFolderTag(tag, customDefinitions);
    if (approved) return approved;
  }
  return null;
}

export function detectFolderMappedTag(
  filePath: string,
  customDefinitions: CustomTagDefinition[]
): string | null {
  const normalizedFilePath = normalizeFolderPath(filePath).toLocaleLowerCase();
  const matches = customDefinitions.flatMap((definition) =>
    definition.folderPaths.map((folderPath) => ({
      tag: definition.tag,
      folderPath: normalizeFolderPath(folderPath),
    }))
  ).filter(({ folderPath }) => {
    const normalizedFolder = folderPath.toLocaleLowerCase();
    return normalizedFolder.length > 0 && (
      normalizedFilePath === normalizedFolder ||
      normalizedFilePath.startsWith(`${normalizedFolder}/`)
    );
  }).sort((a, b) => b.folderPath.length - a.folderPath.length);

  return matches[0]?.tag ?? null;
}
