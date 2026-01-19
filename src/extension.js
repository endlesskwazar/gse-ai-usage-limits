import Clutter from 'gi://Clutter';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import CircularProgress from './widgets/CircularProgress.js';
import StatusDetails from './widgets/StatusDetails.js';
import ProviderDropdown from './widgets/ProviderDropdown.js';
import RefreshButton from './widgets/RefreshButton.js';
import ContextMenu from './widgets/ContextMenu.js';
import NoProvidersMsgBox from './widgets/NoProvidersMsgBox.js';
import ApiService from './services/ApiService.js';
import ProviderStateManager from './services/ProviderStateManager.js';
import QuotaProcessor from './services/QuotaProcessor.js';
import * as Locale from './locale.js';

export default class AIUsageExtension extends Extension {
    enable() {
        Locale.init(this);

        // Initialize ProviderStateManager
        this._providerStateManager = new ProviderStateManager(this.getSettings());

        // Initialize API service
        this._apiService = new ApiService(this._providerStateManager);

        // Initialize QuotaProcessor
        this._quotaProcessor = new QuotaProcessor();

        // Create the Panel Menu Button
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
        this._indicator.add_style_class_name('ai-usage-indicator');
        this._currentButton = this._indicator;
        this._indicator.menu.destroy();

        this._indicator.menu = new PopupMenu.PopupMenu(this._indicator, 0.5, St.Side.TOP);
        Main.layoutManager.uiGroup.add_child(this._indicator.menu.actor);
        this._indicator.menu.actor.add_style_class_name('popup-menu');
        this._indicator.menu.actor.hide();

        Main.panel.menuManager.addMenu(this._indicator.menu);

        // Icon/Text on the panel
        let panelBox = new St.BoxLayout();

        let icon = new St.Icon({
            icon_name: 'thunderbolt-symbolic',
            style_class: 'system-status-icon'
        });
        panelBox.add_child(icon);
        this._indicator.add_child(panelBox);

        // Track hover state
        this._isHovered = false;
        this._isMenuOpen = false;

        this._indicator.connect('enter-event', () => {
            this._isHovered = true;
            this._updateHoverState();
        });

        this._indicator.connect('leave-event', () => {
            this._isHovered = false;
            this._updateHoverState();
        });

        // --- Context Menu (Right Click) ---
        this._contextMenu = new ContextMenu(this._indicator, () => this.openPreferences());
        this._contextMenu.connect('close-extension', () => {
            Main.extensionManager.disableExtension(this.uuid);
        });

        // Track context menu open state
        this._contextMenu._menu.connect('open-state-changed', (menu, open) => {
            this._isMenuOpen = open;
            this._updateHoverState();
        });

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
                this._refreshButton.setEnabled(true);
                this._loadQuota(providerKey).catch(err => console.error('Failed to load quota:', err));
            } else {
                this._refreshButton.setEnabled(false);
                this._showNoProvidersMessage();
            }
        });

        // Listen for current provider becoming invalid
        this._currentProviderInvalidSignalId = this._providerStateManager.connect('current-provider-invalid', () => {
            this._refreshButton.setEnabled(false);
            this._showNoProvidersMessage();
        });

        // Listen for menu open to refresh limits and track menu state for hover
        this._menuOpenSignalId = this._indicator.menu.connect('open-state-changed', (menu, open) => {
            this._isMenuOpen = open || (this._contextMenu && this._contextMenu._menu.isOpen);
            this._updateHoverState();

            if (open) {
                const currentProvider = this._providerStateManager.getCurrentProvider();
                if (currentProvider && this._providerStateManager.isProviderActive(currentProvider)) {
                    this._refreshButton.setEnabled(true);
                    this._loadQuota(currentProvider).catch(err => console.error('Failed to load quota:', err));
                } else {
                    this._refreshButton.setEnabled(false);
                    this._showNoProvidersMessage();
                }
            }
        });

        // Initialize state - ProviderStateManager will auto-select first active provider
        this._providerStateManager.setCurrentProvider(null);
    }

    _showNoProvidersMessage() {
        if (this._contentArea) {
            this._contentArea.destroy_all_children();
            const msgBox = new NoProvidersMsgBox();
            msgBox.connect('settings-clicked', () => this.openPreferences());
            this._contentArea.add_child(msgBox);
        }
    }

    _showLoadingUI() {
        let progressWidget = new CircularProgress(0, Locale.gettext('Loading...'));
        this._contentArea.add_child(progressWidget);

        let statusDetails = new StatusDetails();
        this._contentArea.add_child(statusDetails);
    }

    _showQuotaUI(used, limit, renewsStr, percentage) {
        let progressWidget = new CircularProgress(percentage);
        this._contentArea.add_child(progressWidget);

        let statusDetails = new StatusDetails();
        statusDetails.update(used, limit, renewsStr);
        this._contentArea.add_child(statusDetails);
    }

    async _loadQuota(providerKey) {
        const provider = this._providerStateManager.getProvider(providerKey);
        if (!provider) return;

        const providerSettings = this._providerStateManager.getProviderSettings(providerKey);

        if (this._contentArea) {
            this._contentArea.destroy_all_children();
        }

        if (!providerSettings.apiKey) {
            let errorLabel = new St.Label({
                text: Locale.gettext('API Key missing.\nPlease set it in Extension Settings.'),
                style_class: 'error-label',
                style: 'text-align: center; padding: 20px 20px 20px 20px',
                x_align: Clutter.ActorAlign.CENTER
            });
            this._contentArea.add_child(errorLabel);
            return;
        }

        this._showLoadingUI();
        try {
            const parsedData = await this._apiService.fetchQuota(provider, providerKey);

            if (!this._contentArea) return;

            this._contentArea.destroy_all_children();

            const processedData = this._quotaProcessor.process({
                limit: parsedData.limit,
                used: parsedData.used,
                renewsAt: parsedData.renewsAt
            });

            let renewsStr = '';
            const timeUntilRenew = processedData.timeUntilRenew;
            if (timeUntilRenew !== null && processedData.used > 0) {
                const diffHrs = Math.floor(timeUntilRenew / (1000 * 60 * 60));
                const diffMins = Math.floor((timeUntilRenew % (1000 * 60 * 60)) / (1000 * 60));
                renewsStr = timeUntilRenew > 0 ? `${diffHrs}h ${diffMins}m` : 'Now';
            }

            this._showQuotaUI(processedData.used, processedData.limit, renewsStr, processedData.percentage);
        } catch (e) {
            if (this._contentArea && this._contentArea.get_parent()) {
                this._contentArea.destroy_all_children();
                let errLabel = new St.Label({
                    text: `${Locale.gettext('Error')}: ${e.message}`,
                    style: 'color: red; padding: 10px 10px 10px 10px',
                    x_align: Clutter.ActorAlign.CENTER
                });
                this._contentArea.add_child(errLabel);
            }
            console.error(e);
        }
    }

    _updateHoverState() {
        if (this._isHovered || this._isMenuOpen) {
            this._add_style_pseudo_class('hover');
        } else {
            this._remove_style_pseudo_class('hover');
        }
    }

    _add_style_pseudo_class(pseudo_class) {
        if (this._currentButton && this._currentButton.add_style_pseudo_class) {
            this._currentButton.add_style_pseudo_class(pseudo_class);
        }
    }

    _remove_style_pseudo_class(pseudo_class) {
        if (this._currentButton && this._currentButton.remove_style_pseudo_class) {
            this._currentButton.remove_style_pseudo_class(pseudo_class);
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

        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }
        if (this._indicator) {
            this._indicator.menu.destroy();
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
        if (this._quotaProcessor) {
            this._quotaProcessor = null;
        }
        this._headerBar = null;
        this._providerDropdown = null;
        this._contentArea = null;
    }
}
