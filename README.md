# AI Task Tagger

AI Task Tagger is an Obsidian plugin that reads the active Markdown note, asks OpenAI to choose one tag from the vault's existing tag index, validates the result locally, and writes the selected value to the note's `tags` property.

## Safety rules

- Normal assignments must exactly match a tag already indexed by Obsidian.
- `unassigned` is the reserved fallback when no existing tag clearly fits.
- Existing note tags are preserved.
- The plugin writes only to YAML frontmatter through Obsidian's Properties API.
- The credential note is never sent for classification.
- The API key is not committed to this repository. By default, it is read at runtime from the `Open AI` section of `03 Areas/Passwords/API Keys.md`.

## Commands and buttons

- Ribbon button: **Assign existing tag with AI**
- Command: **AI Task Tagger: Assign existing tag to active note with AI**
- Command: **AI Task Tagger: Open AI Task Tagger panel**
- Side-panel view with an **Assign tag to active note** button

The assignment command can also be placed in Obsidian's mobile toolbar or a Note Toolbar configuration.

## Development

```bash
npm install
npm run build
npm test
```

## BRAT distribution

Each GitHub release must attach `main.js`, `manifest.json`, and `styles.css`. Add `jajuangarrett-ctrl/ai-task-tagger` to BRAT, then enable **AI Task Tagger** under Community Plugins.

