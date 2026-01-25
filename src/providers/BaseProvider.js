/**
 * Base Provider Class
 * Abstract base class defining the provider interface
 */
import * as Locale from '../locale.js';

export default class BaseProvider {
    /**
     * @returns {string} Unique provider identifier
     */
    get id() {
        throw new Error('Subclass must implement id getter');
    }

    /**
     * @returns {string} Display name for the provider
     */
    get name() {
        throw new Error('Subclass must implement name getter');
    }

    /**
     * @returns {string} Provider description
     */
    get description() {
        return Locale.pgettext('provider', 'AI service provider');
    }

    /**
     * @returns {string} Settings key for API key/token storage
     */
    get settingKey() {
        throw new Error('Subclass must implement settingKey getter');
    }

    /**
     * @returns {string} Settings key for enabled state
     */
    get enabledKey() {
        throw new Error('Subclass must implement enabledKey getter');
    }

    /**
     * @returns {string} API endpoint URL
     */
    get url() {
        throw new Error('Subclass must implement url getter');
    }

    /**
     * @returns {string} Label for the API key setting
     */
    get apiKeyLabel() {
        return Locale.gettext('API Key');
    }

    /**
     * @returns {string} Description for the API key setting
     */
    get apiKeyDescription() {
        return Locale.gettext('The API key for this service.');
    }

    /**
     * @returns {Object} Base schema with apiKey and enabled settings
     */
    get schema() {
        return {
            apiKey: {
                type: 's',
                default: '',
                summary: `${this.name} ${this.apiKeyLabel}`,
                description: this.apiKeyDescription
            },
            enabled: {
                type: 'b',
                default: true,
                summary: Locale.gettext('Enable Provider'),
                description: Locale.gettext('Toggle to enable/disable this provider in the menu.')
            },
            ...this.getExtraSchema()
        };
    }

    /**
     * Parse API response data
     * @param {Object} data - API response data
     * @param {Object|null} settings - GSettings object for reading preferences
     * @returns {Object} Parsed usage data with limit, used, and renewsAt
     */
    parse(_data, _settings) {
        throw new Error('Subclass must implement parse method');
    }

    /**
     * Get provider-specific extra schema settings
     * @returns {Object} Extra schema entries
     */
    getExtraSchema() {
        return {};
    }

    /**
     * Get provider-specific extra configuration
     * @returns {Object} Extra configuration object
     */
    getExtraConfig() {
        return {};
    }

    /**
     * Convert provider to config object for backward compatibility
     * @returns {Object} Provider configuration object
     */
    toConfig() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            settingKey: this.settingKey,
            enabledKey: this.enabledKey,
            url: this.url,
            schema: this.schema,
            parse: (data, settings) => this.parse(data, settings),
            ...this.getExtraConfig()
        };
    }
}
