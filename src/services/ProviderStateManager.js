import GObject from 'gi://GObject';
import ProviderConfig from '../providers/ProviderConfig.js';
import SettingsHelper from './SettingsHelper.js';

/**
 * ProviderStateManager - Centralized provider state management
 *
 * This class provides a single source of truth for all provider state.
 * It owns the settings reference and maintains current provider state,
 * emitting signals when state changes occur.
 *
 * Benefits:
 * - Single source of truth for provider state
 * - Reactive programming model via GObject signals
 * - Eliminates code duplication
 * - Loose coupling between components
 * - Easy to test in isolation
 * - Consistent behavior across the application
 */
const ProviderStateManager = GObject.registerClass(
    {
        Signals: {
            'provider-changed': {
                param_types: [GObject.TYPE_STRING]
            },
            'providers-updated': {
                param_types: []
            },
            'current-provider-invalid': {
                param_types: []
            }
        }
    },
    class ProviderStateManager extends GObject.Object {
        /**
         * Constructor
         * @param {Object} settings - GSettings object for accessing provider configuration
         */
        _init(settings) {
            super._init();
            this._settingsHelper = new SettingsHelper(settings);
            this._currentProviderKey = null;
            this._providersCache = ProviderConfig.getProviders();
            this._providerKeysCache = Object.keys(this._providersCache);
            this._settingsSignalId = null;

            // Listen for settings changes
            this._settingsSignalId = this._settingsHelper.connect('changed', () => {
                this._onSettingsChanged();
            });
        }

        /**
         * Handle settings changes
         * @private
         */
        _onSettingsChanged() {
            this.emit('providers-updated');

            // Check if current provider is still valid
            if (this._currentProviderKey && !this.isProviderActive(this._currentProviderKey)) {
                this._handleInvalidCurrentProvider();
            } else if (!this._currentProviderKey && this.getActiveProviders().length > 0) {
                // If we were in "No Providers" state but now have one
                this.setCurrentProvider(null);
            }
        }

        /**
         * Handle when current provider becomes invalid
         * @private
         */
        _handleInvalidCurrentProvider() {
            const firstActive = this.getFirstActiveProvider();
            if (firstActive) {
                this.setCurrentProvider(firstActive);
            } else {
                this._currentProviderKey = null;
                this.emit('current-provider-invalid');
            }
        }

        /**
         * Get the current provider key
         * @returns {string|null} The current provider key, or null if none selected
         */
        getCurrentProvider() {
            return this._currentProviderKey;
        }

        /**
         * Set the current provider
         * If providerKey is null, automatically selects the first active provider
         * @param {string|null} providerKey - The provider identifier, or null to auto-select
         */
        setCurrentProvider(providerKey) {
            let newKey = providerKey;

            // Auto-select first active provider if null
            if (newKey === null) {
                const activeProviders = this.getActiveProviders();
                if (activeProviders.length > 0) {
                    newKey = activeProviders[0];
                } else {
                    newKey = null;
                }
            }

            // Only emit if the provider actually changed
            if (newKey !== this._currentProviderKey) {
                this._currentProviderKey = newKey;
                this.emit('provider-changed', this._currentProviderKey);
            }
        }

        /**
         * Refresh all provider states from settings
         * This triggers a providers-updated signal
         */
        refreshState() {
            this.emit('providers-updated');
        }

        /**
         * Check if a provider is active (has a valid API key and is enabled)
         * @param {string} providerKey - The provider identifier (e.g., 'synthetic', 'chutes')
         * @returns {boolean} True if the provider is active, false otherwise
         */
        isProviderActive(providerKey) {
            const provider = this._providersCache[providerKey];
            if (!provider) {
                return false;
            }

            const apiKey = this._settingsHelper.getProviderApiKey(providerKey);
            const enabled = this._settingsHelper.isProviderEnabled(providerKey);

            return apiKey && apiKey.length > 0 && enabled;
        }

        /**
         * Get all active provider keys
         * @returns {string[]} Array of active provider keys
         */
        getActiveProviders() {
            return this._providerKeysCache.filter(key => this.isProviderActive(key));
        }

        /**
         * Get settings for a specific provider (API key and enabled state)
         * @param {string} providerKey - The provider identifier
         * @returns {Object|null} Object with apiKey and enabled properties, or null if provider not found
         */
        getProviderSettings(providerKey) {
            const provider = this._providersCache[providerKey];
            if (!provider) {
                return null;
            }

            return {
                apiKey: this._settingsHelper.getProviderApiKey(providerKey),
                enabled: this._settingsHelper.isProviderEnabled(providerKey)
            };
        }

        /**
         * Validate that a provider key exists in the provider configuration
         * @param {string} providerKey - The provider identifier to validate
         * @returns {boolean} True if the provider exists, false otherwise
         */
        validateProvider(providerKey) {
            return providerKey in this._providersCache;
        }

        /**
         * Check if a provider is configured (has an API key, regardless of enabled state)
         * @param {string} providerKey - The provider identifier
         * @returns {boolean} True if the provider has an API key, false otherwise
         */
        isProviderConfigured(providerKey) {
            const provider = this._providersCache[providerKey];
            if (!provider) {
                return false;
            }

            const apiKey = this._settingsHelper.getProviderApiKey(providerKey);
            return apiKey && apiKey.length > 0;
        }

        /**
         * Get the first active provider
         * @returns {string|null} The first active provider key, or null if none are active
         */
        getFirstActiveProvider() {
            const activeProviders = this.getActiveProviders();
            return activeProviders.length > 0 ? activeProviders[0] : null;
        }

        /**
         * Get all provider configurations
         * @returns {Object} Provider configuration objects keyed by provider ID
         */
        getProviders() {
            return this._providersCache;
        }

        /**
         * Get all provider keys
         * @returns {string[]} Array of provider keys
         */
        getProviderKeys() {
            return this._providerKeysCache;
        }

        /**
         * Get a specific provider configuration by key
         * @param {string} providerKey - The provider identifier
         * @returns {Object|null} Provider configuration or null if not found
         */
        getProvider(providerKey) {
            return this._providersCache[providerKey] || null;
        }

        /**
         * Get provider names as a mapping
         * @returns {Object} Provider key to name mapping
         */
        getProviderNames() {
            return Object.fromEntries(
                Object.entries(this._providersCache).map(([key, provider]) => [key, provider.name])
            );
        }

        /**
         * Clean up resources when the manager is no longer needed
         */
        destroy() {
            if (this._settingsHelper && this._settingsSignalId) {
                this._settingsHelper.disconnect(this._settingsSignalId);
                this._settingsSignalId = null;
            }
            this._settingsHelper = null;
            this._currentProviderKey = null;
            this._providersCache = null;
            this._providerKeysCache = null;
        }
    }
);

export default ProviderStateManager;
