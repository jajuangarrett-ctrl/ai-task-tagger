export interface ProgramTagRule {
  name: string;
  tag: string;
  folderNames: readonly string[];
  aliases: readonly string[];
}

export const PROGRAM_TAG_RULES: readonly ProgramTagRule[] = [
  {
    name: "Affinity Programs",
    tag: "affinity-programs",
    folderNames: ["Affinity Programs"],
    aliases: ["Affinity Programs", "Affinity Program"],
  },
  {
    name: "Apprenticeship Program",
    tag: "apprenticeship-program",
    folderNames: ["Apprenticeship Program"],
    aliases: ["Apprenticeship Program", "Apprenticeship Readiness Program", "ARP"],
  },
  {
    name: "Basic Needs",
    tag: "basic-needs",
    folderNames: ["Basic-Needs"],
    aliases: ["Basic Needs", "Basic-Needs"],
  },
  {
    name: "BSSP",
    tag: "bssp",
    folderNames: ["BSSP"],
    aliases: ["BSSP", "Black Student Success Program"],
  },
  {
    name: "CalWORKs",
    tag: "calworks",
    folderNames: ["CalWORKs"],
    aliases: ["CalWORKs", "California Work Opportunity and Responsibility to Kids"],
  },
  {
    name: "Career Services",
    tag: "career-services",
    folderNames: ["Career Services"],
    aliases: ["Career Services"],
  },
  {
    name: "Child Watch Program",
    tag: "child-watch-program",
    folderNames: ["Child Watch Program"],
    aliases: ["Child Watch Program", "Child Watch"],
  },
  {
    name: "ElevateU",
    tag: "ElevateuProgram",
    folderNames: ["Elevateu"],
    aliases: ["ElevateU", "Elevate U"],
  },
  {
    name: "Foundation",
    tag: "foundation",
    folderNames: ["Foundation"],
    aliases: ["SDCCE Foundation", "Continuing Education Foundation", "Foundation"],
  },
  {
    name: "ISSP",
    tag: "issp",
    folderNames: ["ISSP"],
    aliases: ["ISSP", "Immigrant Student Support Program"],
  },
  {
    name: "Latinx Program",
    tag: "Latinx-program",
    folderNames: ["Latinx Program"],
    aliases: ["Latinx Program"],
  },
  {
    name: "LGBTQIA",
    tag: "lgbtqia-program",
    folderNames: ["LGBTQIA"],
    aliases: ["LGBTQIA", "LGBTQIA Program"],
  },
  {
    name: "Pathways Program",
    tag: "pathways-program",
    folderNames: ["Pathways Program"],
    aliases: ["Pathways Program"],
  },
  {
    name: "Rising Scholar Program",
    tag: "rising-scholar-program",
    folderNames: ["Rising Scholar Program"],
    aliases: ["Rising Scholar Program", "Rising Scholars Program"],
  },
  {
    name: "Student Equity",
    tag: "student-equity",
    folderNames: ["Student Equity"],
    aliases: ["Student Equity"],
  },
  {
    name: "Student Support Services",
    tag: "student-support-services",
    folderNames: ["Student Support Services"],
    aliases: ["Student Support Services", "SSS"],
  },
  {
    name: "Veterans",
    tag: "veterans-program",
    folderNames: ["Veterans"],
    aliases: ["Veterans Program", "Veteran Program", "Veterans Services"],
  },
];

export interface AvailableProgramTagRule extends ProgramTagRule {
  tag: string;
}

export function getAvailableProgramRules(allowedTags: string[]): AvailableProgramTagRule[] {
  return PROGRAM_TAG_RULES.flatMap((rule) => {
    const existingTag = allowedTags.find(
      (tag) => tag.toLocaleLowerCase() === rule.tag.toLocaleLowerCase()
    );
    return existingTag ? [{ ...rule, tag: existingTag }] : [];
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(text: string, phrase: string): boolean {
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegex(phrase)}(?:$|[^\\p{L}\\p{N}])`,
    "iu"
  );
  return pattern.test(text);
}

export function detectExplicitProgramTag(
  filePath: string,
  title: string,
  content: string,
  availableRules: AvailableProgramTagRule[]
): string | null {
  const normalizedPath = filePath.replace(/\\/g, "/").toLocaleLowerCase();

  for (const rule of availableRules) {
    for (const folderName of rule.folderNames) {
      const folderPrefix = `02 programs/${folderName.toLocaleLowerCase()}`;
      if (normalizedPath === folderPrefix || normalizedPath.startsWith(`${folderPrefix}/`)) {
        return rule.tag;
      }
    }
  }

  const noteText = `${title}\n${content}`;
  for (const rule of availableRules) {
    const aliases = [...rule.aliases].sort((a, b) => b.length - a.length);
    if (aliases.some((alias) => containsPhrase(noteText, alias))) return rule.tag;
  }

  return null;
}
