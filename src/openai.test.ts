import { describe, expect, it } from "vitest";
import { extractResponseText, parseTagAssignment } from "./openai-response";

describe("OpenAI response parsing", () => {
  it("extracts output text from a raw Responses API payload", () => {
    const response = {
      output: [{ content: [{ type: "output_text", text: '{"tag":"BSSP","reason":"Main topic"}' }] }],
    };
    expect(extractResponseText(response)).toBe('{"tag":"BSSP","reason":"Main topic"}');
  });

  it("accepts an existing tag", () => {
    const response = { output_text: '{"tag":"bssp","reason":"The note is about BSSP."}' };
    expect(parseTagAssignment(response, ["BSSP", "CalWORKs"]))
      .toEqual({ tag: "BSSP", reason: "The note is about BSSP." });
  });

  it("forces an invented tag to unassigned", () => {
    const response = { output_text: '{"tag":"new-program","reason":"Closest topic."}' };
    expect(parseTagAssignment(response, ["BSSP", "CalWORKs"]).tag).toBe("unassigned");
  });
});
