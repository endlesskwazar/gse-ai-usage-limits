import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { register } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register custom loader to mock GNOME-specific modules
register('./loader-hooks.js', import.meta.url);

// Import Providers from the src directory (after hooks are registered)
const providersPath = path.join(__dirname, '../src/providers/index.js');
const Providers = (await import(providersPath)).default;

function generateKeyXML(keyName, config) {
    const defaultVal = typeof config.default === 'string' ? `"${config.default}"` : config.default;

    return `    <key name="${keyName}" type="${config.type}">
      <default>${defaultVal}</default>
      <summary>${config.summary}</summary>
      <description>${config.description}</description>
    </key>\n`;
}

function generateSchemaXML() {
    const providers = Providers.getProviders();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<schemalist gettext-domain="ai-usage-limits">\n';
    xml +=
        '  <schema id="org.gnome.shell.extensions.ai-usage-limits" path="/org/gnome/shell/extensions/ai-usage-limits/">\n';

    // Generate keys for each provider
    for (const provider of Object.values(providers)) {
        // API Key
        if (provider.schema?.apiKey) {
            xml += generateKeyXML(provider.settingKey, provider.schema.apiKey);
        }

        // Enabled
        if (provider.schema?.enabled) {
            xml += generateKeyXML(provider.enabledKey, provider.schema.enabled);
        }

        // Daily Toggle (Nano-GPT specific)
        if (provider.hasDailyToggle && provider.schema?.dailyToggle) {
            xml += generateKeyXML(provider.dailyToggleKey, provider.schema.dailyToggle);
        }

        // Limit Type Toggle (Claude specific)
        if (provider.hasLimitTypeToggle && provider.schema?.limitTypeToggle) {
            xml += generateKeyXML(provider.limitTypeToggleKey, provider.schema.limitTypeToggle);
        }
    }

    xml += '  </schema>\n';
    xml += '</schemalist>';
    return xml;
}

function main() {
    const schemaXML = generateSchemaXML();
    const outputPath = path.join(__dirname, '../src/schemas/org.gnome.shell.extensions.ai-usage-limits.gschema.xml');

    fs.writeFileSync(outputPath, schemaXML, 'utf-8');
    console.log(`Schema generated successfully: ${outputPath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { generateSchemaXML };
