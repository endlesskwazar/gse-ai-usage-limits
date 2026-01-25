import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Locale from '../locale.js';
import DestroyHelper from '../helpers/DestroyHelper.js';

const ContextMenu = GObject.registerClass(
    {
        Signals: {
            'settings-activated': {},
            'close-extension': {}
        }
    },
    class ContextMenu extends St.Widget {
        _init(actor, openPreferencesCallback) {
            super._init();

            this._openPreferencesCallback = openPreferencesCallback;
            this._menuManager = new PopupMenu.PopupMenuManager(actor);
            this._menu = new PopupMenu.PopupMenu(actor, 0.5, St.Side.TOP);

            Main.layoutManager.uiGroup.add_child(this._menu.actor);
            this._menu.actor.hide();
            this._menuManager.addMenu(this._menu);

            this._buildMenuItems();
        }

        _buildMenuItems() {
            let settingsItem = new PopupMenu.PopupMenuItem(Locale.gettext('Settings'));
            settingsItem.connect('activate', () => {
                if (this._openPreferencesCallback) {
                    this._openPreferencesCallback();
                }
                this.emit('settings-activated');
            });
            this._menu.addMenuItem(settingsItem);

            let closeItem = new PopupMenu.PopupMenuItem(Locale.gettext('Close Extension'));
            closeItem.connect('activate', () => {
                this.emit('close-extension');
            });
            this._menu.addMenuItem(closeItem);
        }

        toggle() {
            this._menu.toggle();
        }

        close() {
            this._menu.close();
        }

        destroy() {
            this._menu = DestroyHelper.destroyComponent(this._menu);
            this._menuManager = null;
            super.destroy();
        }
    }
);

export default ContextMenu;
