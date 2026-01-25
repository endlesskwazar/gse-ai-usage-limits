import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

const BaseIconButton = GObject.registerClass(
    class BaseIconButton extends St.Button {
        _init(iconName, params = {}) {
            super._init({
                style_class: 'ai-usage-icon-button',
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                ...params
            });

            this.set_child(
                new St.Icon({
                    icon_name: iconName,
                    style_class: 'popup-menu-icon'
                })
            );
        }

        setEnabled(enabled) {
            if (enabled) {
                this.reactive = true;
                this.can_focus = true;
                this.remove_style_class_name('ai-usage-icon-button-disabled');
            } else {
                this.reactive = false;
                this.can_focus = false;
                this.add_style_class_name('ai-usage-icon-button-disabled');
            }
        }
    }
);

export default BaseIconButton;
