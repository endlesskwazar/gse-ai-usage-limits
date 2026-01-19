import GObject from 'gi://GObject';
import St from 'gi://St';

import SettingsButton from './SettingsButton.js';
import ProviderDropdown from './ProviderDropdown.js';
import RefreshButton from './RefreshButton.js';

const HeaderBar = GObject.registerClass(
    {
        Signals: {
            'refresh-clicked': {},
            'settings-clicked': {},
            'provider-changed': {
                param_types: [GObject.TYPE_STRING]
            }
        }
    },
    class HeaderBar extends St.BoxLayout {
        _init({ providerStateManager, openPreferences, onRefresh }) {
            super._init({
                vertical: false,
                style_class: 'ai-usage-header-box',
                x_expand: true
            });

            this._providerStateManager = providerStateManager;
            this._openPreferences = openPreferences;
            this._onRefresh = onRefresh;

            // Left side: Settings Button
            this._settingsButton = new SettingsButton();
            this._settingsButton.connect('settings-clicked', () => {
                this.emit('settings-clicked');
                if (this._openPreferences) {
                    this._openPreferences();
                }
            });
            this.add_child(this._settingsButton);

            // Center: Provider Dropdown Widget
            this._providerDropdown = new ProviderDropdown({
                providerStateManager: this._providerStateManager
            });
            this._providerDropdown.connect('provider-changed', (_dropdown, providerKey) => {
                this.emit('provider-changed', providerKey);
            });
            this.add_child(this._providerDropdown);

            // Right side: Refresh Button
            this._refreshButton = new RefreshButton();
            this._refreshButton.connect('refresh-clicked', () => {
                this.emit('refresh-clicked');
                if (this._onRefresh) {
                    this._onRefresh();
                }
            });
            this.add_child(this._refreshButton);

            // Connect to provider state changes to manage refresh button state
            this._providerChangedSignalId = this._providerStateManager.connect(
                'provider-changed',
                (_psm, providerKey) => {
                    if (providerKey) {
                        this._refreshButton.setEnabled(true);
                    } else {
                        this._refreshButton.setEnabled(false);
                    }
                }
            );

            this._currentProviderInvalidSignalId = this._providerStateManager.connect(
                'current-provider-invalid',
                () => {
                    this._refreshButton.setEnabled(false);
                }
            );
        }

        setRefreshEnabled(enabled) {
            if (this._refreshButton) {
                this._refreshButton.setEnabled(enabled);
            }
        }

        get providerDropdown() {
            return this._providerDropdown;
        }

        get refreshButton() {
            return this._refreshButton;
        }

        get settingsButton() {
            return this._settingsButton;
        }

        destroy() {
            if (this._providerStateManager && this._providerChangedSignalId) {
                this._providerStateManager.disconnect(this._providerChangedSignalId);
                this._providerChangedSignalId = null;
            }

            if (this._providerStateManager && this._currentProviderInvalidSignalId) {
                this._providerStateManager.disconnect(this._currentProviderInvalidSignalId);
                this._currentProviderInvalidSignalId = null;
            }

            if (this._settingsButton) {
                this._settingsButton.destroy();
                this._settingsButton = null;
            }

            if (this._providerDropdown) {
                this._providerDropdown.destroy();
                this._providerDropdown = null;
            }

            if (this._refreshButton) {
                this._refreshButton.destroy();
                this._refreshButton = null;
            }

            this._providerStateManager = null;
            this._openPreferences = null;
            this._onRefresh = null;
        }
    }
);

export default HeaderBar;
