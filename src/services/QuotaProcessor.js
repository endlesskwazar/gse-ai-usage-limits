/**
 * QuotaProcessor handles calculations and data processing for usage statistics.
 * Pure functions that transform raw API data into display-ready format.
 */
export default class QuotaProcessor {
    /**
     * Process raw API response data and calculate derived metrics.
     * @param {Object} parsedData - Raw parsed data from provider API
     * @param {number} parsedData.used - Number of requests used
     * @param {number} parsedData.renewsAt - ISO string of renew date
     * @param {number} parsedData.used - Number of requests used
     * @returns {Object} Processed data with calculated fields
     * @returns {number} returns.used - Number of requests used
     * @returns {number} returns.renewsAt - ISO string of renew date
     * @returns {number} returns.percentage - Usage as percentage (0-1)
     * @returns {number|null} returns.timeUntilRenew - Milliseconds until renew, null if cannot calculate
     */
    process({ limit, used, renewsAt }) {
        return {
            limit,
            used,
            renewsAt,
            percentage: this._calculatePercentage(used, limit),
            timeUntilRenew: this._calculateTimeUntilRenew(renewsAt)
        };
    }

    _calculatePercentage(used, limit) {
        if (limit > 0) {
            return used / limit;
        }
        return 0;
    }

    _calculateTimeUntilRenew(renewsAt) {
        if (!renewsAt) {
            return null;
        }

        const renewsDate = new Date(renewsAt);
        if (renewsDate.getTime() !== renewsDate.getTime()) {
            return null;
        }

        return renewsDate - new Date();
    }
}
