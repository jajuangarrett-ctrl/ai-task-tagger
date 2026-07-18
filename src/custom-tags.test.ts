import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOM_TAG_DEFINITIONS,
  detectFolderMappedTag,
  getApprovedFolderTags,
  mergeCustomTagDefinition,
  normalizeManualTagName,
  sanitizeCustomTagDefinitions,
  selectApprovedFolderTag,
} from "./custom-tags";

describe("manually approved custom tags", () => {
  it("normalizes user-entered tag names for Obsidian", () => {
    expect(normalizeManualTagName("#Self Improvement")).toBe("self-improvement");
    expect(normalizeManualTagName("AI Agents / Design")).toBe("ai-agents/design");
    expect(normalizeManualTagName("12345")).toBeNull();
  });

  it("merges guidance and folder mappings without duplicates", () => {
    const merged = mergeCustomTagDefinition(
      [{ tag: "self-improvement", description: "Growth", folderPaths: [] }],
      {
        tag: "Self Improvement",
        description: "Personal growth and habits",
        folderPaths: ["03 Areas/Self Improvement", "03 Areas/Self Improvement/"],
      }
    );
    expect(merged).toEqual([{
      tag: "self-improvement",
      description: "Personal growth and habits",
      folderPaths: ["03 Areas/Self Improvement"],
    }]);
  });

  it("proposes the deepest manually mapped folder tag", () => {
    const definitions = [
      { tag: "self-improvement", description: "", folderPaths: ["03 Areas"] },
      { tag: "habits", description: "", folderPaths: ["03 Areas/Self Improvement/Habits"] },
    ];
    expect(detectFolderMappedTag(
      "03 Areas/Self Improvement/Habits/Morning.md",
      definitions
    )).toBe("habits");
  });

  it("adds only manually saved tags to the fixed program list", () => {
    const approved = getApprovedFolderTags([...DEFAULT_CUSTOM_TAG_DEFINITIONS]);
    expect(approved).toContain("calworks");
    expect(approved).toContain("self-improvement");
    expect(selectApprovedFolderTag(["self-improvement"], [...DEFAULT_CUSTOM_TAG_DEFINITIONS]))
      .toBe("self-improvement");
    expect(selectApprovedFolderTag(["invented"], [...DEFAULT_CUSTOM_TAG_DEFINITIONS]))
      .toBeNull();
  });

  it("drops malformed saved settings", () => {
    expect(sanitizeCustomTagDefinitions([
      { tag: "AI Agents", description: "Agent design", folderPaths: ["AI Team"] },
      { tag: "123", description: "Invalid", folderPaths: [] },
      null,
    ])).toEqual([{
      tag: "ai-agents",
      description: "Agent design",
      folderPaths: ["AI Team"],
    }]);
  });
});
