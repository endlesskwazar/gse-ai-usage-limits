import GObject from 'gi://GObject';
import BaseIconButton from './BaseIconButton.js';

const SettingsButton = GObject.registerClass(
    {
        Signals: {
            'settings-clicked': {}
        }
    },
    class SettingsButton extends BaseIconButton {
        _init(params = {}) {
            super._init('preferences-system-symbolic', params);

            this.connect('clicked', () => {
                if (this.reactive) {
                    this.emit('settings-clicked');
                }
            });
        }
    }
);

export default SettingsButton;
