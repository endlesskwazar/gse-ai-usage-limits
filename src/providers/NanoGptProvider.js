/**
 * Nano-GPT Provider
 * Has daily/monthly toggle for limit display
 */
import * as Locale from '../locale.js';
import BaseProvider from './BaseProvider.js';

export default class NanoGptProvider extends BaseProvider {
    get id() {
        return 'nanogpt';
    }

    get name() {
        return 'Nano-GPT';
    }

    get settingKey() {
        return 'nano-gpt-api-key';
    }

    get enabledKey() {
        return 'nano-gpt-enabled';
    }

    get url() {
        return 'https://nano-gpt.com/api/subscription/v1/usage';
    }

    getExtraSchema() {
        return {
            dailyToggle: {
                type: 'b',
                default: true,
                summary: Locale.gettext('Show Daily Limit'),
                description: Locale.gettext(
                    'If true, shows the daily limit (2000). If false, shows the monthly limit (60000).'
                )
            }
        };
    }

    getExtraConfig() {
        return {
            hasDailyToggle: true,
            dailyToggleKey: 'nano-gpt-show-daily-limit'
        };
    }

    parse(data, settings) {
        let showDaily = true;
        if (settings) {
            showDaily = settings.get_boolean('nano-gpt-show-daily-limit');
        }

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
