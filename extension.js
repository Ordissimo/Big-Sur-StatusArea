/* Panel indicators GNOME Shell extension
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

const Lang = imports.lang;
const Main = imports.ui.main;
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const MenuItems = Me.imports.menuItems.MenuItems;
const CustomButton = Me.imports.indicators.button.CustomButton;
const CalendarIndicator = Me.imports.indicators.calendar.CalendarIndicator;
const NetworkIndicator = Me.imports.indicators.network.NetworkIndicator;
const BluetoothIndicator = Me.imports.indicators.bluetooth.BluetoothIndicator;
const NightLightIndicator = Me.imports.indicators.nightlight.NightLightIndicator;
const LightIndicator = Me.imports.indicators.light.LightIndicator;
const NotificationIndicator = Me.imports.indicators.notification.NotificationIndicator;
const PowerIndicator = Me.imports.indicators.power.PowerIndicator;
const UserIndicator = Me.imports.indicators.system.UserIndicator;
const VolumeIndicator = Me.imports.indicators.volume.VolumeIndicator;

function init() {
    Convenience.initTranslations("bigSur-StatusArea");
}

let settings;
let menuItems;
let indicators = null;
let settingsChanged;

let light = null;
let nightlight = null;
let volume = null;
let network = null;
let bluetooth = null;
let power = null;
let calendar = null;
let user = null;
let notification = null;

const CENTER_BOX = Main.panel._centerBox;
const RIGHT_BOX = Main.panel._rightBox;

function enable() {
    Main.panel.statusArea.aggregateMenu.container.hide();
    Main.panel.statusArea.dateMenu.container.hide();
    Main.panel._centerBox.remove_child(Main.panel.statusArea.dateMenu.container);

    network = new NetworkIndicator();
    bluetooth = new BluetoothIndicator();
    volume = new VolumeIndicator();
    power = new PowerIndicator();
    calendar = new CalendarIndicator();
    notification = new NotificationIndicator();
    user = new UserIndicator();
    nightlight = new NightLightIndicator();
    light = new LightIndicator();
    
    if (notification)
       Main.panel.addToStatusArea(notification.name, notification, 0, "right");
    if (user)
       Main.panel.addToStatusArea(user.name, user, 0, "right");
    if (calendar)
       Main.panel.addToStatusArea(calendar.name, calendar, 0, "right");
    if (power)
       Main.panel.addToStatusArea(power.name, power, 0, "right");
    if (network)
       Main.panel.addToStatusArea(network.name, network, 0, "right");
    if (bluetooth)
       Main.panel.addToStatusArea(bluetooth.name, bluetooth, 0, "right");
    if (bluetooth)
       Main.panel.addToStatusArea(volume.name, volume, 0, "right");
    if (nightlight)
       Main.panel.addToStatusArea(nightlight.name, nightlight, 0, "right");
    if (light)
       Main.panel.addToStatusArea(light.name, light, 0, "right");

    // Load Settings
    settings = Convenience.getSettings();
    menuItems = new MenuItems(settings);
    settingsChanged = new Array();
    let i = 0;
    settingsChanged[i++] = settings.connect("changed::items", applySettings);
    settingsChanged[i++] = settings.connect("changed::spacing", applySettings);
    settingsChanged[i++] = settings.connect("changed::user-icon", changeUsericon);
    settingsChanged[i++] = settings.connect("changed::date-format", changeDateformat);
    settingsChanged[i++] = settings.connect("changed::activate-spacing", applySettings);
    settingsChanged[i++] = settings.connect("changed::separate-date-and-notification", applySettings);

    applySettings();
    changeUsername();
    changeUsericon();
    changeDateformat();
}

function changeUsername() {
    let username = "";
    user.changeLabel(username);
}

function changeUsericon() {
    let enableUserIcon = settings.get_boolean("user-icon");
    user.changeIcon(enableUserIcon);
}

function changeDateformat() {
    let dateformat = settings.get_string("date-format");
    calendar.override(dateformat);
}

function applySettings() {
    let enabled = menuItems.getEnableItems();
    let center = menuItems.getCenterItems();
    indicators = new Array(enabled.length);

    removeAll();
    setup(enabled, center, indicators, "power", power);
    setup(enabled, center, indicators, "user", user);
    setup(enabled, center, indicators, "volume", volume);
    setup(enabled, center, indicators, "network", network);
    setup(enabled, center, indicators, "bluetooth", bluetooth);
    setup(enabled, center, indicators, "calendar", calendar);
    setup(enabled, center, indicators, "notification", notification);
    setup(enabled, center, indicators, "nightlight", nightlight);
    setup(enabled, center, indicators, "light", light);

    let rightchildren = RIGHT_BOX.get_children().length;
    let centerchildren = CENTER_BOX.get_children().length;

    let spacing = settings.get_int("spacing");
    if (!settings.get_boolean("activate-spacing"))
	spacing = -1;

    indicators.reverse().forEach(function (item) {
        item.set_spacing(spacing);
        if (item._center) {
            CENTER_BOX.insert_child_at_index(item.container, centerchildren);
        } else {
            RIGHT_BOX.insert_child_at_index(item.container, rightchildren);
        }
    });

}

function setup(enabledItems, centerItems, arrayIndicators, name, indicator) {
    if (!indicator) return;
    let index = enabledItems.indexOf(name);
    let valid = index != -1;
    if (valid) {
        arrayIndicators[index] = indicator;
        arrayIndicators[index]._center = centerItems.indexOf(name) != -1;
    }
}

function removeAll() {
    removeContainer(light);
    removeContainer(nightlight);
    removeContainer(volume);
    removeContainer(network);
    removeContainer(bluetooth);
    removeContainer(power);
    removeContainer(calendar);
    removeContainer(user);
    removeContainer(notification);
}

function removeContainer(item) {
    if (!item) return;
    if (item._center) {
        CENTER_BOX.remove_child(item.container)
    } else {
        RIGHT_BOX.remove_child(item.container);
    }
    item._center = false;
}

function disable() {
    settingsChanged.forEach(function (item) {
        settings.disconnect(item);
    });
    settingsChanged = null;
    settings = null;

    light.destroy();
    nightlight.destroy();
    volume.destroy();
    power.destroy();
    network.destroy();
    bluetooth.destroy();
    user.destroy();
    notification.destroy();
    calendar.destroy();

    Main.panel.statusArea.aggregateMenu.container.show();
    Main.panel.statusArea.dateMenu.container.show();
    Main.panel._centerBox.add_child(Main.panel.statusArea.dateMenu.container);
}
