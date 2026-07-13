import { describe, expect, it } from "vitest";
import {
  FALLBACK_TAG,
  canonicalizeAssignment,
  frontmatterTagsToArray,
  hasMalformedPropertyBlock,
  mergeAssignedTags,
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
    expect(mergeAssignedTags(["meeting", "BSSP"], ["CalWORKs", "operations"]))
      .toEqual(["meeting", "BSSP", "CalWORKs", "operations"]);
  });

  it("removes the fallback when a real tag is later assigned", () => {
    expect(mergeAssignedTags([FALLBACK_TAG, "meeting"], ["BSSP"]))
      .toEqual(["meeting", "BSSP"]);
  });

  it("does not keep unassigned beside a real assignment", () => {
    expect(mergeAssignedTags([], [FALLBACK_TAG, "BSSP"]))
      .toEqual(["BSSP"]);
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

  it("detects an unclosed or duplicated property block", () => {
    expect(hasMalformedPropertyBlock("---\ntitle: Broken\ntags: []\nBody"))
      .toBe(true);
    expect(hasMalformedPropertyBlock(
      "---\ntitle: First\ntags: []\n---\nFolder path\ntags:\n  - career-services\n---\nBody"
    )).toBe(true);
    expect(hasMalformedPropertyBlock("---\ntitle: Safe\ntags: []\n---\n# Body\nText"))
      .toBe(false);
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
