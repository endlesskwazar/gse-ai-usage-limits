#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { execSync } = require('child_process');

const PO_DIR = path.resolve(__dirname, '../po');
const LOCALE_DIR = path.resolve(__dirname, '../locale');

function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function compileTranslations() {
    ensureDirExists(LOCALE_DIR);

    if (!fs.existsSync(PO_DIR)) {
        console.error('po directory does not exist');
        process.exit(1);
    }

    const linguaFile = path.join(PO_DIR, 'LINGUAS');
    if (!fs.existsSync(linguaFile)) {
        console.error('LINGUAS file does not exist');
        process.exit(1);
    }

    const languages = fs.readFileSync(linguaFile, 'utf-8').trim().split('\n').filter(Boolean);

    languages.forEach(lang => {
        const poFile = path.join(PO_DIR, `${lang}.po`);
        const langDir = path.join(LOCALE_DIR, lang, 'LC_MESSAGES');

        if (fs.existsSync(poFile)) {
            ensureDirExists(langDir);
            const outputFile = path.join(langDir, 'gse-ai-usage-limits.mo');

            try {
                const cmd = `msgfmt -o "${outputFile}" "${poFile}"`;
                execSync(cmd, { stdio: 'inherit' });
                console.log(`✓ Compiled ${lang} translations`);
            } catch (error) {
                console.error(`✗ Failed to compile ${lang} translations:`, error.message);
                process.exit(1);
            }
        } else {
            console.warn(`⚠ Warning: ${poFile} does not exist, skipping`);
        }
    });

    console.log('\n✓ All translations compiled successfully');
}

compileTranslations();
