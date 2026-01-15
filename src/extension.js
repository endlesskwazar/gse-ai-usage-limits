import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Cairo from 'gi://cairo';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const CircularProgress = GObject.registerClass(
class CircularProgress extends St.Widget {
    _init(percentage, labelText) {
        super._init({
            width: 135,
            height: 135,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            layout_manager: new Clutter.BinLayout()
        });
        
        this._percentage = Math.min(Math.max(percentage, 0), 1); // Clamp between 0 and 1
        this._labelText = labelText;

        // Create a drawing area
        this._drawingArea = new St.DrawingArea({
            width: 135,
            height: 135,
            x_expand: true,
            y_expand: true
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
            cr.setLineWidth(12);
            cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            cr.stroke();

            // Progress arc (Green)
            if (this._percentage > 0) {
                cr.setSourceRGBA(0.2, 0.8, 0.2, 1);
                cr.setLineWidth(12);
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
            label.style = 'font-size: 14px;';
        }
        
        this.add_child(label);
    }
});

export default class AIUsageExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        // Create the Panel Menu Button
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        // Icon/Text on the panel
        let panelBox = new St.BoxLayout();
        let label = new St.Label({
            text: 'AI Limits',
            y_align: Clutter.ActorAlign.CENTER
        });
        panelBox.add_child(label);
        this._indicator.add_child(panelBox);

        // --- Tabs Interface ---
        
        // Main container inside the menu
        this._mainLayout = new St.BoxLayout({
            vertical: true,
            width: 216,
            style_class: 'popup-menu-content'
        });

        // Tab Bar (Buttons)
        this._tabBar = new St.BoxLayout({
            vertical: false,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'padding: 12px; spacing: 8px;'
        });

        // Content Area
        this._contentArea = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            style: 'padding-bottom: 24px;'
        });

        // Only Synthetic tab remains
        this._tabs = [
            { name: 'Synthetic', type: 'dynamic' }
        ];

        this._tabs.forEach((tabData, index) => {
            let btn = new St.Button({
                label: tabData.name,
                style_class: 'tab-button',
                can_focus: true,
                toggle_mode: true,
                x_expand: true
            });

            btn.connect('clicked', () => {
                this._switchTab(btn, tabData);
            });

            this._tabBar.add_child(btn);
            
            // Activate first tab by default
            if (index === 0) {
                this._switchTab(btn, tabData);
            }
        });

        this._mainLayout.add_child(this._tabBar);
        this._mainLayout.add_child(this._contentArea);

        // Add the custom layout to the menu
        this._indicator.menu.box.add_child(this._mainLayout);

        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    _switchTab(activeBtn, tabData) {
        // Update button states
        this._tabBar.get_children().forEach(child => {
            child.checked = (child === activeBtn);
        });

        // Clear Content
        this._contentArea.destroy_all_children();

        if (tabData.type === 'dynamic' && tabData.name === 'Synthetic') {
            this._loadSyntheticQuota();
        } else {
            // Static Tabs (This block is technically unused now, but kept for potential future use)
            let progressWidget = new CircularProgress(tabData.percentage);
            this._contentArea.add_child(progressWidget);
            
            let infoLabel = new St.Label({
                text: `${tabData.name} Usage Limit`,
                style_class: 'usage-label',
                x_align: Clutter.ActorAlign.CENTER
            });
            this._contentArea.add_child(infoLabel);
        }
    }

    _loadSyntheticQuota() {
        const apiKey = this._settings.get_string('api-key');
        
        if (!apiKey) {
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
            style: 'padding-top: 10px; spacing: 4px;',
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
        const message = Soup.Message.new('GET', 'https://api.synthetic.new/v2/quotas');
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

                if (data.subscription) {
                    const limit = data.subscription.limit;
                    const requests = data.subscription.requests;
                    
                    const renewsDate = new Date(data.subscription.renewsAt);
                    const diffMs = renewsDate - new Date();
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    const renews = diffMs > 0 ? `${diffHrs}h ${diffMins}m` : 'Now';

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
                        style: 'padding-top: 10px; spacing: 4px;',
                        x_align: Clutter.ActorAlign.CENTER
                    });

                    detailsBox.add_child(new St.Label({
                        text: `Used: ${requests} / ${limit}`,
                        x_align: Clutter.ActorAlign.CENTER
                    }));

                    if (requests > 0) {
                        detailsBox.add_child(new St.Label({
                            text: `Renews in: ${renews}`,
                            style: 'font-size: 0.85em; opacity: 0.7;',
                            x_align: Clutter.ActorAlign.CENTER
                        }));
                    }

                    this._contentArea.add_child(detailsBox);

                } else {
                    throw new Error("Invalid response format");
                }

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
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }
}