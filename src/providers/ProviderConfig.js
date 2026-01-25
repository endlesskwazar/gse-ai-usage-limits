/**
 * Provider Configuration Module
 * Centralizes all provider definitions and their configurations
 */
import * as Locale from '../locale.js';

export default class ProviderConfig {
    /**
     * Get all provider configurations
     * @returns {Object} Provider configuration objects keyed by provider ID
     */
    static getProviders() {
        return {
            synthetic: {
                id: 'synthetic',
                name: 'Synthetic',
                description: Locale.pgettext('provider', 'AI service provider'),
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
                },
                schema: {
                    apiKey: {
                        type: 's',
                        default: '',
                        summary: Locale.gettext('Synthetic API Key'),
                        description: Locale.gettext('The API key for the Synthetic service.')
                    },
                    enabled: {
                        type: 'b',
                        default: true,
                        summary: Locale.gettext('Enable Synthetic Provider'),
                        description: Locale.gettext('Toggle to enable/disable Synthetic provider in the menu.')
                    }
                }
            },
            chutes: {
                id: 'chutes',
                name: 'Chutes.ai',
                description: Locale.pgettext('provider', 'AI service provider'),
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
                },
                schema: {
                    apiKey: {
                        type: 's',
                        default: '',
                        summary: Locale.gettext('Chutes.ai API Key'),
                        description: Locale.gettext('The API key for the Chutes.ai service.')
                    },
                    enabled: {
                        type: 'b',
                        default: true,
                        summary: Locale.gettext('Enable Chutes.ai Provider'),
                        description: Locale.gettext('Toggle to enable/disable Chutes.ai provider in the menu.')
                    }
                }
            },
            nanogpt: {
                id: 'nanogpt',
                name: 'Nano-GPT',
                description: Locale.pgettext('provider', 'AI service provider'),
                settingKey: 'nano-gpt-api-key',
                enabledKey: 'nano-gpt-enabled',
                hasDailyToggle: true,
                dailyToggleKey: 'nano-gpt-show-daily-limit',
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
                },
                schema: {
                    apiKey: {
                        type: 's',
                        default: '',
                        summary: Locale.gettext('Nano-GPT API Key'),
                        description: Locale.gettext('The API key for the Nano-GPT service.')
                    },
                    enabled: {
                        type: 'b',
                        default: true,
                        summary: Locale.gettext('Enable Nano-GPT Provider'),
                        description: Locale.gettext('Toggle to enable/disable Nano-GPT provider in the menu.')
                    },
                    dailyToggle: {
                        type: 'b',
                        default: true,
                        summary: Locale.gettext('Show Daily Limit for Nano-GPT'),
                        description: Locale.gettext(
                            'If true, shows the daily limit (2000). If false, shows the monthly limit (60000).'
                        )
                    }
                }
            },
            claude: {
                id: 'claude',
                name: 'Claude',
                description: Locale.pgettext('provider', 'Anthropic Claude AI service'),
                settingKey: 'claude-oauth-token',
                enabledKey: 'claude-enabled',
                hasLimitTypeToggle: true,
                limitTypeToggleKey: 'claude-limit-type',
                // OAuth token can be auto-filled from Claude Code CLI credentials
                oauthCredentials: {
                    path: '.claude/.credentials.json',
                    hint: 'OAuth token from Claude Code CLI subscription (Pro/Max). Auto-detected from ~/.claude/.credentials.json if available.'
                },
                url: 'https://api.anthropic.com/api/oauth/usage',
                headers: {
                    'anthropic-beta': 'oauth-2025-04-20',
                    'Content-Type': 'application/json'
                },
                parse: (data, settings) => {
                    // Check user preference for which limit to show
                    // 0 = 5-hour, 1 = 7-day, 2 = 7-day Opus
                    let limitType = 0;
                    if (settings) {
                        limitType = settings.get_int('claude-limit-type');
                    }

                    let target;
                    switch (limitType) {
                        case 1:
                            target = data.seven_day;
                            break;
                        case 2:
                            target = data.seven_day_opus;
                            break;
                        default:
                            target = data.five_hour;
                    }

                    if (!target) {
                        throw new Error('Invalid format or limit type not available');
                    }

                    // Claude returns utilization as percentage (0-100)
                    // Convert to limit/used format where limit=100
                    return {
                        limit: 100,
                        used: target.utilization || 0,
                        renewsAt: target.resets_at || null
                    };
                },
                schema: {
                    apiKey: {
                        type: 's',
                        default: '',
                        summary: Locale.gettext('Claude OAuth Token'),
                        description: Locale.gettext(
                            'OAuth token for Claude Code subscription. Starts with sk-ant-oat01-. Auto-detected from Claude Code CLI if installed.'
                        )
                    },
                    enabled: {
                        type: 'b',
                        default: true,
                        summary: Locale.gettext('Enable Claude Provider'),
                        description: Locale.gettext('Toggle to enable/disable Claude provider in the menu.')
                    },
                    limitTypeToggle: {
                        type: 'i',
                        default: 0,
                        summary: Locale.gettext('Claude Limit Type'),
                        description: Locale.gettext(
                            'Which limit to display: 0 = 5-hour rolling, 1 = 7-day weekly, 2 = 7-day Opus (Max plan only).'
                        )
                    }
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
