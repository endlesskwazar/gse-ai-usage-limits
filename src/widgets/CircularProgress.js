import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Cairo from 'gi://cairo';

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

            this._percentage = Math.min(Math.max(percentage, 0), 1);
            this._labelText = labelText;

            this._drawingArea = new St.DrawingArea({
                width: 110,
                height: 110,
                x_expand: false,
                y_expand: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER
            });

            this._drawingArea.connect('repaint', area => {
                let cr = area.get_context();
                let [width, height] = area.get_surface_size();
                let centerX = width / 2;
                let centerY = height / 2;
                let radius = Math.min(width, height) / 2 - 10;
                let startAngle = -Math.PI / 2;
                let endAngle = startAngle + 2 * Math.PI * this._percentage;

                cr.setSourceRGBA(0.3, 0.3, 0.3, 0.5);
                cr.setLineWidth(10);
                cr.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                cr.stroke();

                if (this._percentage > 0) {
                    cr.setSourceRGBA(0.2, 0.8, 0.2, 1);
                    cr.setLineWidth(10);
                    cr.setLineCap(Cairo.LineCap.ROUND);
                    cr.arc(centerX, centerY, radius, startAngle, endAngle);
                    cr.stroke();
                }
            });

            this.add_child(this._drawingArea);

            let label = new St.Label({
                text: this._labelText || `${Math.round(this._percentage * 100)}%`,
                style_class: 'ai-usage-progress-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER
            });

            if (this._labelText) {
                label.style = 'font-size: 12px;';
            }

            this.add_child(label);
        }
    }
);

export default CircularProgress;
