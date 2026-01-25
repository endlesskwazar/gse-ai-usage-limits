/**
 * Claude Provider
 * Anthropic Claude AI service with OAuth and limit type toggle
 */
import * as Locale from '../locale.js';
import BaseProvider from './BaseProvider.js';

export default class ClaudeProvider extends BaseProvider {
    get id() {
        return 'claude';
    }

    get name() {
        return 'Claude';
    }

    get description() {
        return Locale.pgettext('provider', 'Anthropic Claude AI service');
    }

    get settingKey() {
        return 'claude-oauth-token';
    }

    get enabledKey() {
        return 'claude-enabled';
    }

    get url() {
        return 'https://api.anthropic.com/api/oauth/usage';
    }

    get apiKeyLabel() {
        return Locale.gettext('OAuth Token');
    }

    get apiKeyDescription() {
        return Locale.gettext(
            'OAuth token for Claude Code subscription. Starts with sk-ant-oat01-. Auto-detected from Claude Code CLI if installed.'
        );
    }

    getExtraSchema() {
        return {
            limitTypeToggle: {
                type: 'i',
                default: 0,
                summary: Locale.gettext('Limit Type'),
                description: Locale.gettext(
                    'Which limit to display: 0 = 5-hour rolling, 1 = 7-day weekly, 2 = 7-day Opus (Max plan only).'
                )
            }
        };
    }

    getExtraConfig() {
        return {
            headers: {
                'anthropic-beta': 'oauth-2025-04-20',
                'Content-Type': 'application/json'
            },
            hasLimitTypeToggle: true,
            limitTypeToggleKey: 'claude-limit-type',
            oauthCredentials: {
                path: '.claude/.credentials.json',
                hint: 'OAuth token from Claude Code CLI subscription (Pro/Max). Auto-detected from ~/.claude/.credentials.json if available.'
            }
        };
    }

    parse(data, settings) {
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

        return {
            limit: 100,
            used: target.utilization || 0,
            renewsAt: target.resets_at || null
        };
    }
}
