import { App, Modal, Setting, TFile, TFolder } from "obsidian";
import { PROGRAM_TAG_RULES } from "./programs";

export interface FolderScanOptions {
  includeSubfolders: boolean;
}

export interface FolderScanStats {
  total: number;
  skippedCredential: number;
  skippedMalformed: number;
  skippedEmpty: number;
  skippedTagged: number;
  classificationFailures: number;
}

export interface FolderTagProposal {
  file: TFile;
  existingTags: string[];
  proposedTag: string | null;
  reason: string;
  approved: boolean;
}

export interface FolderApplyFailure {
  path: string;
  message: string;
}

export interface FolderApplyResult {
  applied: number;
  failures: FolderApplyFailure[];
}

export class FolderBatchScopeModal extends Modal {
  private includeSubfolders = true;

  constructor(
    app: App,
    private readonly folder: TFolder,
    private readonly directCount: number,
    private readonly recursiveCount: number,
    private readonly onSubmit: (options: FolderScanOptions) => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("ai-task-tagger-folder-scope-modal");
    this.setTitle("Review folder tags with AI");

    this.contentEl.createEl("p", {
      text: `Folder: ${this.folder.path || "Vault root"}`,
      cls: "ai-task-tagger-folder-path",
    });
    this.contentEl.createEl("p", {
      text: "The plugin will generate a preview using only approved program tags. Notes that already have any tag are always ignored. No note will change until you approve the results.",
    });

    const countEl = this.contentEl.createEl("p", {
      cls: "ai-task-tagger-folder-count",
    });
    const refreshCount = (): void => {
      const count = this.includeSubfolders ? this.recursiveCount : this.directCount;
      countEl.setText(`${count} Markdown note${count === 1 ? "" : "s"} will be reviewed.`);
    };

    new Setting(this.contentEl)
      .setName("Include subfolders")
      .setDesc("Review Markdown notes in this folder and every folder beneath it.")
      .addToggle((toggle) =>
        toggle.setValue(this.includeSubfolders).onChange((value) => {
          this.includeSubfolders = value;
          refreshCount();
        })
      );

    const actions = this.contentEl.createDiv({ cls: "ai-task-tagger-modal-actions" });
    const cancelButton = actions.createEl("button", { text: "Cancel" });
    const previewButton = actions.createEl("button", {
      text: "Generate preview",
      cls: "mod-cta",
    });

    cancelButton.addEventListener("click", () => this.close());
    previewButton.addEventListener("click", () => {
      const options = {
        includeSubfolders: this.includeSubfolders,
      };
      this.close();
      this.onSubmit(options);
    });

    refreshCount();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class FolderBatchProgressModal extends Modal {
  private statusEl: HTMLElement | null = null;
  private detailEl: HTMLElement | null = null;
  private progressEl: HTMLProgressElement | null = null;
  private cancelButton: HTMLButtonElement | null = null;
  private cancellationRequested = false;
  private completed = false;

  constructor(app: App, private readonly folderPath: string, private readonly total: number) {
    super(app);
  }

  get shouldCancel(): boolean {
    return this.cancellationRequested;
  }

  onOpen(): void {
    this.modalEl.addClass("ai-task-tagger-folder-progress-modal");
    this.setTitle("Generating tag preview");
    this.contentEl.createEl("p", {
      text: this.folderPath || "Vault root",
      cls: "ai-task-tagger-folder-path",
    });
    this.statusEl = this.contentEl.createEl("p", { text: `Preparing ${this.total} notes…` });
    this.progressEl = this.contentEl.createEl("progress");
    this.progressEl.max = Math.max(this.total, 1);
    this.progressEl.value = 0;
    this.detailEl = this.contentEl.createEl("p", {
      cls: "ai-task-tagger-progress-detail",
    });

    const actions = this.contentEl.createDiv({ cls: "ai-task-tagger-modal-actions" });
    this.cancelButton = actions.createEl("button", { text: "Cancel scan" });
    this.cancelButton.addEventListener("click", () => this.requestCancel());
  }

  update(completed: number, filePath: string): void {
    if (this.statusEl) {
      this.statusEl.setText(`Reviewing note ${Math.min(completed + 1, this.total)} of ${this.total}…`);
    }
    if (this.progressEl) this.progressEl.value = completed;
    if (this.detailEl) this.detailEl.setText(filePath);
  }

  finish(): void {
    this.completed = true;
    if (this.progressEl) this.progressEl.value = this.total;
    this.close();
  }

  requestCancel(): void {
    this.cancellationRequested = true;
    if (this.statusEl) this.statusEl.setText("Stopping after the current note…");
    if (this.cancelButton) this.cancelButton.disabled = true;
  }

  onClose(): void {
    if (!this.completed) this.cancellationRequested = true;
    this.contentEl.empty();
  }
}

interface ReviewControl {
  proposal: FolderTagProposal;
  checkbox: HTMLInputElement;
  select: HTMLSelectElement;
}

export class FolderBatchReviewModal extends Modal {
  private controls: ReviewControl[] = [];
  private applyButton: HTMLButtonElement | null = null;
  private selectedCountEl: HTMLElement | null = null;
  private applying = false;

  constructor(
    app: App,
    private readonly folderPath: string,
    private readonly proposals: FolderTagProposal[],
    private readonly stats: FolderScanStats,
    private readonly onApply: (proposals: FolderTagProposal[]) => Promise<FolderApplyResult>
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("ai-task-tagger-folder-review-modal");
    this.setTitle("Approve program tags");

    this.contentEl.createEl("p", {
      text: this.folderPath || "Vault root",
      cls: "ai-task-tagger-folder-path",
    });
    this.contentEl.createEl("p", {
      text: "Review each proposal. Uncheck a note, choose a different approved program, or select No tag — skip. Nothing has been written yet.",
    });

    const matched = this.proposals.filter((proposal) => proposal.proposedTag).length;
    const noMatch = this.proposals.length - matched;
    this.contentEl.createEl("p", {
      text: `${matched} proposed match${matched === 1 ? "" : "es"}; ${noMatch} note${noMatch === 1 ? "" : "s"} need manual review.`,
      cls: "ai-task-tagger-review-summary",
    });

    const skippedParts = [
      this.stats.skippedTagged ? `${this.stats.skippedTagged} already tagged` : "",
      this.stats.skippedEmpty ? `${this.stats.skippedEmpty} empty` : "",
      this.stats.skippedMalformed ? `${this.stats.skippedMalformed} malformed` : "",
      this.stats.skippedCredential ? `${this.stats.skippedCredential} credential note` : "",
      this.stats.classificationFailures ? `${this.stats.classificationFailures} classification failures` : "",
    ].filter(Boolean);
    if (skippedParts.length > 0) {
      this.contentEl.createEl("p", {
        text: `Not proposed: ${skippedParts.join(", ")}.`,
        cls: "ai-task-tagger-progress-detail",
      });
    }

    const toolbar = this.contentEl.createDiv({ cls: "ai-task-tagger-review-toolbar" });
    const selectProposedButton = toolbar.createEl("button", { text: "Select proposed" });
    const clearButton = toolbar.createEl("button", { text: "Clear all" });
    this.selectedCountEl = toolbar.createEl("span", {
      cls: "ai-task-tagger-selected-count",
    });

    const list = this.contentEl.createDiv({ cls: "ai-task-tagger-review-list" });
    if (this.proposals.length === 0) {
      list.createEl("p", { text: "No eligible notes were found for review." });
    }

    for (const proposal of this.proposals) {
      const row = list.createDiv({ cls: "ai-task-tagger-review-row" });
      const checkbox = row.createEl("input");
      checkbox.type = "checkbox";
      checkbox.checked = proposal.approved;
      checkbox.setAttr("aria-label", `Approve ${proposal.file.basename}`);

      const noteInfo = row.createDiv({ cls: "ai-task-tagger-review-note" });
      noteInfo.createEl("strong", { text: proposal.file.basename });
      noteInfo.createEl("small", { text: proposal.file.path });
      noteInfo.createEl("small", {
        text: proposal.reason || "No clear approved program match.",
        cls: "ai-task-tagger-review-reason",
      });
      if (proposal.existingTags.length > 0) {
        noteInfo.createEl("small", {
          text: `Existing tags will be preserved: ${proposal.existingTags.join(", ")}`,
        });
      }

      const select = row.createEl("select");
      select.setAttr("aria-label", `Program tag for ${proposal.file.basename}`);
      select.createEl("option", { text: "No tag — skip", value: "" });
      for (const rule of PROGRAM_TAG_RULES) {
        select.createEl("option", {
          text: `${rule.name} (#${rule.tag})`,
          value: rule.tag,
        });
      }
      select.value = proposal.proposedTag ?? "";

      const openButton = row.createEl("button", {
        text: "Open note",
        cls: "ai-task-tagger-open-note",
      });
      openButton.addEventListener("click", () => {
        void this.app.workspace.getLeaf(false).openFile(proposal.file);
      });

      checkbox.addEventListener("change", () => {
        proposal.approved = checkbox.checked && Boolean(select.value);
        if (checkbox.checked && !select.value) checkbox.checked = false;
        this.refreshSelectedCount();
      });
      select.addEventListener("change", () => {
        proposal.proposedTag = select.value || null;
        proposal.approved = Boolean(select.value);
        checkbox.checked = proposal.approved;
        this.refreshSelectedCount();
      });

      this.controls.push({ proposal, checkbox, select });
    }

    selectProposedButton.addEventListener("click", () => {
      for (const control of this.controls) {
        control.proposal.approved = Boolean(control.proposal.proposedTag);
        control.checkbox.checked = control.proposal.approved;
      }
      this.refreshSelectedCount();
    });
    clearButton.addEventListener("click", () => {
      for (const control of this.controls) {
        control.proposal.approved = false;
        control.checkbox.checked = false;
      }
      this.refreshSelectedCount();
    });

    const actions = this.contentEl.createDiv({ cls: "ai-task-tagger-modal-actions" });
    const cancelButton = actions.createEl("button", { text: "Cancel" });
    this.applyButton = actions.createEl("button", { cls: "mod-cta" });
    cancelButton.addEventListener("click", () => this.close());
    this.applyButton.addEventListener("click", () => {
      void this.applySelected(cancelButton, selectProposedButton, clearButton);
    });

    this.refreshSelectedCount();
  }

  private async applySelected(...otherButtons: HTMLButtonElement[]): Promise<void> {
    if (this.applying) return;
    const selected = this.proposals.filter(
      (proposal) => proposal.approved && proposal.proposedTag
    );
    if (selected.length === 0) return;

    this.applying = true;
    for (const control of this.controls) {
      control.checkbox.disabled = true;
      control.select.disabled = true;
    }
    for (const button of otherButtons) button.disabled = true;
    if (this.applyButton) {
      this.applyButton.disabled = true;
      this.applyButton.setText(`Applying ${selected.length}…`);
    }

    const result = await this.onApply(selected);
    this.close();
    new FolderBatchSummaryModal(this.app, result).open();
  }

  private refreshSelectedCount(): void {
    const selected = this.proposals.filter(
      (proposal) => proposal.approved && proposal.proposedTag
    ).length;
    if (this.selectedCountEl) {
      this.selectedCountEl.setText(`${selected} selected`);
    }
    if (this.applyButton) {
      this.applyButton.setText(`Apply ${selected} approved tag${selected === 1 ? "" : "s"}`);
      this.applyButton.disabled = selected === 0;
    }
  }

  onClose(): void {
    this.controls = [];
    this.contentEl.empty();
  }
}

class FolderBatchSummaryModal extends Modal {
  constructor(app: App, private readonly result: FolderApplyResult) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Folder tagging complete");
    this.contentEl.createEl("p", {
      text: `${this.result.applied} note${this.result.applied === 1 ? "" : "s"} updated.`,
    });

    if (this.result.failures.length > 0) {
      this.contentEl.createEl("p", {
        text: `${this.result.failures.length} note${this.result.failures.length === 1 ? "" : "s"} could not be updated:`,
      });
      const list = this.contentEl.createEl("ul");
      for (const failure of this.result.failures) {
        list.createEl("li", { text: `${failure.path}: ${failure.message}` });
      }
    }

    const actions = this.contentEl.createDiv({ cls: "ai-task-tagger-modal-actions" });
    const doneButton = actions.createEl("button", { text: "Done", cls: "mod-cta" });
    doneButton.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
