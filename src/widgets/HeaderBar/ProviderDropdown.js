import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Locale from '../../locale.js';

const ProviderDropdown = GObject.registerClass(
    {
        Signals: {
            'provider-changed': {
                param_types: [GObject.TYPE_STRING]
            }
        }
    },
    class ProviderDropdown extends St.BoxLayout {
        _init({ providerStateManager }) {
            super._init({
                vertical: true,
                x_expand: true,
                y_align: Clutter.ActorAlign.START,
                style_class: 'ai-usage-provider-dropdown-container'
            });

            console.log('ProviderDropdown: _init() called');
            this._providerStateManager = providerStateManager;
            this._providers = providerStateManager.getProviders();
            this._currentProviderKey = null;
            this._providerItems = {};

            // Subscribe to provider state changes
            this._providersUpdatedSignalId = this._providerStateManager.connect('providers-updated', () => {
                this._updateProvidersState();
            });

            this._providerChangedSignalId = this._providerStateManager.connect(
                'provider-changed',
                (psm, providerKey) => {
                    this._updateCurrentProviderDisplay(providerKey);
                }
            );

            // Button Container - styled like a native combo box
            this._providerBtn = new St.Button({
                style_class: 'ai-usage-provider-button',
                can_focus: true,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER
            });

            // Button Layout: [ Icon ... Label (Center) ... Icon ]
            let providerBtnLayout = new St.BoxLayout({
                x_expand: true,
                style_class: 'ai-usage-provider-button-layout'
            });

            // Left chevron icon (for native feel)
            let leftChevron = new St.Icon({
                icon_name: 'pan-start-symbolic',
                style_class: 'ai-usage-provider-chevron'
            });

            this._providerLabel = new St.Label({
                text: Locale.gettext('Select Provider'),
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                style_class: 'ai-usage-provider-label'
            });

            // Right chevron icon
            let rightChevron = new St.Icon({
                icon_name: 'pan-end-symbolic',
                style_class: 'ai-usage-provider-chevron'
            });

            providerBtnLayout.add_child(leftChevron);
            providerBtnLayout.add_child(this._providerLabel);
            providerBtnLayout.add_child(rightChevron);
            this._providerBtn.set_child(providerBtnLayout);

            this._providerBtn.connect('clicked', () => {
                if (this._providerBtn.reactive) {
                    this._dropdownBox.visible = !this._dropdownBox.visible;
                    // Update rounding based on visibility
                    if (this._dropdownBox.visible) {
                        this._providerBtn.add_style_class_name('ai-usage-provider-button-open');
                    } else {
                        this._providerBtn.remove_style_class_name('ai-usage-provider-button-open');
                    }
                }
            });

            // Dropdown Area (Hidden by default) - styled like native menu
            this._dropdownBox = new St.BoxLayout({
                vertical: true,
                visible: false,
                style_class: 'ai-usage-dropdown-box'
            });

            Object.keys(this._providers).forEach(key => {
                let itemBtn = new St.Button({
                    style_class: 'ai-usage-dropdown-item',
                    x_align: Clutter.ActorAlign.FILL,
                    x_expand: true,
                    can_focus: true
                });
                let itemLabel = new St.Label({
                    text: this._providers[key].name,
                    x_align: Clutter.ActorAlign.START,
                    y_align: Clutter.ActorAlign.CENTER,
                    style_class: 'ai-usage-dropdown-item-label'
                });
                itemBtn.set_child(itemLabel);

                itemBtn.connect('clicked', () => {
                    this._selectProvider(key, true); // Emit signal for user-initiated changes
                    this._providerBtn.remove_style_class_name('ai-usage-provider-button-open');
                });
                this._dropdownBox.add_child(itemBtn);
                this._providerItems[key] = itemBtn;
            });

            this.add_child(this._providerBtn);
            this.add_child(this._dropdownBox);

            this._updateProvidersState();
        }

        _updateProvidersState() {
            const activeProviders = this._providerStateManager.getActiveProviders();

            // Update dropdown item visibility
            Object.keys(this._providers).forEach(key => {
                if (this._providerItems[key]) {
                    const isActive = this._providerStateManager.isProviderActive(key);
                    // Visible in dropdown if it is active AND it is NOT the currently selected provider
                    this._providerItems[key].visible = isActive && key !== this._currentProviderKey;
                }
            });

            // Disable provider button if there's zero or one active provider
            if (activeProviders.length <= 1) {
                // Only one provider available, disable the button
                this._providerBtn.reactive = false;
                this._providerBtn.can_focus = false;
                this._providerBtn.add_style_class_name('ai-usage-provider-button-disabled');
                this._providerBtn.remove_style_class_name('ai-usage-provider-button');
                // Hide dropdown if it's currently visible
                if (this._dropdownBox.visible) {
                    this._dropdownBox.visible = false;
                    this._providerBtn.remove_style_class_name('ai-usage-provider-button-open');
                }
            } else {
                // Multiple providers or none, enable the button
                this._providerBtn.reactive = true;
                this._providerBtn.can_focus = true;
                this._providerBtn.add_style_class_name('ai-usage-provider-button');
                this._providerBtn.remove_style_class_name('ai-usage-provider-button-disabled');
            }

            // Check if current provider is still valid
            if (this._currentProviderKey && !this._providerStateManager.isProviderActive(this._currentProviderKey)) {
                // Current provider became invalid (disabled or key removed)
                // ProviderStateManager will handle switching to another active provider
                // We just need to update our display when it emits provider-changed
                this._currentProviderKey = null;
                if (this._providerLabel) this._providerLabel.text = Locale.gettext('No Providers');
            } else if (!this._currentProviderKey && activeProviders.length > 0) {
                // If we were in "No Providers" state but now have one
                // ProviderStateManager will emit provider-changed, which will update our display
                this._currentProviderKey = activeProviders[0];
                this._updateCurrentProviderDisplay(this._currentProviderKey);
            }
        }

        _updateCurrentProviderDisplay(providerKey) {
            this._currentProviderKey = providerKey;
            if (this._providerLabel) {
                if (providerKey && this._providers[providerKey]) {
                    this._providerLabel.text = this._providers[providerKey].name;
                } else {
                    this._providerLabel.text = Locale.gettext('No Providers');
                }
            }
            if (this._dropdownBox) {
                this._dropdownBox.visible = false;
            }

            // Update dropdown visibility logic
            this._updateProvidersState();
        }

        _selectProvider(providerKey, emitSignal = true) {
            // Delegate to ProviderStateManager
            this._providerStateManager.setCurrentProvider(providerKey);

            // Emit signal only when user initiates the change
            if (emitSignal) {
                this.emit('provider-changed', providerKey);
            }
        }

        getCurrentProvider() {
            return this._currentProviderKey;
        }

        setCurrentProvider(_providerKey) {
            // This method is kept for backward compatibility but doesn't do anything
            // ProviderStateManager manages the current provider state
            // The display is updated via the provider-changed signal
        }

        destroy() {
            if (this._providerStateManager && this._providersUpdatedSignalId) {
                this._providerStateManager.disconnect(this._providersUpdatedSignalId);
                this._providersUpdatedSignalId = null;
            }

            if (this._providerStateManager && this._providerChangedSignalId) {
                this._providerStateManager.disconnect(this._providerChangedSignalId);
                this._providerChangedSignalId = null;
            }

            this._providerStateManager = null;
            this._providers = null;
            this._currentProviderKey = null;
            this._providerItems = null;
            this._providerBtn = null;
            this._providerLabel = null;
            this._dropdownBox = null;
        }
    }
);

export default ProviderDropdown;
