import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

const AIUsagePreferences = GObject.registerClass(
class AIUsagePreferences extends GObject.Object {
    _init(metadata) {
        super._init();
        this.metadata = metadata;
        this.path = metadata.path;
    }

    getSettings() {
        const schemaId = 'org.gnome.shell.extensions.ai-usage-limits';
        const GioSSS = Gio.SettingsSchemaSource;
        
        // Try to load from extension directory first
        let schemaSource = GioSSS.new_from_directory(
            this.path + '/schemas',
            GioSSS.get_default(),
            false
        );
        
        let schemaObj = schemaSource.lookup(schemaId, true);
        if (!schemaObj) {
            // Fallback to default if not found in local dir
             schemaSource = GioSSS.get_default();
             schemaObj = schemaSource.lookup(schemaId, true);
        }

        if (!schemaObj) {
            throw new Error(`Schema ${schemaId} not found`);
        }
        
        return new Gio.Settings({ settings_schema: schemaObj });
    }

    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: 'General Settings',
            description: 'Configure your API access'
        });

        const apiKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key'
        });

        group.add(apiKeyRow);
        page.add(group);
        window.add(page);

        settings.bind(
            'api-key',
            apiKeyRow,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );
    }
});

export default AIUsagePreferences;
