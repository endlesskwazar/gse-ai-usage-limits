import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSchemaXML } from './generate-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateSchema() {
    const generatedSchema = generateSchemaXML();
    const schemaPath = path.join(__dirname, '../src/schemas/org.gnome.shell.extensions.ai-usage-limits.gschema.xml');
    const currentSchema = fs.readFileSync(schemaPath, 'utf-8');

    if (generatedSchema === currentSchema) {
        console.log('✅ Schema is up to date with ProviderConfig');
        return true;
    } else {
        console.error('❌ Schema is out of sync with ProviderConfig');
        console.error('Run "npm run generate-schema" to update it');
        return false;
    }
}

validateSchema();
