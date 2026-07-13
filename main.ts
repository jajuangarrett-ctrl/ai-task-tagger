import {
  getAllTags,
  Notice,
  Plugin,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import { extractOpenAIKeyFromSection } from "./src/credentials";
import { classifyNote, TagAssignment } from "./src/openai";
import {
  DEFAULT_SETTINGS,
  AITaskTaggerSettings,
  AITaskTaggerSettingTab,
} from "./src/settings";
import {
  frontmatterTagsToArray,
  hasMalformedPropertyBlock,
  mergeAssignedTags,
  normalizeVaultTags,
  stripFrontmatter,
  truncateNote,
} from "./src/tagging";
import { TAGGER_VIEW_TYPE, TaggerView } from "./src/TaggerView";
import {
  PROGRAM_TAG_RULES,
  detectExplicitProgramTag,
  getAvailableProgramRules,
} from "./src/programs";

export default class AITaskTaggerPlugin extends Plugin {
  settings: AITaskTaggerSettings = DEFAULT_SETTINGS;
  private inFlight = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(TAGGER_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TaggerView(leaf, this));

    this.addRibbonIcon("tags", "Assign existing tag with AI", () => {
      void this.assignActiveNote();
    });

    this.addCommand({
      id: "assign-existing-tag",
      name: "Assign existing tag to active note with AI",
      icon: "tags",
      callback: () => void this.assignActiveNote(),
    });

    this.addCommand({
      id: "open-panel",
      name: "Open AI Task Tagger panel",
      callback: () => void this.activatePanel(),
    });

    this.addSettingTab(new AITaskTaggerSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(TAGGER_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activatePanel(): Promise<void> {
    let leaf: WorkspaceLeaf | undefined = this.app.workspace.getLeavesOfType(TAGGER_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? undefined;
      if (!leaf) {
        new Notice("AI Task Tagger could not open the side panel on this device.");
        return;
      }
      await leaf.setViewState({ type: TAGGER_VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async assignActiveNote(): Promise<TagAssignment | null> {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.extension !== "md") {
      new Notice("Open a Markdown note before running AI Task Tagger.");
      return null;
    }

    if (file.path === this.settings.credentialNotePath) {
      new Notice("The credential note cannot be sent to OpenAI for classification.");
      return null;
    }

    if (this.inFlight.has(file.path)) {
      new Notice("AI Task Tagger is already reading this note.");
      return null;
    }

    this.inFlight.add(file.path);
    new Notice(`AI Task Tagger is reading “${file.basename}”…`);

    try {
      const apiKey = await this.getOpenAIKey();
      const markdown = await this.app.vault.cachedRead(file);
      if (hasMalformedPropertyBlock(markdown)) {
        new Notice(
          "AI Task Tagger found a malformed property block and made no changes to this note.",
          9000
        );
        return null;
      }
      const content = truncateNote(
        stripFrontmatter(markdown),
        this.settings.maxNoteCharacters
      );

      if (!content.trim()) {
        new Notice("This note has no body content to classify.");
        return null;
      }

      const indexedTags = new Set<string>();
      for (const note of this.app.vault.getMarkdownFiles()) {
        const cache = this.app.metadataCache.getFileCache(note);
        if (!cache) continue;
        for (const tag of getAllTags(cache) ?? []) indexedTags.add(tag);
      }
      const trustedProgramTags = PROGRAM_TAG_RULES.map((rule) => rule.tag);
      const allowedTags = normalizeVaultTags([...indexedTags, ...trustedProgramTags]);
      const programRules = getAvailableProgramRules(allowedTags);
      const forcedProgramTag = detectExplicitProgramTag(
        file.path,
        file.basename,
        content,
        programRules
      );
      const assignment = await classifyNote({
        apiKey,
        model: this.settings.model,
        title: file.basename,
        content,
        allowedTags,
        programRules,
        forcedProgramTag,
      });

      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        const existing = frontmatterTagsToArray(frontmatter.tags);
        frontmatter.tags = mergeAssignedTags(existing, assignment.tags);
      });

      const reason = assignment.reason ? ` ${assignment.reason}` : "";
      const assignedLabels = assignment.tags.map((tag) => `#${tag}`).join(" and ");
      new Notice(`Assigned ${assignedLabels}.${reason}`, 7000);
      return assignment;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`AI Task Tagger: ${message}`, 9000);
      return null;
    } finally {
      this.inFlight.delete(file.path);
    }
  }

  private async getOpenAIKey(): Promise<string> {
    if (this.settings.openaiApiKey.trim()) return this.settings.openaiApiKey.trim();

    const credentialFile = this.app.vault.getAbstractFileByPath(
      this.settings.credentialNotePath
    );
    if (!(credentialFile instanceof TFile)) {
      throw new Error(`Credential note not found: ${this.settings.credentialNotePath}`);
    }

    const credentialNote = await this.app.vault.cachedRead(credentialFile);
    const apiKey = extractOpenAIKeyFromSection(
      credentialNote,
      this.settings.credentialSectionHeading
    );
    if (!apiKey) {
      throw new Error(
        `No OpenAI key was found under “${this.settings.credentialSectionHeading}” in the credential note.`
      );
    }
    return apiKey;
  }
}
