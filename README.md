# AI Task Tagger

AI Task Tagger is an Obsidian plugin that classifies an active Markdown note or generates a reviewable program-tag preview for a folder of notes. It validates every result locally and writes only approved values to the note's `tags` property.

## Safety rules

- Every assignment must exactly match a tag already indexed by Obsidian.
- Tasks for a configured SDCCE program always receive that program's corresponding tag first.
- The plugin may add one second related tag when the note strongly supports it.
- `unassigned` is the reserved fallback when no existing tag clearly fits.
- Existing note tags are preserved.
- The plugin writes only to YAML frontmatter through Obsidian's Properties API.
- The credential note is never sent for classification.
- The API key is not committed to this repository. By default, it is read at runtime from the `Open AI` section of `03 Areas/Passwords/API Keys.md`.
- Folder previews use only the 17 approved program tags. They never add `unassigned` or general-purpose tags.
- Folder review writes nothing until the user checks the desired notes and presses **Apply approved tags**.
- Folder review always ignores notes that already contain any tag, including `unassigned`; this safeguard cannot be turned off.

## Commands and buttons

- Ribbon button: **Assign existing tags with AI**
- Command: **AI Task Tagger: Assign existing tags to active note with AI**
- Command: **AI Task Tagger: Open AI Task Tagger panel**
- Command: **AI Task Tagger: Review approved program tags for active note's folder**
- Folder menu: right-click or long-press a folder, then choose **Review approved program tags with AI**
- Side-panel view with an **Assign tags to active note** button

The assignment command can also be placed in Obsidian's mobile toolbar or a Note Toolbar configuration.

## Reviewed folder workflow

1. Right-click or long-press a folder and select **Review approved program tags with AI**.
2. Choose whether to include subfolders. Notes that already have any tag are automatically ignored and are never sent for classification.
3. Select **Generate preview**. Empty notes, malformed property blocks, and the credential note are skipped. The scan can be canceled without changing any note.
4. Review every eligible note. Check or uncheck it, choose a different approved program tag, select **No tag — skip**, or open the note for inspection.
5. Select **Apply approved tags**. Only checked notes with an approved program tag are changed, and existing tags are preserved.

Notes without a clear program match remain unchecked and untagged. Notes placed inside a configured program folder can be matched locally; other eligible notes may require an OpenAI request during preview generation.

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
