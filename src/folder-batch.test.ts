import { describe, expect, it } from "vitest";
import {
  extractFrontmatterFolderTags,
  getApprovedProgramTags,
  isApprovedProgramTag,
  normalizeExistingFolderTags,
  selectApprovedProgramTag,
} from "./folder-batch";

describe("folder batch tag policy", () => {
  it("uses only the 17 approved program tags", () => {
    expect(getApprovedProgramTags()).toHaveLength(17);
    expect(getApprovedProgramTags()).toContain("basic-needs");
    expect(getApprovedProgramTags()).toContain("student-support-services");
    expect(getApprovedProgramTags()).not.toContain("operations");
    expect(getApprovedProgramTags()).not.toContain("unassigned");
  });

  it("selects one approved program tag and skips the fallback", () => {
    expect(selectApprovedProgramTag(["unassigned", "CalWORKs"]))
      .toBe("calworks");
    expect(selectApprovedProgramTag(["operations", "invented-tag"]))
      .toBeNull();
  });

  it("validates manually changed review selections", () => {
    expect(isApprovedProgramTag("#BSSP")).toBe(true);
    expect(isApprovedProgramTag("productivity")).toBe(false);
  });

  it("treats every existing tag as a reason to ignore a folder note", () => {
    expect(normalizeExistingFolderTags(["#unassigned"])).toEqual(["unassigned"]);
    expect(normalizeExistingFolderTags(["#BSSP", "bssp", "#task"]))
      .toEqual(["BSSP", "task"]);
    expect(normalizeExistingFolderTags([])).toEqual([]);
  });

  it("detects existing tags directly from frontmatter when metadata is unavailable", () => {
    expect(extractFrontmatterFolderTags(
      "---\ntitle: Example\ntags:\n  - unassigned\n  - self-improvement\n---\nBody"
    )).toEqual(["unassigned", "self-improvement"]);
    expect(extractFrontmatterFolderTags(
      "---\ntags: [task, ai-agents]\n---\nBody"
    )).toEqual(["task", "ai-agents"]);
    expect(extractFrontmatterFolderTags("---\ntags: []\n---\nBody")).toEqual([]);
  });
});
