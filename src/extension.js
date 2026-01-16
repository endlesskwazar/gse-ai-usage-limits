import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import Cairo from 'gi://cairo';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const PROVIDERS = {
    synthetic: {
        name: 'Synthetic',
        settingKey: 'synthetic-api-key',
        enabledKey: 'synthetic-enabled',
        url: 'https://api.synthetic.new/v2/quotas',
        parse: (data) => {
            if (data.subscription) {
                return {
                    limit: data.subscription.limit,
                    used: data.subscription.requests,
                    renewsAt: data.subscription.renewsAt
                };
            }
            throw new Error("Invalid format");
        }
    },
    chutes: {
        name: 'Chutes.ai',
        settingKey: 'chutes-api-key',
        enabledKey: 'chutes-enabled',
        url: 'https://api.chutes.ai/users/me/quota_usage/me',
        parse: (data) => {
            console.log(`[AI-Usage] Chutes response: ${JSON.stringify(data)}`);
            
            const limit = data.quota || 0;
            const used = data.used || 0;

            // Calculate next 00:00 UTC
            const now = new Date();
            const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

            return {
                limit: limit,
                used: used,
                renewsAt: nextReset.toISOString()
            };
        }
    },
    nanogpt: {
        name: 'Nano-GPT',
        settingKey: 'nano-gpt-api-key',
        enabledKey: 'nano-gpt-enabled',
        url: 'https://nano-gpt.com/api/subscription/v1/usage',
        parse: (data, settings) => {
            // Check user preference for tracking mode
            let showDaily = true;
            if (settings) {
                showDaily = settings.get_boolean('nano-gpt-show-daily-limit');
            }
            
            // Fallback if data structure is unexpected
            if (!data.limits || !data.daily || !data.monthly) {
                 throw new Error("Invalid format");
            }

            const target = showDaily ? data.daily : data.monthly;
            const limit = (showDaily ? data.limits.daily : data.limits.monthly) || 0;

            return {
                limit: limit,
                used: target.used,
                renewsAt: target.resetAt
            };
        }
    }
};

