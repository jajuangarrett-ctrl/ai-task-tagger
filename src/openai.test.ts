import { describe, expect, it } from "vitest";
import { extractResponseText, parseTagAssignment } from "./openai-response";

describe("OpenAI response parsing", () => {
  it("extracts output text from a raw Responses API payload", () => {
    const response = {
      output: [{ content: [{ type: "output_text", text: '{"tags":["BSSP"],"reason":"Main topic"}' }] }],
    };
    expect(extractResponseText(response)).toBe('{"tags":["BSSP"],"reason":"Main topic"}');
  });

  it("accepts two existing tags", () => {
    const response = { output_text: '{"tags":["bssp","operations"],"reason":"BSSP operations."}' };
    expect(parseTagAssignment(response, ["BSSP", "operations", "CalWORKs"]))
      .toEqual({ tags: ["BSSP", "operations"], reason: "BSSP operations." });
  });

  it("forces an invented tag to unassigned", () => {
    const response = { output_text: '{"tags":["new-program"],"reason":"Closest topic."}' };
    expect(parseTagAssignment(response, ["BSSP", "CalWORKs"]).tags).toEqual(["unassigned"]);
  });

  it("puts the forced program tag first and keeps one related tag", () => {
    const response = { output_text: '{"tags":["operations"],"reason":"Operational follow-up."}' };
    expect(parseTagAssignment(response, ["bssp", "operations"], "bssp").tags)
      .toEqual(["bssp", "operations"]);
  });

  it("drops unassigned when a real tag is present", () => {
    const response = { output_text: '{"tags":["unassigned","BSSP"],"reason":"Program task."}' };
    expect(parseTagAssignment(response, ["BSSP"]).tags).toEqual(["BSSP"]);
  });
});
