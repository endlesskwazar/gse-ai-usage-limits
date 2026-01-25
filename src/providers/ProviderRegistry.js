/**
 * Provider Registry
 * Singleton registry for managing provider instances
 */

class ProviderRegistry {
    constructor() {
        this._providers = new Map();
    }

    /**
     * Register a provider instance
     * @param {Object} provider - Provider instance to register
     * @throws {Error} If provider with same ID already exists
     */
    register(provider) {
        if (this._providers.has(provider.id)) {
            throw new Error(`Provider with ID '${provider.id}' is already registered`);
        }
        this._providers.set(provider.id, provider);
    }

    /**
     * Unregister a provider by ID
     * @param {string} providerId - Provider ID to remove
     * @returns {boolean} True if provider was removed
     */
    unregister(providerId) {
        return this._providers.delete(providerId);
    }

    /**
     * Get a provider instance by ID
     * @param {string} providerId - Provider ID
     * @returns {Object|undefined} Provider instance or undefined
     */
    get(providerId) {
        return this._providers.get(providerId);
    }

    /**
     * Check if a provider exists
     * @param {string} providerId - Provider ID to check
     * @returns {boolean} True if provider exists
     */
    has(providerId) {
        return this._providers.has(providerId);
    }

    /**
     * Get all provider IDs
     * @returns {Array<string>} Array of provider IDs
     */
    getIds() {
        return Array.from(this._providers.keys());
    }

    /**
     * Get all provider instances
     * @returns {Array<Object>} Array of provider instances
     */
    getAll() {
        return Array.from(this._providers.values());
    }

    /**
     * Get all providers as config objects (backward compatibility)
     * @returns {Object} Provider configurations keyed by ID
     */
    getConfigs() {
        const configs = {};
        for (const [id, provider] of this._providers) {
            configs[id] = provider.toConfig();
        }
        return configs;
    }

    /**
     * Get single provider as config object (backward compatibility)
     * @param {string} providerId - Provider ID
     * @returns {Object|null} Provider configuration or null
     */
    getConfig(providerId) {
        const provider = this._providers.get(providerId);
        return provider ? provider.toConfig() : null;
    }

    /**
     * Get ID-to-name mapping
     * @returns {Object} Provider ID to name mapping
     */
    getNames() {
        const names = {};
        for (const [id, provider] of this._providers) {
            names[id] = provider.name;
        }
        return names;
    }

    /**
     * Clear all registered providers
     */
    clear() {
        this._providers.clear();
    }
}

// Export singleton instance
export default new ProviderRegistry();
