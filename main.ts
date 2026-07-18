import {
  getAllTags,
  Notice,
  Plugin,
  TFile,
  TFolder,
  WorkspaceLeaf,
} from "obsidian";
import { extractOpenAIKeyFromSection } from "./src/credentials";
import { classifyFolderNote, classifyNote, TagAssignment } from "./src/openai";
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
import {
  FolderApplyResult,
  FolderBatchProgressModal,
  FolderBatchReviewModal,
  FolderBatchScopeModal,
  FolderScanOptions,
  FolderScanStats,
  FolderTagProposal,
} from "./src/FolderBatchModals";
import {
  normalizeExistingFolderTags,
} from "./src/folder-batch";
import {
  CustomTagDefinition,
  detectFolderMappedTag,
  getApprovedFolderTags,
  mergeCustomTagDefinition,
  resolveApprovedFolderTag,
  sanitizeCustomTagDefinitions,
  selectApprovedFolderTag,
} from "./src/custom-tags";

export default class AITaskTaggerPlugin extends Plugin {
  settings: AITaskTaggerSettings = DEFAULT_SETTINGS;
  private inFlight = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(TAGGER_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TaggerView(leaf, this));

    this.addRibbonIcon("tags", "Assign existing tags with AI", () => {
      void this.assignActiveNote();
    });

    this.addCommand({
      id: "assign-existing-tag",
      name: "Assign existing tags to active note with AI",
      icon: "tags",
      callback: () => void this.assignActiveNote(),
    });

    this.addCommand({
      id: "open-panel",
      name: "Open AI Task Tagger panel",
      callback: () => void this.activatePanel(),
    });

