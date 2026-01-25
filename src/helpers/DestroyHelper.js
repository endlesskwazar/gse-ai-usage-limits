/**
 * Helper utility for common destruction patterns.
 * Reduces repetitive null-check and try-catch code across the codebase.
 */
export default class DestroyHelper {
    /**
     * Disconnect a signal from an object.
     * @param {Object} object - The object to disconnect from
     * @param {number} signalId - The signal ID to disconnect
     * @returns {null} - Assign to the signalId variable
     */
    static disconnectSignal(object, signalId) {
        if (object && signalId) {
            object.disconnect(signalId);
        }
        return null;
    }

    /**
     * Destroy a component with null check.
     * @param {Object} component - The component to destroy
     * @returns {null} - Assign to the component variable
     */
    static destroyComponent(component) {
        if (component) {
            component.destroy();
        }
        return null;
    }

    /**
     * Safely destroy a component with try-catch for shutdown resilience.
     * @param {Object} component - The component to destroy
     * @param {string} context - Context name for error logging
     * @returns {null} - Assign to the component variable
     */
    static safeDestroy(component, context = 'component') {
        if (component) {
            try {
                component.destroy();
            } catch (e) {
                console.log(`AIUsageExtension: Error destroying ${context}:`, e.message);
            }
        }
        return null;
    }
}
