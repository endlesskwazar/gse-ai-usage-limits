import GObject from 'gi://GObject';
import BaseIconButton from './BaseIconButton.js';

const RefreshButton = GObject.registerClass(
    {
        Signals: {
            'refresh-clicked': {}
        }
    },
    class RefreshButton extends BaseIconButton {
        _init(params = {}) {
            super._init('view-refresh-symbolic', params);

            this.connect('clicked', () => {
                if (this.reactive) {
                    this.emit('refresh-clicked');
                }
            });
        }
    }
);

export default RefreshButton;
