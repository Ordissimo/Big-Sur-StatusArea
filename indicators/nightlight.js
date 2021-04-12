/* Panel Indicators GNOME Shell extension
 *
 * Copyright (C) 2019 Leandro Vital <leavitals@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { St, Gio } = imports.gi;
const Lang = imports.lang;
const Main = imports.ui.main;
const Slider = imports.ui.slider;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext.domain("bigSur-StatusArea");
const _ = Gettext.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const CustomButton = Extension.imports.indicators.button.CustomButton;

var NightLightIndicator = new Lang.Class({
    Name: "NightLightIndicator",
    Extends: CustomButton,

    _init: function () {
        
        this._min = 4700;
        this._max = 1700;

        this.parent("NightLightIndicator");
        //this.menu.box.set_width(250);
        this.menu.actor.add_style_class_name("aggregate-menu");

        this._nightLight = Main.panel.statusArea.aggregateMenu._nightLight;
        this._nightLight.remove_actor(this._nightLight._indicator);
        this._nightLight.show();
        this._nightLight._sync = function () {};
        
        this.box.add_child(this._nightLight._indicator);
        
        this._label = new St.Label({
            style_class: "label-menu"
        });

        this._settings = new Gio.Settings({
            schema_id: "org.gnome.settings-daemon.plugins.color"
        });
        this._settings.connect('changed::night-light-enabled', () => this._sync());

        let sliderItem = new PopupMenu.PopupBaseMenuItem({
            activate: false
        });

        let sliderIcon = new St.Icon({
            icon_name: 'daytime-sunset-symbolic',
            style_class: 'popup-menu-icon'
        });
        sliderItem.actor.add(sliderIcon);

        this._slider = new Slider.Slider(0);
        this._slider.connect('notify::value', (s, value) => this._sliderChanged(s, value));
        this._slider.accessible_name = 'Temperature';

        this.menu.connect("open-state-changed", (menu, isOpen) => {
            if (isOpen) {
                this._updateView();
            }
        });

        sliderItem.actor.add(this._slider);

        this.menu.box.add_child(this._label);
        this.menu.addMenuItem(sliderItem);
       
        this._separator = new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(this._separator);
        
        this._disableItem = new PopupMenu.PopupMenuItem(_("Resume"));
        this._disableItem.connect("activate", () => this._change());
        this.menu.addMenuItem(this._disableItem);
        
        this.turnItem = new PopupMenu.PopupMenuItem(_("Turn Off"));
        this.turnItem.connect("activate", () => this._toggleFeature());
        this.menu.addMenuItem(this.turnItem);
        
        let nightSettings = new PopupMenu.PopupMenuItem(_("Display Settings"));
        nightSettings.connect("activate", () => this._openApp("gnome-display-panel.desktop"));
        this.menu.addMenuItem(nightSettings);
        
        this._properties_changed = this._nightLight._proxy.connect("g-properties-changed", () => this._sync());
        
        Main.sessionMode.connect('updated', () => this._sync());
        
        this._sync();
        this._updateView();
    },
    _sliderChanged: function (slider, value) {
        const temperature = parseInt(this._slider.value * (this._max - this._min)) + this._min;
        this._settings.set_uint('night-light-temperature', temperature);
    },
    _updateView: function () {
        // Update temperature view
        const temperature = this._settings.get_uint('night-light-temperature');
        const value = (temperature - this._min) / (this._max - this._min);
        this._slider.value = value;
    },    
    _change: function () {
        this._nightLight._proxy.DisabledUntilTomorrow = !this._nightLight._proxy.DisabledUntilTomorrow;
        this._sync();
    },
    _toggleFeature: function () {
        let enabledStatus = this._settings.get_boolean("night-light-enabled");
        this._settings.set_boolean("night-light-enabled", !enabledStatus);
        this._sync();
    },
    _sync: function () {
	let featureEnabled = this._settings.get_boolean("night-light-enabled");
        this.turnItem.label.set_text(featureEnabled ? _("Turn Off") : _("Turn On"));
        let disabled = this._nightLight._proxy.DisabledUntilTomorrow || !this._nightLight._proxy.NightLightActive;
        this._label.set_text(disabled ? _("Night Light Disabled") : _("Night Light On"));
        this._disableItem.label.text = disabled ? _("Resume") : _("Disable Until Tomorrow");
        this._disableItem.actor.visible = featureEnabled;
        this.visible = true;
    },
    destroy: function () {
        this._nightLight._proxy.disconnect(this._properties_changed);
        this.box.remove_child(this._nightLight._indicator);
        this._nightLight.hide();
        this._nightLight.add_actor(this._nightLight._indicator);
        this.parent();
    }
});
