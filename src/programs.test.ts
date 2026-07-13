import { describe, expect, it } from "vitest";
import {
  PROGRAM_TAG_RULES,
  detectExplicitProgramTag,
  getAvailableProgramRules,
} from "./programs";

const allowedTags = PROGRAM_TAG_RULES.map((rule) => rule.tag);
const availableRules = getAvailableProgramRules(allowedTags);

describe("program tag policy", () => {
  it("includes the requested programs but omits Justice Impacted", () => {
    expect(PROGRAM_TAG_RULES.map((rule) => rule.name)).toContain("Child Watch Program");
    expect(PROGRAM_TAG_RULES.map((rule) => rule.name)).toContain("ISSP");
    expect(PROGRAM_TAG_RULES.map((rule) => rule.name)).not.toContain("Justice Impacted Program");
  });

  it("uses the program folder as a definitive signal", () => {
    expect(
      detectExplicitProgramTag(
        "02 Programs/CalWORKs/Operations/Orientation.md",
        "Orientation",
        "Confirm next steps.",
        availableRules
      )
    ).toBe("calworks");
  });

  it("detects explicit program names in a task outside the program folder", () => {
    expect(
      detectExplicitProgramTag(
        "08 Tasks/Tasks.md",
        "Follow up",
        "Send the revised intake form to the Child Watch Program team.",
        availableRules
      )
    ).toBe("child-watch-program");
    expect(
      detectExplicitProgramTag(
        "08 Tasks/Tasks.md",
        "Budget review",
        "Ask the SDCCE Foundation to confirm the grant balance.",
        availableRules
      )
    ).toBe("foundation");
  });

  it("does not force a program whose tag is absent from the vault", () => {
    const filteredRules = getAvailableProgramRules(["bssp"]);
    expect(
      detectExplicitProgramTag(
        "08 Tasks/Tasks.md",
        "ISSP follow-up",
        "Contact the ISSP team.",
        filteredRules
      )
    ).toBeNull();
  });
});

