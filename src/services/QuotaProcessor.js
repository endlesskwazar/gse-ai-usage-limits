/**
 * QuotaProcessor handles calculations and data processing for usage statistics.
 * Pure functions that transform raw API data into display-ready format.
 */
import UsageData from '../providers/UsageData.js';

export default class QuotaProcessor {
    /**
     * Process raw API response data and calculate derived metrics.
     * @param {Object|UsageData} parsedData - Raw parsed data from provider API or UsageData instance
     * @param {number} parsedData.limit - Usage limit
     * @param {number} parsedData.used - Number of requests used
     * @param {string|null} parsedData.renewsAt - ISO string of renew date
     * @returns {Object} Processed data with calculated fields
     * @returns {number} returns.limit - Usage limit
     * @returns {number} returns.used - Number of requests used
     * @returns {string|null} returns.renewsAt - ISO string of renew date
     * @returns {number} returns.percentage - Usage as percentage (0-1)
     * @returns {number|null} returns.timeUntilRenew - Milliseconds until renew, null if cannot calculate
     * @returns {string} returns.renewsIn - Formatted renew time (e.g., "2h 30m", "Now", or empty string)
     */
    static process(parsedData) {
        // Handle both UsageData instances and plain objects
        const data = parsedData instanceof UsageData ? parsedData.toObject() : parsedData;
        const { limit, used, renewsAt } = data;
        const timeUntilRenew = this._calculateTimeUntilRenew(renewsAt);
        return {
            limit,
            used,
            renewsAt,
            percentage: this._calculatePercentage(used, limit),
            timeUntilRenew,
            renewsIn: this._formatRenewsIn(timeUntilRenew, used)
        };
    }

    static _calculatePercentage(used, limit) {
        if (limit > 0) {
            return used / limit;
        }
        return 0;
    }

    static _calculateTimeUntilRenew(renewsAt) {
        if (!renewsAt) {
            return null;
        }

        const renewsDate = new Date(renewsAt);
        if (renewsDate.getTime() !== renewsDate.getTime()) {
            return null;
        }

        return renewsDate - new Date();
    }

    static _formatRenewsIn(timeUntilRenew, used) {
        if (timeUntilRenew === null || used === 0) {
            return '';
        }
        if (timeUntilRenew <= 0) {
            return 'Now';
        }
        const diffHrs = Math.floor(timeUntilRenew / (1000 * 60 * 60));
        const diffMins = Math.floor((timeUntilRenew % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHrs}h ${diffMins}m`;
    }
}
