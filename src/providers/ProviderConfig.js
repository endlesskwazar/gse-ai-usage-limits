/**
 * Provider Configuration Module
 * Centralizes all provider definitions and their configurations
 */

export default class ProviderConfig {
    /**
     * Get all provider configurations
     * @returns {Object} Provider configuration objects keyed by provider ID
     */
    static getProviders() {
        return {
            synthetic: {
                name: 'Synthetic',
                settingKey: 'synthetic-api-key',
                enabledKey: 'synthetic-enabled',
                url: 'https://api.synthetic.new/v2/quotas',
                parse: data => {
                    if (data.subscription) {
                        return {
                            limit: data.subscription.limit,
                            used: data.subscription.requests,
                            renewsAt: data.subscription.renewsAt
                        };
                    }
                    throw new Error('Invalid format');
                }
            },
            chutes: {
                name: 'Chutes.ai',
                settingKey: 'chutes-api-key',
                enabledKey: 'chutes-enabled',
                url: 'https://api.chutes.ai/users/me/quota_usage/me',
                parse: data => {
                    const limit = data.quota || 0;
                    const used = data.used || 0;

                    // Calculate next 00:00 UTC
                    const now = new Date();
                    const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

                    return {
                        limit: limit,
                        used: used,
                        renewsAt: nextReset.toISOString()
                    };
                }
            },
            nanogpt: {
                name: 'Nano-GPT',
                settingKey: 'nano-gpt-api-key',
                enabledKey: 'nano-gpt-enabled',
                url: 'https://nano-gpt.com/api/subscription/v1/usage',
                parse: (data, settings) => {
                    // Check user preference for tracking mode
                    let showDaily = true;
                    if (settings) {
                        showDaily = settings.get_boolean('nano-gpt-show-daily-limit');
                    }

                    // Fallback if data structure is unexpected
                    if (!data.limits || !data.daily || !data.monthly) {
                        throw new Error('Invalid format');
                    }

                    const target = showDaily ? data.daily : data.monthly;
                    const limit = (showDaily ? data.limits.daily : data.limits.monthly) || 0;

                    return {
                        limit: limit,
                        used: target.used,
                        renewsAt: target.resetAt
                    };
                }
            }
        };
    }

    /**
     * Get a specific provider configuration by key
     * @param {string} providerKey - The provider identifier
     * @returns {Object|null} Provider configuration or null if not found
     */
    static getProvider(providerKey) {
        const providers = this.getProviders();
        return providers[providerKey] || null;
    }

    /**
     * Get all provider keys
     * @returns {Array<string>} Array of provider keys
     */
    static getProviderKeys() {
        return Object.keys(this.getProviders());
    }

    /**
     * Get provider names as a mapping
     * @returns {Object} Provider key to name mapping
     */
    static getProviderNames() {
        const providers = this.getProviders();
        return Object.fromEntries(Object.entries(providers).map(([key, provider]) => [key, provider.name]));
    }

    /**
     * Check if a provider key is valid
     * @param {string} providerKey - The provider identifier to check
     * @returns {boolean} True if the provider exists
     */
    static isValidProvider(providerKey) {
        return providerKey in this.getProviders();
    }
}
