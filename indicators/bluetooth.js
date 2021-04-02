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

const { St, Gio, GnomeBluetooth } = imports.gi;
const Lang = imports.lang;
const Main = imports.ui.main;
const Config = imports.misc.config;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext.domain("bigSur-StatusArea");
const _ = Gettext.gettext;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const CustomButton = Extension.imports.indicators.button.CustomButton;

var BluetoothIndicator = new Lang.Class({
    Name: "BluetoothIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("BluetoothIndicator");
        //this.menu.box.set_width(270);
        this.menu.actor.add_style_class_name("aggregate-menu");

        this._bluetooth = null;

        if (Config.HAVE_BLUETOOTH) {
            this._bluetooth = Main.panel.statusArea.aggregateMenu._bluetooth;
        }

        if (!this._bluetooth) {
            this.hide();
            return;
        }
        
        this._bluetooth_active_icon_name = 'bluetooth-active-symbolic';
        this._bluetooth_disabled_icon_name = 'bluetooth-disabled-symbolic';
        this._bluetooth_paired_gicon = Gio.icon_new_for_string(`${Me.path}/icons/bluetooth-paired-symbolic.svg`);

        this._bluetooth.remove_actor(this._bluetooth._indicator);
        this._bluetooth._indicator.hide();
        this._bluetooth._item.menu._setSettingsVisibility(false);

        this._indicator = new St.Icon({style_class: "system-status-icon"});
        this._indicator.icon_name = 'bluetooth-active-symbolic';

        this.box.add_child(this._indicator);
      
        Main.panel.statusArea.aggregateMenu.menu.box.remove_actor(this._bluetooth.menu.actor);
        this.menu.addMenuItem(this._bluetooth.menu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._settings = new PopupMenu.PopupMenuItem(_("Bluetooth Settings"));
        this._settings.connect("activate", () => this._openApp("gnome-bluetooth-panel.desktop"));
        this.menu.addMenuItem(this._settings);

        this._bluetooth_properties_changed = this._bluetooth._proxy.connect("g-properties-changed", () => this._sync());
        this._bluetooth._sync();

        this._client = new GnomeBluetooth.Client();
        this._model = this._client.get_model();
        this._model.connect('row-changed', () => this._sync());
        this._model.connect('row-deleted', () => this._sync());
        this._model.connect('row-inserted', () => this._sync());


        this.menu.connect("open-state-changed", (menu, isOpen) => {
            if (isOpen) {
                this._bluetooth._item.actor.show();
            }
        });

        this._sync();

    },
    _sync: function () {

        let sensitive = !Main.sessionMode.isLocked && !Main.sessionMode.isGreeter;
        this.menu.setSensitive(sensitive);

        let adapter = this._bluetooth._getDefaultAdapter();
	let devices = this._bluetooth._getDeviceInfos(adapter);
        let connectedDevices = devices.filter(dev => dev.connected);
        let nConnectedDevices = connectedDevices.length;
        let nDevices = devices.length;

        if (nConnectedDevices > 0) {
            // Paired
            this._indicator.gicon = this._bluetooth_paired_gicon;
            this._bluetooth._item.icon.gicon = this._bluetooth_paired_gicon;
        } else if (nConnectedDevices == -1) {
            // Off
            this._bluetooth._item.actor.show();
	    this._indicator.icon_name = 'bluetooth-disabled-symbolic';	
            this._bluetooth._item.icon.icon_name = 'bluetooth-disabled-symbolic';	
        } else {
            // On
            this._indicator.icon_name = 'bluetooth-active-symbolic';
            this._bluetooth._item.icon.icon_name = 'bluetooth-active-symbolic';
        }

    },
    destroy: function () {
        if (this._bluetooth) {
            this._bluetooth._proxy.disconnect(this._bluetooth_properties_changed);
        }

        this.box.remove_child(this._bluetooth._indicator);
        this.menu.box.remove_actor(this._bluetooth.menu.actor);
        this._bluetooth.add_actor(this._bluetooth._indicator);
        this._bluetooth._item.menu._setSettingsVisibility(true);

        Main.panel.statusArea.aggregateMenu.menu.box.add_actor(this._bluetooth.menu.actor);
        
        this.parent();
    },
});
