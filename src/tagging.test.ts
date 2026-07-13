import { describe, expect, it } from "vitest";
import {
  FALLBACK_TAG,
  canonicalizeAssignment,
  frontmatterTagsToArray,
  mergeAssignedTag,
  normalizeVaultTags,
  stripFrontmatter,
  truncateNote,
} from "./tagging";

describe("tagging helpers", () => {
  it("normalizes and de-duplicates the vault tag list", () => {
    expect(normalizeVaultTags(["#BSSP", "bssp", "#CalWORKs", "", "unassigned"]))
      .toEqual(["BSSP", "CalWORKs"]);
  });

  it("reads array and scalar frontmatter tag values", () => {
    expect(frontmatterTagsToArray(["#one", "two"])).toEqual(["one", "two"]);
    expect(frontmatterTagsToArray("one, #two")).toEqual(["one", "two"]);
  });

  it("preserves existing tags while appending the assignment", () => {
    expect(mergeAssignedTag(["meeting", "BSSP"], "CalWORKs"))
      .toEqual(["meeting", "BSSP", "CalWORKs"]);
  });

  it("removes the fallback when a real tag is later assigned", () => {
    expect(mergeAssignedTag([FALLBACK_TAG, "meeting"], "BSSP"))
      .toEqual(["meeting", "BSSP"]);
  });

  it("rejects invented model output", () => {
    expect(canonicalizeAssignment("invented-tag", ["BSSP", "CalWORKs"]))
      .toBe(FALLBACK_TAG);
    expect(canonicalizeAssignment("#bssp", ["BSSP", "CalWORKs"]))
      .toBe("BSSP");
  });

  it("removes YAML frontmatter before classification", () => {
    expect(stripFrontmatter("---\ntitle: Test\ntags: []\n---\nBody text"))
      .toBe("Body text");
  });

  it("keeps the beginning and end when truncating", () => {
    const source = "a".repeat(80) + "z".repeat(80);
    const result = truncateNote(source, 100);
    expect(result.length).toBe(100);
    expect(result.startsWith("aaaa")).toBe(true);
    expect(result.endsWith("zzzz")).toBe(true);
    expect(result).toContain("middle of note omitted");
  });
});

