import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

const RefreshButton = GObject.registerClass(
    {
        Signals: {
            'refresh-clicked': {}
        }
    },
    class RefreshButton extends St.Button {
        _init(params = {}) {
            super._init({
                style_class: 'ai-usage-icon-button',
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                ...params
            });

            this.set_child(
                new St.Icon({
                    icon_name: 'view-refresh-symbolic',
                    style_class: 'popup-menu-icon'
                })
            );

            this.connect('clicked', () => {
                this.emit('refresh-clicked');
            });
        }
    }
);

export default RefreshButton;
