/**
 * Provider Configuration Module
 * Thin wrapper for backward compatibility - delegates to index.js
 */
import Providers from './index.js';

export default class ProviderConfig {
    /**
     * Get all provider configurations
     * @returns {Object} Provider configuration objects keyed by provider ID
     */
    static getProviders() {
        return Providers.getProviders();
    }

    /**
     * Get a specific provider configuration by key
     * @param {string} providerKey - The provider identifier
     * @returns {Object|null} Provider configuration or null if not found
     */
    static getProvider(providerKey) {
        return Providers.getProvider(providerKey);
    }

    /**
     * Get all provider keys
     * @returns {Array<string>} Array of provider keys
     */
    static getProviderKeys() {
        return Providers.getProviderKeys();
    }

    /**
     * Get provider names as a mapping
     * @returns {Object} Provider key to name mapping
     */
    static getProviderNames() {
        return Providers.getProviderNames();
    }

    /**
     * Check if a provider key is valid
     * @param {string} providerKey - The provider identifier to check
     * @returns {boolean} True if the provider exists
     */
    static isValidProvider(providerKey) {
        return Providers.isValidProvider(providerKey);
    }
}
