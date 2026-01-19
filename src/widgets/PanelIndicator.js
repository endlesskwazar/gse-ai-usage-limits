import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import ContextMenu from './ContextMenu.js';

const PanelIndicator = GObject.registerClass(
    {
        Signals: {
            'menu-open-state-changed': {
                param_types: [GObject.TYPE_BOOLEAN]
            },
            'context-menu-open-state-changed': {
                param_types: [GObject.TYPE_BOOLEAN]
            },
            'close-extension': {}
        }
    },
    class PanelIndicator extends St.Widget {
        _init(openPreferencesCallback) {
            super._init();

            this._openPreferencesCallback = openPreferencesCallback;
            this._isHovered = false;
            this._isMenuOpen = false;

            this._setupPanelButton();
            this._setupPanelIcon();
            this._setupContextMenu();
            this._setupEventHandlers();
        }

        _setupPanelButton() {
            this._indicator = new PanelMenu.Button(0.0, 'AI Usage', false);
            this._indicator.add_style_class_name('ai-usage-indicator');
            this._currentButton = this._indicator;

            this._indicator.menu.destroy();

            this._indicator.menu = new PopupMenu.PopupMenu(this._indicator, 0.5, St.Side.TOP);
            Main.layoutManager.uiGroup.add_child(this._indicator.menu.actor);
            this._indicator.menu.actor.add_style_class_name('popup-menu');
            this._indicator.menu.actor.hide();

            Main.panel.menuManager.addMenu(this._indicator.menu);
        }

        _setupPanelIcon() {
            let panelBox = new St.BoxLayout();

            let icon = new St.Icon({
                icon_name: 'thunderbolt-symbolic',
                style_class: 'system-status-icon'
            });
            panelBox.add_child(icon);
            this._indicator.add_child(panelBox);
        }

        _setupContextMenu() {
            this._contextMenu = new ContextMenu(this._indicator, () => {
                if (this._openPreferencesCallback) {
                    this._openPreferencesCallback();
                }
            });

            this._contextMenu.connect('close-extension', () => {
                this.emit('close-extension');
            });

            this._contextMenu._menu.connect('open-state-changed', (menu, open) => {
                this._isMenuOpen = open;
                this.emit('context-menu-open-state-changed', open);
                this._updateHoverState();
            });
        }

        _setupEventHandlers() {
            this._indicator.connect('enter-event', () => {
                this._isHovered = true;
                this._updateHoverState();
            });

            this._indicator.connect('leave-event', () => {
                this._isHovered = false;
                this._updateHoverState();
            });

            this._indicator.connect('button-press-event', (actor, event) => {
                const button = event.get_button();
                if (button === Clutter.BUTTON_SECONDARY) {
                    this._contextMenu.toggle();
                    this._indicator.menu.close();
                    return Clutter.EVENT_STOP;
                } else if (button === Clutter.BUTTON_PRIMARY) {
                    this._contextMenu.close();
                    return Clutter.EVENT_PROPAGATE;
                }
                return Clutter.EVENT_PROPAGATE;
            });

            this._indicator.menu.connect('open-state-changed', (menu, open) => {
                this._isMenuOpen = open || (this._contextMenu && this._contextMenu._menu.isOpen);
                this.emit('menu-open-state-changed', open);
                this._updateHoverState();
            });
        }

        _updateHoverState() {
            if (this._isHovered || this._isMenuOpen) {
                this._add_style_pseudo_class('hover');
            } else {
                this._remove_style_pseudo_class('hover');
            }
        }

        _add_style_pseudo_class(pseudo_class) {
            if (this._currentButton && this._currentButton.add_style_pseudo_class) {
                this._currentButton.add_style_pseudo_class(pseudo_class);
            }
        }

        _remove_style_pseudo_class(pseudo_class) {
            if (this._currentButton && this._currentButton.remove_style_pseudo_class) {
                this._currentButton.remove_style_pseudo_class(pseudo_class);
            }
        }

        getMenu() {
            return this._indicator.menu;
        }

        getIndicator() {
            return this._indicator;
        }

        destroy() {
            if (this._contextMenu) {
                this._contextMenu.destroy();
                this._contextMenu = null;
            }
            if (this._indicator) {
                this._indicator.menu.destroy();
                this._indicator.destroy();
                this._indicator = null;
            }
            this._currentButton = null;
            this._openPreferencesCallback = null;
            super.destroy();
        }
    }
);

export default PanelIndicator;
