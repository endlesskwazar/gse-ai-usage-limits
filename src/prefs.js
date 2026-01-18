import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import ProviderConfig from './providers/ProviderConfig.js';

export default class AIUsagePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const providers = ProviderConfig.getProviders();
        const providerKeys = Object.keys(providers);

        const page = new Adw.PreferencesPage();
        page.title = 'Providers';
        page.iconName = 'applications-symbolic';
        window.add(page);

        const providersGroup = new Adw.PreferencesGroup({
            title: 'Providers',
            description: 'Select a provider to configure'
        });
        page.add(providersGroup);

        providerKeys.forEach(key => {
            const provider = providers[key];
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

        const updateEnabledSwitchState = () => {
            const apiKey = settings.get_string(provider.settingKey);
            const hasApiKey = apiKey && apiKey.length > 0;
            const isCurrentlyEnabled = settings.get_boolean(provider.enabledKey);

            enabledRow.sensitive = hasApiKey;

            if (hasApiKey && !isCurrentlyEnabled) {
                settings.set_boolean(provider.enabledKey, true);
            }

            enabledRow.active = settings.get_boolean(provider.enabledKey);
        };

        const apiKeyChangedId = settings.connect(`changed::${provider.settingKey}`, () => {
            updateEnabledSwitchState();
        });

        const enabledChangedId = settings.connect(`changed::${provider.enabledKey}`, () => {
            enabledRow.active = settings.get_boolean(provider.enabledKey);
        });

        enabledRow.connect('notify::active', row => {
            const apiKey = settings.get_string(provider.settingKey);
            const hasApiKey = apiKey && apiKey.length > 0;

            if (!hasApiKey && row.active) {
                row.active = false;
                return;
            }

            settings.set_boolean(provider.enabledKey, row.active);
        });

        updateEnabledSwitchState();

        dialog.connect('closed', () => {
            settings.disconnect(apiKeyChangedId);
            settings.disconnect(enabledChangedId);
        });

        return dialog;
    }
}
