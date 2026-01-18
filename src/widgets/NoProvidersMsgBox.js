import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

const NoProvidersMsgBox = GObject.registerClass(
    {
        Signals: {
            'settings-clicked': {}
        }
    },
    class NoProvidersMsgBox extends St.BoxLayout {
        _init() {
            super._init({
                vertical: true,
                style: 'padding: 20px; spacing: 4px;',
                x_align: Clutter.ActorAlign.CENTER
            });

            let msgLabel = new St.Label({
                text: 'No configured providers.\nClick',
                style_class: 'error-label',
                style: 'text-align: center;',
                x_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(msgLabel);

            let settingsButton = new St.Button({
                label: 'Settings',
                style_class: 'ai-usage-settings-link',
                x_align: Clutter.ActorAlign.CENTER
            });
            settingsButton.connect('clicked', () => {
                this.emit('settings-clicked');
            });
            this.add_child(settingsButton);

            let clickLabel = new St.Label({
                text: 'to configure',
                style_class: 'error-label',
                style: 'text-align: center;',
                x_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(clickLabel);
        }
    }
);

export default NoProvidersMsgBox;
