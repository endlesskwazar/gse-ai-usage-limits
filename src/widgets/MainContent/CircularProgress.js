import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Cairo from 'gi://cairo';

const CircularProgress = GObject.registerClass(
    class CircularProgress extends St.Widget {
        _init(percentage, labelText) {
            super._init({
                x_expand: false,
                y_expand: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                layout_manager: new Clutter.BinLayout()
            });

            this.add_style_class_name('ai-usage-circular-progress-container');
            console.log('CircularProgress: Created with style class:', this.get_style_class_name());

            this._percentage = Math.min(Math.max(percentage, 0), 1);
            this._labelText = labelText;

            this._drawingArea = new St.DrawingArea({
                style_class: 'ai-usage-circular-progress-canvas',
                x_expand: false,
                y_expand: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER
            });

            this._drawingArea.connect('repaint', area => {
                console.log('CircularProgress: repaint event fired');
                let cr = area.get_context();
                let [width, height] = area.get_surface_size();
                let centerX = width / 2;
                let centerY = height / 2;
                let radius = Math.min(width, height) / 2 - 10;
                let startAngle = -Math.PI / 2;
                let endAngle = startAngle + 2 * Math.PI * this._percentage;

                // Background ring - thinner and airier
                cr.setSourceRGBA(1, 1, 1, 0.1);
                cr.setLineWidth(6);
                cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                cr.stroke();

                if (this._percentage > 0) {
                    // Progress ring - vibrant green
                    cr.setSourceRGBA(0.18, 0.8, 0.44, 1);
                    cr.setLineWidth(6);
                    cr.setLineCap(Cairo.LineCap.ROUND);
                    cr.arc(centerX, centerY, radius, startAngle, endAngle);
                    cr.stroke();
                }
            });

            this.add_child(this._drawingArea);

            let label = new St.Label({
                text: this._labelText || `${Math.round(this._percentage * 100)}%`,
                style_class: this._labelText ? 'ai-usage-progress-label-small' : 'ai-usage-progress-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER
            });

            this.add_child(label);
        }
    }
);

export default CircularProgress;
