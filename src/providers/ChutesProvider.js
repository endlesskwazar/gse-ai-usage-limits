/**
 * Chutes.ai Provider
 * Calculates next UTC midnight for renewsAt
 */
import BaseProvider from './BaseProvider.js';
import UsageData from './UsageData.js';

export default class ChutesProvider extends BaseProvider {
    get id() {
        return 'chutes';
    }

    get name() {
        return 'Chutes.ai';
    }

    get settingKey() {
        return 'chutes-api-key';
    }

    get enabledKey() {
        return 'chutes-enabled';
    }

    get url() {
        return 'https://api.chutes.ai/users/me/quota_usage/me';
    }

    parse(data, _settings) {
        const limit = data.quota || 0;
        const used = data.used || 0;

        // Calculate next 00:00 UTC
        const now = new Date();
        const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

        return new UsageData(limit, used, nextReset.toISOString());
    }
}
