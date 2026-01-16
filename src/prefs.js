import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AIUsagePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        
        // Synthetic Group
        const syntheticGroup = new Adw.PreferencesGroup({
            title: 'Synthetic',
            description: 'Configure your Synthetic access'
        });

        const syntheticApiKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key'
        });

        const syntheticEnabledRow = new Adw.SwitchRow({
            title: 'Enable Provider'
        });

        syntheticGroup.add(syntheticApiKeyRow);
        syntheticGroup.add(syntheticEnabledRow);
        page.add(syntheticGroup);

        settings.bind(
            'synthetic-api-key',
            syntheticApiKeyRow,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.bind(
            'synthetic-enabled',
            syntheticEnabledRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Chutes.ai Group
        const chutesGroup = new Adw.PreferencesGroup({
            title: 'Chutes.ai',
            description: 'Configure your Chutes.ai access'
        });

        const chutesApiKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key'
        });

        const chutesEnabledRow = new Adw.SwitchRow({
            title: 'Enable Provider'
        });

        chutesGroup.add(chutesApiKeyRow);
        chutesGroup.add(chutesEnabledRow);
        page.add(chutesGroup);

        settings.bind(
            'chutes-api-key',
            chutesApiKeyRow,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.bind(
            'chutes-enabled',
            chutesEnabledRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Nano-GPT Group
        const nanoGptGroup = new Adw.PreferencesGroup({
            title: 'Nano-GPT',
            description: 'Configure your Nano-GPT access'
        });

        const nanoGptApiKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key'
        });

        const nanoGptEnabledRow = new Adw.SwitchRow({
            title: 'Enable Provider'
        });

        nanoGptGroup.add(nanoGptApiKeyRow);
        nanoGptGroup.add(nanoGptEnabledRow);

        const nanoGptLimitRow = new Adw.SwitchRow({
            title: 'Show Daily Limit',
            subtitle: 'Toggle to switch between Daily (2000) and Monthly (60000) limits'
        });
        
        nanoGptGroup.add(nanoGptLimitRow);
        page.add(nanoGptGroup);

        settings.bind(
            'nano-gpt-api-key',
            nanoGptApiKeyRow,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.bind(
            'nano-gpt-enabled',
            nanoGptEnabledRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        settings.bind(
            'nano-gpt-show-daily-limit',
            nanoGptLimitRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        window.add(page);
    }
}