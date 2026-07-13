# AI Task Tagger

AI Task Tagger is an Obsidian plugin that reads the active Markdown note, asks OpenAI to choose one or two tags from the vault's existing tag index, validates the result locally, and writes the selected values to the note's `tags` property.

## Safety rules

- Every assignment must exactly match a tag already indexed by Obsidian.
- Tasks for a configured SDCCE program always receive that program's corresponding tag first.
- The plugin may add one second related tag when the note strongly supports it.
- `unassigned` is the reserved fallback when no existing tag clearly fits.
- Existing note tags are preserved.
- The plugin writes only to YAML frontmatter through Obsidian's Properties API.
- The credential note is never sent for classification.
- The API key is not committed to this repository. By default, it is read at runtime from the `Open AI` section of `03 Areas/Passwords/API Keys.md`.

## Commands and buttons

- Ribbon button: **Assign existing tags with AI**
- Command: **AI Task Tagger: Assign existing tags to active note with AI**
- Command: **AI Task Tagger: Open AI Task Tagger panel**
- Side-panel view with an **Assign tags to active note** button

The assignment command can also be placed in Obsidian's mobile toolbar or a Note Toolbar configuration.

## Program priority

The program map covers Affinity Programs, Apprenticeship, Basic Needs, BSSP, CalWORKs, Career Services, Child Watch, ElevateU, Foundation, ISSP, Latinx, LGBTQIA, Pathways, Rising Scholar, Student Equity, Student Support Services, and Veterans. Justice Impacted is intentionally not included. A program rule is active only while its corresponding tag exists in the vault.

## Development

```bash
npm install
npm run build
npm test
```

## BRAT distribution

Each GitHub release must attach `main.js`, `manifest.json`, and `styles.css`. Add `jajuangarrett-ctrl/ai-task-tagger` to BRAT, then enable **AI Task Tagger** under Community Plugins.
