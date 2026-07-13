const OPENAI_KEY_PATTERN = /sk-(?!ant-)[A-Za-z0-9_-]{20,}/;

function normalizeHeading(value: string): string {
  return value.replace(/[*_`]/g, "").trim().toLocaleLowerCase();
}

export function extractOpenAIKeyFromSection(
  markdown: string,
  sectionHeading: string
): string | null {
  const lines = markdown.split(/\r?\n/);
  const target = normalizeHeading(sectionHeading);
  let sectionLevel: number | null = null;

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      const name = normalizeHeading(heading[2]);

      if (sectionLevel !== null && level <= sectionLevel) break;
      if (sectionLevel === null && name === target) {
        sectionLevel = level;
        continue;
      }
    }

    if (sectionLevel !== null) {
      const match = line.match(OPENAI_KEY_PATTERN);
      if (match) return match[0];
    }
  }

  return null;
}

