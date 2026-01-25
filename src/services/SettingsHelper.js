import Providers from '../providers/index.js';

/**
 * SettingsHelper provides type-safe, centralized access to extension settings
 *
 * Benefits:
 * - Type safety: Methods prevent typos in setting keys
 * - Encapsulation: Settings access logic is centralized
 * - Easier testing: Can mock SettingsHelper in tests
 * - Better IDE support: Methods are discoverable via autocomplete
 * - Consistent API: Single way to access settings across the codebase
 */
export default class SettingsHelper {
    /**
     * Constructor
     * @param {Object} settings - GSettings object for accessing extension configuration
     */
    constructor(settings) {
        this._settings = settings;
    }

    /**
     * Get API key for a specific provider
     * @param {string} providerKey - The provider identifier (e.g., 'synthetic', 'chutes')
     * @returns {string} The API key, or empty string if provider not found
     */
    getProviderApiKey(providerKey) {
        const provider = Providers.getProvider(providerKey);
        if (!provider) return '';
        return this._settings.get_string(provider.settingKey);
    }

    /**
     * Set API key for a specific provider
     * @param {string} providerKey - The provider identifier
     * @param {string} apiKey - The API key to set
     */
    setProviderApiKey(providerKey, apiKey) {
        const provider = Providers.getProvider(providerKey);
        if (!provider) return;
        this._settings.set_string(provider.settingKey, apiKey);
    }

    /**
     * Check if a provider is enabled
     * @param {string} providerKey - The provider identifier
     * @returns {boolean} True if the provider is enabled, false otherwise
     */
    isProviderEnabled(providerKey) {
        const provider = Providers.getProvider(providerKey);
        if (!provider) return false;
        return this._settings.get_boolean(provider.enabledKey);
    }

    /**
     * Enable or disable a provider
     * @param {string} providerKey - The provider identifier
     * @param {boolean} enabled - Whether to enable the provider
     */
    setProviderEnabled(providerKey, enabled) {
        const provider = Providers.getProvider(providerKey);
        if (!provider) return;
        this._settings.set_boolean(provider.enabledKey, enabled);
    }

    /**
     * Get the "show daily limit" preference for Nano-GPT
     * @returns {boolean} True if daily limit should be shown, false for monthly
     */
    showDailyLimit() {
        return this._settings.get_boolean('nano-gpt-show-daily-limit');
    }

    /**
     * Set the "show daily limit" preference for Nano-GPT
     * @param {boolean} show - Whether to show daily limit (true) or monthly (false)
     */
    setShowDailyLimit(show) {
        this._settings.set_boolean('nano-gpt-show-daily-limit', show);
    }

    /**
     * Get all settings for a specific provider
     * @param {string} providerKey - The provider identifier
     * @returns {Object|null} Object with apiKey, enabled, hasDailyToggle, and showDailyLimit properties
     */
    getProviderSettings(providerKey) {
        const provider = Providers.getProvider(providerKey);
        if (!provider) return null;
        return {
            apiKey: this.getProviderApiKey(providerKey),
            enabled: this.isProviderEnabled(providerKey),
            hasDailyToggle: provider.hasDailyToggle || false,
            showDailyLimit: provider.hasDailyToggle ? this.showDailyLimit() : null
        };
    }

    /**
     * Get the raw GSettings object
     * This is provided for backward compatibility and advanced use cases
     * @returns {Object} The GSettings object
     */
    getSettings() {
        return this._settings;
    }

    /**
     * Connect to a settings change signal
     * @param {string} signal - The signal name (typically 'changed')
     * @param {Function} callback - The callback function
     * @returns {number} The signal ID
     */
    connect(signal, callback) {
        return this._settings.connect(signal, callback);
    }

    /**
     * Disconnect a previously connected signal
     * @param {number} signalId - The signal ID to disconnect
     */
    disconnect(signalId) {
        if (this._settings && signalId) {
            this._settings.disconnect(signalId);
        }
    }
}
