import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Providers from './providers/index.js';
import * as Locale from './locale.js';

export default class AIUsagePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        Locale.init(this);
        const settings = this.getSettings();
        const providers = Providers.getProviders();
        const providerKeys = Object.keys(providers);

        const page = new Adw.PreferencesPage();
        page.title = Locale.gettext('Providers');
        page.iconName = 'applications-symbolic';
        window.add(page);

        const providersGroup = new Adw.PreferencesGroup({
            title: Locale.gettext('Providers'),
            description: Locale.gettext('Select a provider to configure')
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

    /**
     * Display a temporary status message on a button and restore original state after a delay
     * Used to show feedback for async operations like credential detection
     * @param {Gtk.Button} button - The button to display feedback on (e.g., auto-detect button)
     * @param {string} feedbackMessage - The message to display temporarily (e.g., 'Found!', 'Not found')
     * @param {number} duration - How long to show the feedback in milliseconds before restoring original state (default: 2000)
     */
    _showTemporaryFeedback(button, feedbackMessage, duration = 2000) {
        const originalLabel = button.label;
        button.label = feedbackMessage;
        button.sensitive = false;

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration, () => {
            button.label = originalLabel;
            button.sensitive = true;
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Read OAuth token from Claude Code credentials file
     * @returns {string|null} The access token or null if not found
     */
    _readClaudeCredentials(credentialsPath) {
        try {
            const homePath = GLib.get_home_dir();
            const fullPath = GLib.build_filenamev([homePath, credentialsPath]);
            const file = Gio.File.new_for_path(fullPath);

            if (!file.query_exists(null)) {
                return null;
            }

            const [success, contents] = file.load_contents(null);
            if (!success) {
                return null;
            }

            const decoder = new TextDecoder();
            const json = JSON.parse(decoder.decode(contents));

            if (json.claudeAiOauth && json.claudeAiOauth.accessToken) {
                return json.claudeAiOauth.accessToken;
            }

            return null;
        } catch (e) {
            console.error('Failed to read Claude credentials:', e.message);
            return null;
        }
    }

    _createProviderDialog(parent, settings, provider) {
        const dialog = new Adw.PreferencesDialog({
            title: provider.name
        });

        const page = new Adw.PreferencesPage();
        dialog.add(page);

        const group = new Adw.PreferencesGroup({
            title: Locale.gettext('Configuration')
        });
        page.add(group);

        // Determine if this is an OAuth provider (like Claude)
        const isOAuthProvider = !!provider.oauthCredentials;

        // For OAuth providers, show hint about the token
        if (isOAuthProvider) {
            const hintRow = new Adw.ActionRow({
                title: Locale.gettext('About OAuth Token'),
                subtitle: provider.oauthCredentials.hint
            });
            hintRow.add_prefix(
                new Gtk.Image({
                    icon_name: 'dialog-information-symbolic',
                    pixel_size: 16
                })
            );
            group.add(hintRow);
        }

        // Create the token/key entry row
        const apiKeyRow = new Adw.PasswordEntryRow({
            title: isOAuthProvider ? Locale.gettext('OAuth Token') : Locale.gettext('API Key')
        });
        group.add(apiKeyRow);

        // For OAuth providers, add auto-detect button
        if (isOAuthProvider) {
            const autoDetectRow = new Adw.ActionRow({
                title: Locale.gettext('Auto-detect Token'),
                subtitle: Locale.gettext('Read token from ~/.claude/.credentials.json')
            });

            const autoDetectButton = new Gtk.Button({
                label: Locale.gettext('Detect'),
                valign: Gtk.Align.CENTER
            });

            autoDetectButton.connect('clicked', () => {
                const token = this._readClaudeCredentials(provider.oauthCredentials.path);
                if (token) {
                    settings.set_string(provider.settingKey, token);
                    this._showTemporaryFeedback(autoDetectButton, Locale.gettext('Found!'));
                } else {
                    this._showTemporaryFeedback(autoDetectButton, Locale.gettext('Not found'));
                }
            });

            autoDetectRow.add_suffix(autoDetectButton);
            group.add(autoDetectRow);
        }

        const enabledRow = new Adw.SwitchRow({
            title: Locale.gettext('Enable Provider')
        });
        group.add(enabledRow);

        if (provider.hasDailyToggle) {
            const dailyToggleRow = new Adw.SwitchRow({
                title: Locale.gettext('Show Daily Limit'),
                subtitle: Locale.gettext('Toggle to switch between Daily (2000) and Monthly (60000) limits')
            });
            group.add(dailyToggleRow);

            settings.bind(provider.dailyToggleKey, dailyToggleRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        }

        if (provider.hasLimitTypeToggle) {
            const limitTypeModel = new Gtk.StringList();
            limitTypeModel.append(Locale.gettext('5-hour rolling'));
            limitTypeModel.append(Locale.gettext('7-day weekly'));
            limitTypeModel.append(Locale.gettext('7-day Opus (Max plan)'));

            const limitTypeRow = new Adw.ComboRow({
                title: Locale.gettext('Limit Type'),
                subtitle: Locale.gettext('Select which usage limit to display'),
                model: limitTypeModel
            });
            group.add(limitTypeRow);

            limitTypeRow.selected = settings.get_int(provider.limitTypeToggleKey);
            limitTypeRow.connect('notify::selected', row => {
                settings.set_int(provider.limitTypeToggleKey, row.selected);
            });
        }

        // Bind API key/token to settings
        settings.bind(provider.settingKey, apiKeyRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        const updateEnabledSwitchState = () => {
            const apiKey = settings.get_string(provider.settingKey);
            const hasApiKey = apiKey && apiKey.length > 0;
            const isCurrentlyEnabled = settings.get_boolean(provider.enabledKey);

            enabledRow.sensitive = hasApiKey;
            enabledRow.active = isCurrentlyEnabled;
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
