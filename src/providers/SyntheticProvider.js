/**
 * Synthetic Provider
 * Basic AI service provider implementation
 */
import BaseProvider from './BaseProvider.js';
import UsageData from './UsageData.js';

export default class SyntheticProvider extends BaseProvider {
    get id() {
        return 'synthetic';
    }

    get name() {
        return 'Synthetic';
    }

    get settingKey() {
        return 'synthetic-api-key';
    }

    get enabledKey() {
        return 'synthetic-enabled';
    }

    get url() {
        return 'https://api.synthetic.new/v2/quotas';
    }

    parse(data, _settings) {
        if (data.subscription) {
            return new UsageData(data.subscription.limit, data.subscription.requests, data.subscription.renewsAt);
        }
        throw new Error('Invalid format');
    }
}
