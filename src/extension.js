import Clutter from 'gi://Clutter';
import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import PanelIndicator from './widgets/PanelIndicator.js';
import CircularProgress from './widgets/CircularProgress.js';
import StatusDetails from './widgets/StatusDetails.js';
import HeaderBar from './widgets/HeaderBar/HeaderBar.js';
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

        // Create the Panel Indicator
        this._panelIndicator = new PanelIndicator(() => this.openPreferences());
        this._indicator = this._panelIndicator.getIndicator();

        // Connect to panel indicator signals
        this._panelIndicator.connect('close-extension', () => {
            Main.extensionManager.disableExtension(this.uuid);
        });

        // --- Interface ---

        // Main container inside the menu
        this._mainLayout = new St.BoxLayout({
            vertical: true,
            style_class: 'ai-usage-main-container'
        });

        // Header Bar (Settings + Provider Chooser + Refresh)
        this._headerBar = new HeaderBar({
            providerStateManager: this._providerStateManager,
            openPreferences: () => this.openPreferences(),
            onRefresh: () => {
                const currentProvider = this._providerStateManager.getCurrentProvider();
                if (currentProvider) {
                    this._loadQuota(currentProvider).catch(err => console.error('Failed to load quota:', err));
                }
            }
        });

        // Connect to HeaderBar signals
        this._headerBar.connect('refresh-clicked', () => {
            const currentProvider = this._providerStateManager.getCurrentProvider();
            if (currentProvider) {
                this._loadQuota(currentProvider).catch(err => console.error('Failed to load quota:', err));
            }
        });

        this._headerBar.connect('settings-clicked', () => {
            this.openPreferences();
        });

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

        // Connect HeaderBar provider-changed signal to load quota
        this._headerBar.connect('provider-changed', (_headerBar, providerKey) => {
            if (providerKey) {
                this._loadQuota(providerKey).catch(err => console.error('Failed to load quota:', err));
            } else {
                this._showNoProvidersMessage();
            }
        });

        // Listen for menu open to refresh limits
        this._menuOpenSignalId = this._panelIndicator.connect('menu-open-state-changed', (indicator, open) => {
            if (open) {
                const currentProvider = this._providerStateManager.getCurrentProvider();
                if (currentProvider && this._providerStateManager.isProviderActive(currentProvider)) {
                    this._loadQuota(currentProvider).catch(err => console.error('Failed to load quota:', err));
                } else {
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

            const processedData = QuotaProcessor.process({
                limit: parsedData.limit,
                used: parsedData.used,
                renewsAt: parsedData.renewsAt
            });

            let renewsStr = processedData.renewsIn;

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

    disable() {
        if (this._indicator && this._indicator.menu && this._menuOpenSignalId) {
            this._indicator.menu.disconnect(this._menuOpenSignalId);
            this._menuOpenSignalId = null;
        }

        if (this._headerBar) {
            this._headerBar.destroy();
            this._headerBar = null;
        }

        if (this._panelIndicator) {
            this._panelIndicator.destroy();
            this._panelIndicator = null;
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
        this._contentArea = null;
    }
}
