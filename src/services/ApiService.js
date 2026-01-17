import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

/**
 * ApiService handles HTTP requests to provider APIs.
 * Encapsulates Soup Session management and request/response handling.
 */
export default class ApiService {
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
                try {
                    const bytes = session.send_and_read_finish(result);
                    const response = this._parseResponse(message, bytes);

                    // Parse provider-specific data
                    const parsedData = provider.parse(response, this._providerStateManager._settings);
                    resolve(parsedData);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Parse HTTP response and handle status codes.
     * @param {Soup.Message} message - The Soup message object
     * @param {GLib.Bytes} bytes - Raw response bytes
     * @returns {Object} Parsed JSON response
     * @throws {Error} If status code is not 200 or parsing fails
     */
    _parseResponse(message, bytes) {
        if (message.status_code !== 200) {
            throw new Error(`HTTP ${message.status_code}`);
        }

        const decoder = new TextDecoder();
        const responseBody = decoder.decode(bytes.get_data());
        return JSON.parse(responseBody);
    }

    /**
     * Clean up resources when the service is no longer needed.
     */
    destroy() {
        if (this._session) {
            this._session = null;
        }
        this._providerStateManager = null;
    }
}
