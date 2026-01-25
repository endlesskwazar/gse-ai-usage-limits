/**
 * Usage Data Class
 * Represents parsed usage statistics from an AI provider API
 */
export default class UsageData {
    /**
     * @param {number} limit - The usage limit (e.g., total requests, tokens, or quota units)
     * @param {number} used - The amount of usage consumed (must be <= limit)
     * @param {string|null} renewsAt - ISO 8601 timestamp when quota renews, or null if unknown
     */
    constructor(limit, used, renewsAt) {
        if (typeof limit !== 'number' || isNaN(limit)) {
            throw new TypeError('limit must be a valid number');
        }
        if (typeof used !== 'number' || isNaN(used)) {
            throw new TypeError('used must be a valid number');
        }
        if (renewsAt !== null && typeof renewsAt !== 'string') {
            throw new TypeError('renewsAt must be a string or null');
        }
        if (renewsAt !== null && isNaN(Date.parse(renewsAt))) {
            throw new TypeError('renewsAt must be a valid ISO 8601 timestamp or null');
        }

        this.limit = limit;
        this.used = used;
        this.renewsAt = renewsAt;
    }

    /**
     * Calculate the percentage of quota used
     * @returns {number} Percentage (0-100), or 0 if limit is 0
     */
    get percentage() {
        if (this.limit === 0) {
            return 0;
        }
        return Math.min(100, Math.max(0, (this.used / this.limit) * 100));
    }

    /**
     * Calculate the remaining quota
     * @returns {number} Remaining amount, or 0 if used exceeds limit
     */
    get remaining() {
        return Math.max(0, this.limit - this.used);
    }

    /**
     * Check if quota is exhausted (used >= limit)
     * @returns {boolean} True if quota is exhausted
     */
    get isExhausted() {
        return this.used >= this.limit;
    }

    /**
     * Convert to plain object for backward compatibility
     * @returns {Object} Plain object with limit, used, and renewsAt
     */
    toObject() {
        return {
            limit: this.limit,
            used: this.used,
            renewsAt: this.renewsAt
        };
    }
}
