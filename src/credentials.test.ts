import { describe, expect, it } from "vitest";
import { extractOpenAIKeyFromSection } from "./credentials";

describe("credential extraction", () => {
  it("reads an OpenAI key only from the named section", () => {
    const note = [
      "# API Keys",
      "## Open AI",
      "Key: sk-proj-openai_example_key_1234567890",
      "## Anthropic API",
      "Key: sk-ant-anthropic_example_key_1234567890",
    ].join("\n");
    expect(extractOpenAIKeyFromSection(note, "Open AI"))
      .toBe("sk-proj-openai_example_key_1234567890");
  });

  it("does not scan beyond the named section", () => {
    const note = [
      "# API Keys",
      "## Open AI",
      "No key here",
      "## Another provider",
      "sk-example_key_that_must_not_be_used_12345",
    ].join("\n");
    expect(extractOpenAIKeyFromSection(note, "Open AI")).toBeNull();
  });
});

