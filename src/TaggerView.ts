import { ItemView, WorkspaceLeaf } from "obsidian";
import type AITaskTaggerPlugin from "../main";

export const TAGGER_VIEW_TYPE = "ai-task-tagger-panel";

export class TaggerView extends ItemView {
  private plugin: AITaskTaggerPlugin;
  private statusEl: HTMLElement | null = null;
  private resultEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: AITaskTaggerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TAGGER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "AI Task Tagger";
  }

  getIcon(): string {
    return "tags";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("ai-task-tagger-panel");
    container.createEl("h3", { text: "AI Task Tagger" });
    container.createEl("p", {
      cls: "ai-task-tagger-panel__description",
      text: "Read the active note and add one or two existing vault tags to its tags property.",
    });
    this.statusEl = container.createEl("p", { cls: "ai-task-tagger-panel__status" });
    const button = container.createEl("button", {
      cls: "mod-cta ai-task-tagger-panel__button",
      text: "Assign tags to active note",
    });
    this.resultEl = container.createDiv({ cls: "ai-task-tagger-panel__result" });
    this.resultEl.hide();
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const result = await this.plugin.assignActiveNote();
        if (result && this.resultEl) {
          const tags = result.tags.map((tag) => `#${tag}`).join(" · ");
          this.resultEl.setText(`${tags}${result.reason ? ` — ${result.reason}` : ""}`);
          this.resultEl.show();
        }
      } finally {
        button.disabled = false;
        this.refreshActiveNote();
      }
    });

    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshActiveNote()));
    this.refreshActiveNote();
  }

  private refreshActiveNote(): void {
    if (!this.statusEl) return;
    const file = this.app.workspace.getActiveFile();
    this.statusEl.setText(file ? `Active note: ${file.basename}` : "Open a Markdown note to begin.");
  }
}
