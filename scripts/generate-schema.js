import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import ProviderConfig from the src directory
const providerConfigPath = path.join(__dirname, '../src/providers/ProviderConfig.js');
const ProviderConfig = (await import(providerConfigPath)).default;

function generateKeyXML(keyName, config) {
    const defaultVal = typeof config.default === 'string' ? `"${config.default}"` : config.default;

    return `    <key name="${keyName}" type="${config.type}">
      <default>${defaultVal}</default>
      <summary>${config.summary}</summary>
      <description>${config.description}</description>
    </key>\n`;
}

function generateSchemaXML() {
    const providers = ProviderConfig.getProviders();
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
        if (provider.hasDailyToggle) {
            xml += generateKeyXML(provider.dailyToggleKey, {
                type: 'b',
                default: true,
                summary: 'Show Daily Limit for Nano-GPT',
                description: 'If true, shows the daily limit (2000). If false, shows the monthly limit (60000).'
            });
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