const CircularProgress = GObject.registerClass(
class CircularProgress extends St.Widget {
    _init(percentage, labelText) {
        super._init({
            width: 110,
            height: 110,
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            layout_manager: new Clutter.BinLayout()
        });
        
        this._percentage = Math.min(Math.max(percentage, 0), 1); // Clamp between 0 and 1
        this._labelText = labelText;

        // Create a drawing area
        this._drawingArea = new St.DrawingArea({
            width: 110,
            height: 110,
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        this._drawingArea.connect('repaint', (area) => {
            let cr = area.get_context();
            let [width, height] = area.get_surface_size();
            let centerX = width / 2;
            let centerY = height / 2;
            let radius = Math.min(width, height) / 2 - 10;
            let startAngle = -Math.PI / 2;
            let endAngle = startAngle + (2 * Math.PI * this._percentage);

            // Background circle (Grey)
            cr.setSourceRGBA(0.3, 0.3, 0.3, 0.5);
            cr.setLineWidth(10);
            cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            cr.stroke();

            // Progress arc (Green)
            if (this._percentage > 0) {
                cr.setSourceRGBA(0.2, 0.8, 0.2, 1);
                cr.setLineWidth(10);
                cr.setLineCap(Cairo.LineCap.ROUND);
                cr.arc(centerX, centerY, radius, startAngle, endAngle);
                cr.stroke();
            }
        });

        this.add_child(this._drawingArea);

        // Overlay label
        let label = new St.Label({
            text: this._labelText || `${Math.round(this._percentage * 100)}%`,
            style_class: 'progress-label',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        if (this._labelText) {
            label.style = 'font-size: 12px;';
        }
        
        this.add_child(label);
    }
});

export default class AIUsageExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._providers = Object.keys(PROVIDERS);

        // Create the Panel Menu Button
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        // Icon/Text on the panel
        let panelBox = new St.BoxLayout();
        
        let icon = new St.Icon({
            icon_name: 'thunderbolt-symbolic',
            style_class: 'system-status-icon'
        });
        panelBox.add_child(icon);
        this._indicator.add_child(panelBox);

        // --- Context Menu (Right Click) ---
        this._contextMenu = new PopupMenu.PopupMenu(this._indicator, 0.0, St.Side.TOP);
        Main.layoutManager.uiGroup.add_child(this._contextMenu.actor);
        this._contextMenu.actor.hide();

        // Add a menu manager to handle auto-closing
        this._menuManager = new PopupMenu.PopupMenuManager(this._indicator);
        this._menuManager.addMenu(this._contextMenu);

        let settingsItem = new PopupMenu.PopupMenuItem('Settings');
        settingsItem.connect('activate', () => {
            this.openPreferences();
        });
        this._contextMenu.addMenuItem(settingsItem);

        let closeItem = new PopupMenu.PopupMenuItem('Close Extension');
        closeItem.connect('activate', () => {
            Main.extensionManager.disableExtension(this.uuid);
        });
        this._contextMenu.addMenuItem(closeItem);

        // Handle Clicks
        this._indicator.connect('button-press-event', (actor, event) => {
            const button = event.get_button();
            if (button === Clutter.BUTTON_SECONDARY) {
                // Right click: Toggle Context Menu
                this._contextMenu.toggle();
                this._indicator.menu.close(); // Ensure main menu is closed
                return Clutter.EVENT_STOP;
            } else if (button === Clutter.BUTTON_PRIMARY) {
                // Left click: Close context menu
                this._contextMenu.close();
                return Clutter.EVENT_PROPAGATE;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // --- Interface ---
        
        // Main container inside the menu
        this._mainLayout = new St.BoxLayout({
            vertical: true,
            style_class: 'main-container'
        });

        // Header Bar (Refresh + Provider Chooser)
        this._headerBar = new St.BoxLayout({
            vertical: false,
            style_class: 'header-box',
            x_expand: true
        });

        // 1. Refresh Button
        let refreshBtn = new St.Button({
            style_class: 'icon-button',
            can_focus: true
        });
        refreshBtn.set_child(new St.Icon({
            icon_name: 'view-refresh-symbolic',
            style_class: 'system-status-icon'
        }));
        refreshBtn.connect('clicked', () => {
            this._loadQuota(this._currentProviderKey);
        });
        this._headerBar.add_child(refreshBtn);

        // 2. Provider Chooser Button
        this._providerBtn = new St.Button({
            style_class: 'provider-button',
            can_focus: true,
            x_expand: true,
            y_expand: true // Fill height of header
        });
        
        // Layout for Provider Button: [ Label (Expand) ... Icon ]
        let providerBtnLayout = new St.BoxLayout({
            x_expand: true
        });
        
        this._providerLabel = new St.Label({
            text: '', // Set on init
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true
        });
        
        let arrowIcon = new St.Icon({
            icon_name: 'pan-down-symbolic',
            style_class: 'popup-menu-icon'
        });

        providerBtnLayout.add_child(this._providerLabel);
        providerBtnLayout.add_child(arrowIcon);
        this._providerBtn.set_child(providerBtnLayout);

        this._providerBtn.connect('clicked', () => {
            if (this._providerBtn.reactive) {
                this._dropdownBox.visible = !this._dropdownBox.visible;
            }
        });
        
        this._headerBar.add_child(this._providerBtn);

        // Dropdown Area (Hidden by default)
        this._dropdownBox = new St.BoxLayout({
            vertical: true,
            visible: false,
            style: 'background-color: rgba(0,0,0,0.2); border-radius: 4px; margin-bottom: 8px;'
        });
        
        this._providerItems = {};
        this._providers.forEach(key => {
             let itemBtn = new St.Button({
                style_class: 'dropdown-item',
                x_align: Clutter.ActorAlign.FILL,
                x_expand: true,
                can_focus: true
             });
             let itemLabel = new St.Label({
                text: PROVIDERS[key].name,
                x_align: Clutter.ActorAlign.START
             });
             itemBtn.set_child(itemLabel);
             
             itemBtn.connect('clicked', () => {
                 this._selectProvider(key);
             });
             this._dropdownBox.add_child(itemBtn);
             this._providerItems[key] = itemBtn;
        });

        // Content Area
        this._contentArea = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'padding-bottom: 12px;'
        });

        this._mainLayout.add_child(this._headerBar);
        this._mainLayout.add_child(this._dropdownBox);
        this._mainLayout.add_child(this._contentArea);

        // Add the custom layout to the menu
        this._indicator.menu.box.add_child(this._mainLayout);

        Main.panel.addToStatusArea(this.uuid, this._indicator);

        // Listen for settings changes
        this._settingsSignalId = this._settings.connect('changed', () => {
            this._updateProvidersState();
        });

        // Initialize state
        this._updateProvidersState();

        // If current provider is not set (e.g. first run or invalid), select the first active one
        if (!this._currentProviderKey || !this._isProviderActive(this._currentProviderKey)) {
             const firstActive = this._providers.find(k => this._isProviderActive(k));
             if (firstActive) {
                 this._selectProvider(firstActive);
             } else {
                 // No active providers
                 this._showNoProvidersMessage();
             }
        } else {
            // Just refresh current
            this._selectProvider(this._currentProviderKey);
        }
    }

    _isProviderActive(key) {
        const provider = PROVIDERS[key];
        const apiKey = this._settings.get_string(provider.settingKey);
        const enabled = this._settings.get_boolean(provider.enabledKey);
        return apiKey && apiKey.length > 0 && enabled;
    }

    _updateProvidersState() {
        const activeProviders = this._providers.filter(key => this._isProviderActive(key));

        // Update dropdown visibility
        this._providers.forEach(key => {
            if (this._providerItems[key]) {
                const isActive = this._isProviderActive(key);
                // Visible in dropdown if it is active AND it is NOT the currently selected provider
                this._providerItems[key].visible = isActive && (key !== this._currentProviderKey);
            }
        });

        // Disable provider button if there's only one active provider
        if (this._providerBtn) {
            if (activeProviders.length === 1) {
                // Only one provider available, disable the button
                this._providerBtn.reactive = false;
                this._providerBtn.can_focus = false;
                this._providerBtn.add_style_class_name('provider-button-disabled');
                this._providerBtn.remove_style_class_name('provider-button');
                // Hide dropdown if it's currently visible
                if (this._dropdownBox && this._dropdownBox.visible) {
                    this._dropdownBox.visible = false;
                }
            } else {
                // Multiple providers or none, enable the button
                this._providerBtn.reactive = true;
                this._providerBtn.can_focus = true;
                this._providerBtn.add_style_class_name('provider-button');
                this._providerBtn.remove_style_class_name('provider-button-disabled');
            }
        }

        // Check if current provider is still valid
        if (this._currentProviderKey && !this._isProviderActive(this._currentProviderKey)) {
            // Current provider became invalid (disabled or key removed)
            // Switch to another active provider if available
            if (activeProviders.length > 0) {
                this._selectProvider(activeProviders[0]);
            } else {
                this._currentProviderKey = null;
                if (this._providerLabel) this._providerLabel.text = 'No Providers';
                this._showNoProvidersMessage();
            }
        } else if (!this._currentProviderKey && activeProviders.length > 0) {
            // If we were in "No Providers" state but now have one
            this._selectProvider(activeProviders[0]);
        }
    }

    _showNoProvidersMessage() {
        if (this._contentArea) {
            this._contentArea.destroy_all_children();
            let msg = new St.Label({
                text: 'No active providers.\nConfigure in Settings.',
                style_class: 'error-label',
                style: 'text-align: center; padding: 20px;',
                x_align: Clutter.ActorAlign.CENTER
            });
            this._contentArea.add_child(msg);
        }
        if (this._providerLabel) {
            this._providerLabel.text = 'Select Provider';
        }
    }

    _selectProvider(providerKey) {
        this._currentProviderKey = providerKey;
        if (this._providerLabel) {
            this._providerLabel.text = PROVIDERS[providerKey].name;
        }
        if (this._dropdownBox) {
            this._dropdownBox.visible = false;
        }

        // Update dropdown visibility logic
        this._updateProvidersState();

        this._loadQuota(providerKey);
    }

    _loadQuota(providerKey) {
        const provider = PROVIDERS[providerKey];
        if (!provider) return;

        const apiKey = this._settings.get_string(provider.settingKey);
        
        // Clear Content immediately
        if (this._contentArea) {
             this._contentArea.destroy_all_children();
        }

        if (!apiKey) {
            // This case should theoretically be handled by _isProviderActive filtering,
            // but keep it as a fallback for safety.
            let errorLabel = new St.Label({
                text: 'API Key missing.\nPlease set it in Extension Settings.',
                style_class: 'error-label',
                style: 'text-align: center; padding: 20px;',
                x_align: Clutter.ActorAlign.CENTER
            });
            this._contentArea.add_child(errorLabel);
            return;
        }

        // Skeleton / Loading State
        let progressWidget = new CircularProgress(0, 'Loading...');
        this._contentArea.add_child(progressWidget);

        let detailsBox = new St.BoxLayout({
            vertical: true,
            style: 'padding-top: 6px; spacing: 4px;',
            x_align: Clutter.ActorAlign.CENTER
        });

        // Reserve space for text (2 lines)
        detailsBox.add_child(new St.Label({ text: ' ' }));
        detailsBox.add_child(new St.Label({ 
            text: ' ',
            style: 'font-size: 0.85em; opacity: 0.7;'
        }));

        this._contentArea.add_child(detailsBox);

        // Perform async request
        const session = new Soup.Session();
        const message = Soup.Message.new('GET', provider.url);
        message.request_headers.append('Authorization', `Bearer ${apiKey}`);
        
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, result) => {
            if (!this._indicator) return; // Extension disabled/destroyed

            try {
                // Clear "Loading..."
                this._contentArea.destroy_all_children();

                const bytes = session.send_and_read_finish(result);
                
                if (message.status_code !== 200) {
                     let errLabel = new St.Label({
                        text: `Error: HTTP ${message.status_code}`,
                        style: 'color: red;',
                        x_align: Clutter.ActorAlign.CENTER
                    });
                    this._contentArea.add_child(errLabel);
                    return;
                }

                const decoder = new TextDecoder();
                const responseBody = decoder.decode(bytes.get_data());
                const data = JSON.parse(responseBody);

                const parsedData = provider.parse(data, this._settings);
                const limit = parsedData.limit;
                const requests = parsedData.used;
                const renewsAt = parsedData.renewsAt;

                let renewsStr = '';
                if (renewsAt && requests > 0) {
                    const renewsDate = new Date(renewsAt);
                    const diffMs = renewsDate - new Date();
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    renewsStr = diffMs > 0 ? `${diffHrs}h ${diffMins}m` : 'Now';
                }

                let percentage = 0;
                if (limit > 0) {
                    percentage = requests / limit;
                }

                // Display Progress
                let progressWidget = new CircularProgress(percentage);
                this._contentArea.add_child(progressWidget);

                // Display Details
                let detailsBox = new St.BoxLayout({
                    vertical: true,
                    style: 'padding-top: 6px; spacing: 4px;',
                    x_align: Clutter.ActorAlign.CENTER
                });

                detailsBox.add_child(new St.Label({
                    text: `Used: ${requests} / ${limit}`,
                    x_align: Clutter.ActorAlign.CENTER
                }));

                if (renewsStr) {
                    detailsBox.add_child(new St.Label({
                        text: `Renews in: ${renewsStr}`,
                        style: 'font-size: 0.85em; opacity: 0.7;',
                        x_align: Clutter.ActorAlign.CENTER
                    }));
                }

                this._contentArea.add_child(detailsBox);

            } catch (e) {
                // Determine if this._contentArea is still valid to write to
                if (this._contentArea && this._contentArea.get_parent()) {
                    this._contentArea.destroy_all_children();
                    let errLabel = new St.Label({
                        text: `Error: ${e.message}`,
                        style: 'color: red; padding: 10px;',
                        x_align: Clutter.ActorAlign.CENTER
                    });
                    this._contentArea.add_child(errLabel);
                }
                console.error(e);
            }
        });
    }

    disable() {
        if (this._settings && this._settingsSignalId) {
            this._settings.disconnect(this._settingsSignalId);
            this._settingsSignalId = null;
        }

        if (this._menuManager) {
            this._menuManager = null;
        }
        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
        this._headerBar = null;
        this._dropdownBox = null;
        this._providerItems = null;
        this._contentArea = null;
    }
}