    this.addCommand({
      id: "review-folder-program-tags",
      name: "Review approved program tags for active note's folder",
      icon: "folder-search",
      checkCallback: (checking) => {
        const folder = this.app.workspace.getActiveFile()?.parent;
        if (checking) return folder instanceof TFolder;
        if (folder instanceof TFolder) {
          this.openFolderBatch(folder);
          return true;
        }
        return false;
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFolder)) return;
        menu.addItem((item) =>
          item
            .setTitle("Review approved program tags with AI")
            .setIcon("folder-search")
            .onClick(() => this.openFolderBatch(file))
        );
      })
    );

    this.addSettingTab(new AITaskTaggerSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(TAGGER_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData() as Partial<AITaskTaggerSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
    const savedCustomTags = loaded && Object.prototype.hasOwnProperty.call(
      loaded,
      "customTagDefinitions"
    )
      ? loaded.customTagDefinitions
      : DEFAULT_SETTINGS.customTagDefinitions;
    this.settings.customTagDefinitions = sanitizeCustomTagDefinitions(savedCustomTags);
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

  openFolderBatch(folder: TFolder): void {
    const directCount = this.collectFolderMarkdownFiles(folder, false).length;
    const recursiveCount = this.collectFolderMarkdownFiles(folder, true).length;
    new FolderBatchScopeModal(
      this.app,
      folder,
      directCount,
      recursiveCount,
      (options) => void this.generateFolderPreview(folder, options)
    ).open();
  }

  private collectFolderMarkdownFiles(folder: TFolder, recursive: boolean): TFile[] {
    const files: TFile[] = [];

    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === "md") {
        files.push(child);
      } else if (recursive && child instanceof TFolder) {
        files.push(...this.collectFolderMarkdownFiles(child, true));
      }
    }

    return files.sort((a, b) =>
      a.path.localeCompare(b.path, undefined, { sensitivity: "base" })
    );
  }

  private async generateFolderPreview(
    folder: TFolder,
    options: FolderScanOptions
  ): Promise<void> {
    const files = this.collectFolderMarkdownFiles(folder, options.includeSubfolders);
    if (files.length === 0) {
      new Notice("This folder contains no Markdown notes to review.");
      return;
    }

    let apiKey: string;
    try {
      apiKey = await this.getOpenAIKey();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`AI Task Tagger: ${message}`, 9000);
      return;
    }

    const progress = new FolderBatchProgressModal(this.app, folder.path, files.length);
    progress.open();

    const customTagDefinitions = this.settings.customTagDefinitions;
    const approvedTags = getApprovedFolderTags(customTagDefinitions);
    const programRules = getAvailableProgramRules(approvedTags);
    const proposals: FolderTagProposal[] = [];
    const stats: FolderScanStats = {
      total: files.length,
      skippedCredential: 0,
      skippedMalformed: 0,
      skippedEmpty: 0,
      skippedTagged: 0,
      classificationFailures: 0,
    };

    for (let index = 0; index < files.length; index += 1) {
      if (progress.shouldCancel) break;
      const file = files[index];
      progress.update(index, file.path);

      if (file.path === this.settings.credentialNotePath) {
        stats.skippedCredential += 1;
        continue;
      }

      const cache = this.app.metadataCache.getFileCache(file);
      const existingTags = normalizeExistingFolderTags(
        cache ? getAllTags(cache) ?? [] : []
      );
      if (existingTags.length > 0) {
        stats.skippedTagged += 1;
        continue;
      }

      try {
        const markdown = await this.app.vault.cachedRead(file);
        if (hasMalformedPropertyBlock(markdown)) {
          stats.skippedMalformed += 1;
          continue;
        }

        const content = truncateNote(
          stripFrontmatter(markdown),
          this.settings.maxNoteCharacters
        );
        if (!content.trim()) {
          stats.skippedEmpty += 1;
          continue;
        }

        const explicitProgramTag = detectExplicitProgramTag(
          file.path,
          file.basename,
          content,
          programRules
        );
        const mappedCustomTag = detectFolderMappedTag(
          file.path,
          customTagDefinitions
        );

        let proposedTag: string | null;
        let reason: string;
        if (explicitProgramTag) {
          proposedTag = selectApprovedFolderTag(
            [explicitProgramTag],
            customTagDefinitions
          );
          reason = "Matched an approved program from the folder, title, or note text.";
        } else if (mappedCustomTag) {
          proposedTag = resolveApprovedFolderTag(
            mappedCustomTag,
            customTagDefinitions
          );
          reason = "Matched a custom tag that you mapped to this folder.";
        } else {
          const assignment = await classifyFolderNote({
            apiKey,
            model: this.settings.model,
            title: file.basename,
            content,
            allowedTags: approvedTags,
            programRules,
            customTagDefinitions,
          });
          proposedTag = selectApprovedFolderTag(
            assignment.tags,
            customTagDefinitions
          );
          reason = assignment.reason || "No clear approved tag match.";
        }

        proposals.push({
          file,
          existingTags,
          proposedTag,
          reason,
          approved: proposedTag !== null,
        });
      } catch (error) {
        stats.classificationFailures += 1;
        const message = error instanceof Error ? error.message : String(error);
        proposals.push({
          file,
          existingTags,
          proposedTag: null,
          reason: `Could not classify: ${message}`,
          approved: false,
        });
      }
    }

    if (progress.shouldCancel) {
      progress.finish();
      new Notice("Folder review canceled. No notes were changed.", 7000);
      return;
    }

    progress.finish();
    new FolderBatchReviewModal(
      this.app,
      folder.path,
      proposals,
      stats,
      this.settings.customTagDefinitions.map((definition) => ({
        ...definition,
        folderPaths: [...definition.folderPaths],
      })),
      (definition) => this.saveCustomTagDefinition(definition),
      (approved) => this.applyFolderProposals(approved)
    ).open();
  }

  private async saveCustomTagDefinition(
    definition: CustomTagDefinition
  ): Promise<CustomTagDefinition> {
    this.settings.customTagDefinitions = mergeCustomTagDefinition(
      this.settings.customTagDefinitions,
      definition
    );
    await this.saveSettings();
    const saved = this.settings.customTagDefinitions.find(
      (candidate) => candidate.tag.toLocaleLowerCase() === definition.tag.toLocaleLowerCase()
    );
    if (!saved) throw new Error("The custom tag could not be saved.");
    return saved;
  }

  private async applyFolderProposals(
    proposals: FolderTagProposal[]
  ): Promise<FolderApplyResult> {
    const result: FolderApplyResult = { applied: 0, failures: [] };

    for (const proposal of proposals) {
      const tag = proposal.proposedTag;
      if (!tag || !resolveApprovedFolderTag(tag, this.settings.customTagDefinitions)) {
        result.failures.push({
          path: proposal.file.path,
          message: "The selected tag is not in the approved tag list.",
        });
        continue;
      }

      try {
        const markdown = await this.app.vault.cachedRead(proposal.file);
        if (hasMalformedPropertyBlock(markdown)) {
          throw new Error("The note's property block is malformed.");
        }

        await this.app.fileManager.processFrontMatter(proposal.file, (frontmatter) => {
          const existing = frontmatterTagsToArray(frontmatter.tags);
          frontmatter.tags = mergeAssignedTags(existing, [tag]);
        });
        result.applied += 1;
      } catch (error) {
        result.failures.push({
          path: proposal.file.path,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
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
