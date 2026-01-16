import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const PROVIDERS = [
    {
        id: 'synthetic',
        name: 'Synthetic',
        description: 'AI service provider',
        settingKey: 'synthetic-api-key',
        enabledKey: 'synthetic-enabled'
    },
    {
        id: 'chutes',
        name: 'Chutes.ai',
        description: 'AI service provider',
        settingKey: 'chutes-api-key',
        enabledKey: 'chutes-enabled'
    },
    {
        id: 'nano-gpt',
        name: 'Nano-GPT',
        description: 'AI service provider',
        settingKey: 'nano-gpt-api-key',
        enabledKey: 'nano-gpt-enabled',
        hasDailyToggle: true,
        dailyToggleKey: 'nano-gpt-show-daily-limit'
    }
];

export default class AIUsagePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        page.title = 'Providers';
        page.iconName = 'applications-symbolic';
        window.add(page);

        const providersGroup = new Adw.PreferencesGroup({
            title: 'Providers',
            description: 'Select a provider to configure'
        });
        page.add(providersGroup);

        PROVIDERS.forEach(provider => {
            const actionRow = new Adw.ActionRow({
                title: provider.name,
                subtitle: provider.description,
                activatable: true
            });

            actionRow.add_suffix(
                new Gtk.Image({
                    icon_name: 'go-next-symbolic',
                    pixel_size: 16
                })
            );

            actionRow.connect('activated', () => {
                const dialog = this._createProviderDialog(window, settings, provider);
                dialog.present(window);
            });

            providersGroup.add(actionRow);
        });
    }

    _createProviderDialog(parent, settings, provider) {
        const dialog = new Adw.PreferencesDialog({
            title: provider.name
        });

        const page = new Adw.PreferencesPage();
        dialog.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Configuration'
        });
        page.add(group);

        const apiKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key'
        });
        group.add(apiKeyRow);

        const enabledRow = new Adw.SwitchRow({
            title: 'Enable Provider'
        });
        group.add(enabledRow);

        if (provider.hasDailyToggle) {
            const dailyToggleRow = new Adw.SwitchRow({
                title: 'Show Daily Limit',
                subtitle: 'Toggle to switch between Daily (2000) and Monthly (60000) limits'
            });
            group.add(dailyToggleRow);

            settings.bind(provider.dailyToggleKey, dailyToggleRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        }

        settings.bind(provider.settingKey, apiKeyRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        settings.bind(provider.enabledKey, enabledRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        return dialog;
    }
}
