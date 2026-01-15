import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Cairo from 'gi://cairo';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const CircularProgress = GObject.registerClass(
class CircularProgress extends St.Widget {
    _init(percentage, labelText) {
        super._init({
            width: 200,
            height: 200,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            layout_manager: new Clutter.BinLayout()
        });
        
        this._percentage = percentage;

        // Create a drawing area
        this._drawingArea = new St.DrawingArea({
            width: 200,
            height: 200,
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
            cr.setSourceRGBA(0.2, 0.8, 0.2, 1);
            cr.setLineWidth(12);
            cr.setLineCap(Cairo.LineCap.ROUND);
            cr.arc(centerX, centerY, radius, startAngle, endAngle);
            cr.stroke();
            
            // Explicitly dispose of the context if required, though usually automatic in JS bindings
            // cr.$dispose(); 
        });

        this.add_child(this._drawingArea);

        // Overlay label
        let label = new St.Label({
            text: `${Math.round(percentage * 100)}%`,
            style_class: 'progress-label',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        
        this.add_child(label);
    }
});

export default class AIUsageExtension extends Extension {
    enable() {
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
            width: 320,
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

        this._tabs = [
            { name: 'Daily', percentage: 0.45 },
            { name: 'Weekly', percentage: 0.70 },
            { name: 'Monthly', percentage: 0.20 }
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

        // Update Content
        this._contentArea.destroy_all_children();
        
        let progressWidget = new CircularProgress(tabData.percentage);
        this._contentArea.add_child(progressWidget);
        
        let infoLabel = new St.Label({
            text: `${tabData.name} Usage Limit`,
            style_class: 'usage-label',
            x_align: Clutter.ActorAlign.CENTER
        });
        this._contentArea.add_child(infoLabel);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}