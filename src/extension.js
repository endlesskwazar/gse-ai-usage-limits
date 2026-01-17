import Clutter from 'gi://Clutter';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import CircularProgress from './widgets/CircularProgress.js';
import ProviderDropdown from './widgets/ProviderDropdown.js';
import RefreshButton from './widgets/RefreshButton.js';
import ApiService from './services/ApiService.js';
import ProviderStateManager from './services/ProviderStateManager.js';

export default class AIUsageExtension extends Extension {
    enable() {
        // Initialize ProviderStateManager
        this._providerStateManager = new ProviderStateManager(this.getSettings());

        // Initialize API service
        this._apiService = new ApiService(this._providerStateManager);

        // Create the Panel Menu Button
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        // Icon/Text on the panel
        let panelBox = new St.BoxLayout();

        let icon = new St.Icon({
            icon_name: 'thunderbolt-symbolic',
            style_class: 'system-status-icon'
        });
        panelBox.add_child(icon);
        this._indicator.add_child(panelBox);

        // --- Context Menu (Right Click) ---
        this._contextMenu = new PopupMenu.PopupMenu(this._indicator, 0.0, St.Side.TOP);
        Main.layoutManager.uiGroup.add_child(this._contextMenu.actor);
        this._contextMenu.actor.hide();

        // Add a menu manager to handle auto-closing
        this._menuManager = new PopupMenu.PopupMenuManager(this._indicator);
        this._menuManager.addMenu(this._contextMenu);

        let settingsItem = new PopupMenu.PopupMenuItem('Settings');
        settingsItem.connect('activate', () => {
            this.openPreferences();
        });
        this._contextMenu.addMenuItem(settingsItem);

        let closeItem = new PopupMenu.PopupMenuItem('Close Extension');
        closeItem.connect('activate', () => {
            Main.extensionManager.disableExtension(this.uuid);
        });
        this._contextMenu.addMenuItem(closeItem);

        // Handle Clicks
        this._indicator.connect('button-press-event', (actor, event) => {
            const button = event.get_button();
            if (button === Clutter.BUTTON_SECONDARY) {
                // Right click: Toggle Context Menu
                this._contextMenu.toggle();
                this._indicator.menu.close(); // Ensure main menu is closed
                return Clutter.EVENT_STOP;
            } else if (button === Clutter.BUTTON_PRIMARY) {
                // Left click: Close context menu
                this._contextMenu.close();
                return Clutter.EVENT_PROPAGATE;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // --- Interface ---

        // Main container inside the menu
        this._mainLayout = new St.BoxLayout({
            vertical: true,
            style_class: 'ai-usage-main-container'
        });

        // Header Bar (Refresh + Provider Chooser)
        this._headerBar = new St.BoxLayout({
            vertical: false,
            style_class: 'ai-usage-header-box',
            x_expand: true
        });

        // 1. Refresh Button
        this._refreshButton = new RefreshButton();
        this._refreshButton.connect('refresh-clicked', () => {
            const currentProvider = this._providerStateManager.getCurrentProvider();
            if (currentProvider) {
                this._loadQuota(currentProvider).catch(err => console.error('Failed to load quota:', err));
            }
        });
        this._headerBar.add_child(this._refreshButton);

        // 2. Provider Dropdown Widget
        this._providerDropdown = new ProviderDropdown({
            providerStateManager: this._providerStateManager
        });
        this._headerBar.add_child(this._providerDropdown);

        // Content Area
        this._contentArea = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'padding-bottom: 12px;'
        });

        this._mainLayout.add_child(this._headerBar);
        this._mainLayout.add_child(this._contentArea);

        // Add the custom layout to the menu
        this._indicator.menu.box.add_child(this._mainLayout);

        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // Listen for provider changes from ProviderStateManager
        this._providerChangedSignalId = this._providerStateManager.connect('provider-changed', (psm, providerKey) => {
            if (providerKey) {
                this._loadQuota(providerKey).catch(err => console.error('Failed to load quota:', err));
            } else {
                this._showNoProvidersMessage();
            }
        });

        // Listen for current provider becoming invalid
        this._currentProviderInvalidSignalId = this._providerStateManager.connect('current-provider-invalid', () => {
            this._showNoProvidersMessage();
        });

        // Listen for menu open to refresh limits
        this._menuOpenSignalId = this._indicator.menu.connect('open-state-changed', (menu, open) => {
            if (open) {
                const currentProvider = this._providerStateManager.getCurrentProvider();
                if (currentProvider && this._providerStateManager.isProviderActive(currentProvider)) {
                    this._loadQuota(currentProvider).catch(err => console.error('Failed to load quota:', err));
                }
            }
        });

        // Initialize state - ProviderStateManager will auto-select first active provider
        this._providerStateManager.setCurrentProvider(null);
    }

    _showNoProvidersMessage() {
        if (this._contentArea) {
            this._contentArea.destroy_all_children();
            let msg = new St.Label({
                text: 'No active providers.\nConfigure in Settings.',
                style_class: 'error-label',
                style: 'text-align: center; padding: 20px;',
                x_align: Clutter.ActorAlign.CENTER
            });
            this._contentArea.add_child(msg);
        }
    }

    async _loadQuota(providerKey) {
        const provider = this._providerStateManager.getProvider(providerKey);
        if (!provider) return;

        const providerSettings = this._providerStateManager.getProviderSettings(providerKey);

        // Clear Content immediately
        if (this._contentArea) {
            this._contentArea.destroy_all_children();
        }

        if (!providerSettings.apiKey) {
            // This case should theoretically be handled by provider state filtering,
            // but keep it as a fallback for safety.
            let errorLabel = new St.Label({
                text: 'API Key missing.\nPlease set it in Extension Settings.',
                style_class: 'error-label',
                style: 'text-align: center; padding: 20px;',
                x_align: Clutter.ActorAlign.CENTER
            });
            this._contentArea.add_child(errorLabel);
            return;
        }

        // Skeleton / Loading State
        let progressWidget = new CircularProgress(0, 'Loading...');
        this._contentArea.add_child(progressWidget);

        let detailsBox = new St.BoxLayout({
            vertical: true,
            style: 'padding-top: 6px; spacing: 4px;',
            x_align: Clutter.ActorAlign.CENTER
        });

        // Reserve space for text (2 lines)
        detailsBox.add_child(new St.Label({ text: ' ' }));
        detailsBox.add_child(
            new St.Label({
                text: ' ',
                style: 'font-size: 0.85em; opacity: 0.7;'
            })
        );

        this._contentArea.add_child(detailsBox);

        // Perform async request using ApiService
        try {
            const parsedData = await this._apiService.fetchQuota(provider, providerKey);

            // Check if extension is still active
            if (!this._indicator) return;

            // Clear "Loading..."
            this._contentArea.destroy_all_children();

            const limit = parsedData.limit;
            const requests = parsedData.used;
            const renewsAt = parsedData.renewsAt;

            let renewsStr = '';
            if (renewsAt && requests > 0) {
                const renewsDate = new Date(renewsAt);
                const diffMs = renewsDate - new Date();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                renewsStr = diffMs > 0 ? `${diffHrs}h ${diffMins}m` : 'Now';
            }

            let percentage = 0;
            if (limit > 0) {
                percentage = requests / limit;
            }

            // Display Progress
            let progressWidget = new CircularProgress(percentage);
            this._contentArea.add_child(progressWidget);

            // Display Details
            let detailsBox = new St.BoxLayout({
                vertical: true,
                style: 'padding-top: 6px; spacing: 4px;',
                x_align: Clutter.ActorAlign.CENTER
            });

            detailsBox.add_child(
                new St.Label({
                    text: `Used: ${requests} / ${limit}`,
                    x_align: Clutter.ActorAlign.CENTER
                })
            );

            if (renewsStr) {
                detailsBox.add_child(
                    new St.Label({
                        text: `Renews in: ${renewsStr}`,
                        style: 'font-size: 0.85em; opacity: 0.7;',
                        x_align: Clutter.ActorAlign.CENTER
                    })
                );
            }

            this._contentArea.add_child(detailsBox);
        } catch (e) {
            // Determine if this._contentArea is still valid to write to
            if (this._contentArea && this._contentArea.get_parent()) {
                this._contentArea.destroy_all_children();
                let errLabel = new St.Label({
                    text: `Error: ${e.message}`,
                    style: 'color: red; padding: 10px;',
                    x_align: Clutter.ActorAlign.CENTER
                });
                this._contentArea.add_child(errLabel);
            }
            console.error(e);
        }
    }

    disable() {
        if (this._providerStateManager && this._providerChangedSignalId) {
            this._providerStateManager.disconnect(this._providerChangedSignalId);
            this._providerChangedSignalId = null;
        }

        if (this._providerStateManager && this._currentProviderInvalidSignalId) {
            this._providerStateManager.disconnect(this._currentProviderInvalidSignalId);
            this._currentProviderInvalidSignalId = null;
        }

        if (this._indicator && this._indicator.menu && this._menuOpenSignalId) {
            this._indicator.menu.disconnect(this._menuOpenSignalId);
            this._menuOpenSignalId = null;
        }

        if (this._menuManager) {
            this._menuManager = null;
        }
        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        if (this._apiService) {
            this._apiService.destroy();
            this._apiService = null;
        }
        if (this._providerStateManager) {
            this._providerStateManager.destroy();
            this._providerStateManager = null;
        }
        this._headerBar = null;
        this._providerDropdown = null;
        this._contentArea = null;
    }
}
