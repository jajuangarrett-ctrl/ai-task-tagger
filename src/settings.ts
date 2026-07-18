import { App, PluginSettingTab, Setting } from "obsidian";
import type AITaskTaggerPlugin from "../main";
import {
  CustomTagDefinition,
  DEFAULT_CUSTOM_TAG_DEFINITIONS,
} from "./custom-tags";

export interface AITaskTaggerSettings {
  credentialNotePath: string;
  credentialSectionHeading: string;
  openaiApiKey: string;
  model: string;
  maxNoteCharacters: number;
  customTagDefinitions: CustomTagDefinition[];
}

export const DEFAULT_SETTINGS: AITaskTaggerSettings = {
  credentialNotePath: "03 Areas/Passwords/API Keys.md",
  credentialSectionHeading: "Open AI",
  openaiApiKey: "",
  model: "gpt-5.4-nano",
  maxNoteCharacters: 60000,
  customTagDefinitions: DEFAULT_CUSTOM_TAG_DEFINITIONS.map((definition) => ({
    ...definition,
    folderPaths: [...definition.folderPaths],
  })),
};

export class AITaskTaggerSettingTab extends PluginSettingTab {
  plugin: AITaskTaggerPlugin;

  constructor(app: App, plugin: AITaskTaggerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AI Task Tagger" });
    containerEl.createEl("p", {
      text: "The plugin chooses from tags already indexed by Obsidian. The reserved fallback is unassigned.",
    });

    new Setting(containerEl)
      .setName("Credential note path")
      .setDesc("Vault-relative note containing the OpenAI key. The credential note itself is never sent for classification.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.credentialNotePath)
          .setValue(this.plugin.settings.credentialNotePath)
          .onChange(async (value) => {
            this.plugin.settings.credentialNotePath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Credential section heading")
      .setDesc("Only a key found under this Markdown heading is used.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.credentialSectionHeading)
          .setValue(this.plugin.settings.credentialSectionHeading)
          .onChange(async (value) => {
            this.plugin.settings.credentialSectionHeading = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("OpenAI API key override")
      .setDesc("Optional. Leave blank to read the key from the credential note. Stored only in this plugin's local data if entered.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("OpenAI model")
      .setDesc("A small structured-output model is sufficient for tag classification.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.model)
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim() || DEFAULT_SETTINGS.model;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Maximum note characters")
      .setDesc("Longer notes keep their beginning and end while omitting the middle from the API request.")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setValue(String(this.plugin.settings.maxNoteCharacters))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed) && parsed >= 5000 && parsed <= 200000) {
              this.plugin.settings.maxNoteCharacters = parsed;
              await this.plugin.saveSettings();
            }
          });
      });

    containerEl.createEl("h3", { text: "Approved custom tags" });
    containerEl.createEl("p", {
      text: "Tags created manually during folder review are saved here. The AI may propose them later using their guidance or folder mappings, but it cannot invent additional tags.",
    });

    if (this.plugin.settings.customTagDefinitions.length === 0) {
      containerEl.createEl("p", {
        text: "No custom tags have been approved yet.",
        cls: "setting-item-description",
      });
    }

    for (const definition of this.plugin.settings.customTagDefinitions) {
      const details = [
        definition.description,
        definition.folderPaths.length > 0
          ? `Folders: ${definition.folderPaths.join(", ")}`
          : "No automatic folder mapping",
      ].filter(Boolean).join(" · ");

      new Setting(containerEl)
        .setName(`#${definition.tag}`)
        .setDesc(details)
        .addButton((button) =>
          button
            .setButtonText("Remove")
            .setDestructive()
            .onClick(async () => {
              this.plugin.settings.customTagDefinitions =
                this.plugin.settings.customTagDefinitions.filter(
                  (candidate) => candidate.tag !== definition.tag
                );
              await this.plugin.saveSettings();
              this.display();
            })
        );
    }
  }
}
