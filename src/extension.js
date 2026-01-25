import St from 'gi://St';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import PanelIndicator from './widgets/PanelIndicator.js';
import HeaderBar from './widgets/HeaderBar/HeaderBar.js';
import MainContent from './widgets/MainContent/MainContent.js';
import ApiService from './services/ApiService.js';
import ProviderStateManager from './services/ProviderStateManager.js';
import QuotaProcessor from './services/QuotaProcessor.js';
import DestroyHelper from './helpers/DestroyHelper.js';
import * as Locale from './locale.js';

export default class AIUsageExtension extends Extension {
    enable() {
        console.log('AIUsageExtension: enable() called');
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
        console.log('AIUsageExtension: Main layout created with style class:', this._mainLayout.get_style_class_name());

        // Header Bar (Settings + Provider Chooser + Refresh)
        this._headerBar = new HeaderBar({
            providerStateManager: this._providerStateManager
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
        this._mainContent = new MainContent();
        this._mainContent.connect('settings-clicked', () => {
            this.openPreferences();
        });

        this._mainLayout.add_child(this._headerBar);
        this._mainLayout.add_child(this._mainContent);

        // Add the custom layout to the menu
        this._indicator.menu.box.add_child(this._mainLayout);

        Main.panel.addToStatusArea(this.uuid, this._indicator);
        console.log('AIUsageExtension: Added to status area');

        // Connect HeaderBar provider-changed signal to load quota
        this._headerBar.connect('provider-changed', (_headerBar, providerKey) => {
            if (providerKey) {
                this._loadQuota(providerKey).catch(err => console.error('Failed to load quota:', err));
            } else {
                this._mainContent.showNoProviders();
            }
        });

        // Listen for menu open to refresh limits
        this._menuOpenSignalId = this._panelIndicator.connect('menu-open-state-changed', (indicator, open) => {
            if (open) {
                const currentProvider = this._providerStateManager.getCurrentProvider();
                if (currentProvider && this._providerStateManager.isProviderActive(currentProvider)) {
                    this._loadQuota(currentProvider).catch(err => console.error('Failed to load quota:', err));
                } else {
                    this._mainContent.showNoProviders();
                }
            }
        });

        // Initialize state - ProviderStateManager will auto-select first active provider
        this._providerStateManager.setCurrentProvider(null);

        console.log('AIUsageExtension: enable() completed successfully');
    }

    async _loadQuota(providerKey) {
        const provider = this._providerStateManager.getProvider(providerKey);
        if (!provider) return;

        const providerSettings = this._providerStateManager.getProviderSettings(providerKey);

        this._mainContent.clear();

        if (!providerSettings.apiKey) {
            this._mainContent.showError(Locale.gettext('API Key missing.\nPlease set it in Extension Settings.'), true);
            return;
        }

        this._mainContent.showLoading();
        try {
            const parsedData = await this._apiService.fetchQuota(provider, providerKey);

            if (!this._mainContent) return;

            this._mainContent.clear();

            const processedData = QuotaProcessor.process({
                limit: parsedData.limit,
                used: parsedData.used,
                renewsAt: parsedData.renewsAt
            });

            this._mainContent.showQuota(
                processedData.used,
                processedData.limit,
                processedData.renewsIn,
                processedData.percentage
            );
        } catch (e) {
            if (this._mainContent && this._mainContent.get_parent()) {
                this._mainContent.showError(`${Locale.gettext('Error')}: ${e.message}`);
            }
            console.error(e);
        }
    }

    disable() {
        console.log('AIUsageExtension: disable() called');

        this._menuOpenSignalId = DestroyHelper.disconnectSignal(this._panelIndicator, this._menuOpenSignalId);

        this._mainContent = DestroyHelper.safeDestroy(this._mainContent, 'mainContent');
        this._headerBar = DestroyHelper.safeDestroy(this._headerBar, 'headerBar');
        this._panelIndicator = DestroyHelper.safeDestroy(this._panelIndicator, 'panelIndicator');
        this._indicator = null;
        this._apiService = DestroyHelper.safeDestroy(this._apiService, 'apiService');
        this._providerStateManager = DestroyHelper.safeDestroy(this._providerStateManager, 'providerStateManager');
        this._mainLayout = null;

        console.log('AIUsageExtension: disable() completed');
    }
}
