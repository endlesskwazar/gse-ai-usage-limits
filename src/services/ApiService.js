import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import ProviderStateManager from './ProviderStateManager.js';

export default class ApiService {
    _providerStateManager;
    _session;

    /**
     * @param {ProviderStateManager} providerStateManager - Manages provider settings and state
     */
    constructor(providerStateManager) {
        this._providerStateManager = providerStateManager;
        this._session = new Soup.Session();
    }

    /**
     * Fetch quota data from a provider's API.
     * @param {Object} provider - Provider configuration object
     * @param {string} provider.url - The API endpoint URL
     * @param {Function} provider.parse - Function to parse the response data
     * @param {string} providerKey - The provider key to get settings for
     * @returns {Promise<Object>} Parsed quota data with limit, used, and renewsAt properties
     */
    async fetchQuota(provider, providerKey) {
        return new Promise((resolve, reject) => {
            const providerSettings = this._providerStateManager.getProviderSettings(providerKey);
            const apiKey = providerSettings.apiKey;

            const message = Soup.Message.new('GET', provider.url);
            message.request_headers.append('Authorization', `Bearer ${apiKey}`);

            this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
                this._handleFetchResponse(session, result, message, provider, resolve, reject);
            });
        });
    }

    _parseResponse(message, bytes) {
        if (message.status_code !== 200) {
            throw new Error(`HTTP ${message.status_code}`);
        }

        const decoder = new TextDecoder();
        const responseBody = decoder.decode(bytes.get_data());
        return JSON.parse(responseBody);
    }

    _handleFetchResponse(session, result, message, provider, resolve, reject) {
        try {
            const bytes = session.send_and_read_finish(result);
            const response = this._parseResponse(message, bytes);

            // Parse provider-specific data
            const parsedData = provider.parse(response, this._providerStateManager._settingsHelper.getSettings());
            resolve(parsedData);
        } catch (error) {
            reject(error);
        }
    }

    destroy() {
        if (this._session) {
            this._session = null;
        }
        this._providerStateManager = null;
    }
}
