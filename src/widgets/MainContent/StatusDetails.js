import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Locale from '../../locale.js';

const StatusDetails = GObject.registerClass(
    class StatusDetails extends St.BoxLayout {
        _init() {
            super._init({
                vertical: true,
                style: 'padding-top: 6px; spacing: 4px',
                x_align: Clutter.ActorAlign.CENTER
            });

            this._usedLabel = new St.Label({
                text: ' ',
                x_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this._usedLabel);

            this._renewsLabel = new St.Label({
                text: ' ',
                style: 'font-size: 0.85em; opacity: 0.7',
                x_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this._renewsLabel);
        }

        update(requests, limit, renewsStr) {
            this._usedLabel.text = `${Locale.gettext('Used')}: ${requests} / ${limit}`;

            if (renewsStr) {
                this._renewsLabel.text = `${Locale.gettext('Renews in')}: ${renewsStr}`;
            } else {
                this._renewsLabel.text = ' ';
            }
        }
    }
);

export default StatusDetails;
