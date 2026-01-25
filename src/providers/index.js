/**
 * Provider Module Entry Point
 * Registers all default providers and exports backward-compatible API
 */
import BaseProvider from './BaseProvider.js';
import ProviderRegistry from './ProviderRegistry.js';
import SyntheticProvider from './SyntheticProvider.js';
import ChutesProvider from './ChutesProvider.js';
import NanoGptProvider from './NanoGptProvider.js';
import ClaudeProvider from './ClaudeProvider.js';

// Register all default providers
ProviderRegistry.register(new SyntheticProvider());
ProviderRegistry.register(new ChutesProvider());
ProviderRegistry.register(new NanoGptProvider());
ProviderRegistry.register(new ClaudeProvider());

// Export classes for extensibility
export { BaseProvider, ProviderRegistry, SyntheticProvider, ChutesProvider, NanoGptProvider, ClaudeProvider };

// Default export with ProviderConfig-compatible API
export default {
    /**
     * Get all provider configurations
     * @returns {Object} Provider configuration objects keyed by provider ID
     */
    getProviders() {
        return ProviderRegistry.getConfigs();
    },

    /**
     * Get a specific provider configuration by key
     * @param {string} providerKey - The provider identifier
     * @returns {Object|null} Provider configuration or null if not found
     */
    getProvider(providerKey) {
        return ProviderRegistry.getConfig(providerKey);
    },

    /**
     * Get all provider keys
     * @returns {Array<string>} Array of provider keys
     */
    getProviderKeys() {
        return ProviderRegistry.getIds();
    },

    /**
     * Get provider names as a mapping
     * @returns {Object} Provider key to name mapping
     */
    getProviderNames() {
        return ProviderRegistry.getNames();
    },

    /**
     * Check if a provider key is valid
     * @param {string} providerKey - The provider identifier to check
     * @returns {boolean} True if the provider exists
     */
    isValidProvider(providerKey) {
        return ProviderRegistry.has(providerKey);
    }
};
