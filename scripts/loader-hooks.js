/**
 * Node.js module loader hooks to mock GNOME-specific modules
 * Used by generate-schema.js to run provider code in Node.js environment
 */

// Mock gettext module - returns identity functions for translations
const gettextMock = `
export default {
    gettext: (str) => str,
    ngettext: (singular, plural, n) => n === 1 ? singular : plural,
    pgettext: (context, str) => str,
    bindtextdomain: () => {},
    textdomain: () => {}
};
`;

export async function resolve(specifier, context, nextResolve) {
    // Mock the 'gettext' module used by GNOME extensions
    if (specifier === 'gettext') {
        return {
            shortCircuit: true,
            url: 'mock:gettext'
        };
    }
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    if (url === 'mock:gettext') {
        return {
            shortCircuit: true,
            format: 'module',
            source: gettextMock
        };
    }
    return nextLoad(url, context);
}
