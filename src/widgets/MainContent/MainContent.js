import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Locale from '../../locale.js';
import CircularProgress from './CircularProgress.js';
import StatusDetails from './StatusDetails.js';
import NoProvidersMsgBox from './NoProvidersMsgBox.js';

const MainContent = GObject.registerClass(
    {
        Signals: {
            'settings-clicked': {}
        }
    },
    class MainContent extends St.BoxLayout {
        _init() {
            super._init({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                style_class: 'ai-usage-main-content'
            });

            console.log('MainContent: _init() called with style class:', this.get_style_class_name());
            this._currentState = null;
            this._widgets = {};
        }

        showNoProviders() {
            console.log('MainContent: showNoProviders() called');
            this.clear();

            const msgBox = new NoProvidersMsgBox();
            msgBox.connect('settings-clicked', () => {
                this.emit('settings-clicked');
            });
            this.add_child(msgBox);

            this._widgets.msgBox = msgBox;
            this._currentState = 'noproviders';
        }

        showLoading() {
            console.log('MainContent: showLoading() called');
            this.clear();

            const progressWidget = new CircularProgress(0, Locale.gettext('Loading...'));
            this.add_child(progressWidget);

            const statusDetails = new StatusDetails();
            this.add_child(statusDetails);

            this._widgets.progressWidget = progressWidget;
            this._widgets.statusDetails = statusDetails;
            this._currentState = 'loading';
        }

        showQuota(used, limit, renewsStr, percentage) {
            console.log('MainContent: showQuota() called with percentage:', percentage);
            this.clear();

            const progressWidget = new CircularProgress(percentage);
            this.add_child(progressWidget);

            const statusDetails = new StatusDetails();
            statusDetails.update(used, limit, renewsStr);
            this.add_child(statusDetails);

            this._widgets.progressWidget = progressWidget;
            this._widgets.statusDetails = statusDetails;
            this._currentState = 'quota';
        }

        showError(message, isApiKeyError = false) {
            this.clear();

            let errorLabel = new St.Label({
                text: message,
                style_class: isApiKeyError
                    ? 'ai-usage-error-label ai-usage-error-label-api-key'
                    : 'ai-usage-error-label',
                x_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(errorLabel);

            this._widgets.errorLabel = errorLabel;
            this._currentState = 'error';
        }

        clear() {
            this.destroy_all_children();
            this._widgets = {};
            this._currentState = null;
        }

        getCurrentState() {
            return this._currentState;
        }

        destroy() {
            this.clear();
            super.destroy();
        }
    }
);

export default MainContent;
