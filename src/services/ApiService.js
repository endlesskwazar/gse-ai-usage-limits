import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import ProviderStateManager from './ProviderStateManager.js';

export default class ApiService {
    #providerStateManager;
    #session;

    /**
     * @param {ProviderStateManager} providerStateManager - Manages provider settings and state
     */
    constructor(providerStateManager) {
        this.#providerStateManager = providerStateManager;
        this.#session = new Soup.Session();
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
            const providerSettings = this.#providerStateManager.getProviderSettings(providerKey);
            const apiKey = providerSettings.apiKey;

            const message = Soup.Message.new('GET', provider.url);
            message.request_headers.append('Authorization', `Bearer ${apiKey}`);

            this.#session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
                this.#handleFetchResponse(session, result, message, provider, resolve, reject);
            });
        });
    }

    #parseResponse(message, bytes) {
        if (message.status_code !== 200) {
            throw new Error(`HTTP ${message.status_code}`);
        }

        const decoder = new TextDecoder();
        const responseBody = decoder.decode(bytes.get_data());
        return JSON.parse(responseBody);
    }

    #handleFetchResponse(session, result, message, provider, resolve, reject) {
        try {
            const bytes = session.send_and_read_finish(result);
            const response = this.#parseResponse(message, bytes);

            // Parse provider-specific data
            const parsedData = provider.parse(response, this.#providerStateManager._settingsHelper.getSettings());
            resolve(parsedData);
        } catch (error) {
            reject(error);
        }
    }

    destroy() {
        if (this.#session) {
            this.#session = null;
        }
        this.#providerStateManager = null;
    }
}
