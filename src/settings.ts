import { App, PluginSettingTab, Setting } from "obsidian";
import type AITaskTaggerPlugin from "../main";

export interface AITaskTaggerSettings {
  credentialNotePath: string;
  credentialSectionHeading: string;
  openaiApiKey: string;
  model: string;
  maxNoteCharacters: number;
}

export const DEFAULT_SETTINGS: AITaskTaggerSettings = {
  credentialNotePath: "03 Areas/Passwords/API Keys.md",
  credentialSectionHeading: "Open AI",
  openaiApiKey: "",
  model: "gpt-5.4-nano",
  maxNoteCharacters: 60000,
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
  }
}

