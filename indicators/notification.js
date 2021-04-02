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
const Main = imports.ui.main;
const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain("bigSur-StatusArea");
const _ = Gettext.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const CustomButton = Extension.imports.indicators.button.CustomButton;

const NoNotifications = 'task-past-due-symbolic';
const NewNotifications = 'task-due-symbolic';


var NotificationIndicator = new Lang.Class({
    Name: "NotificationIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("NotificationIndicator");

        this._messageList = Main.panel.statusArea.dateMenu._messageList;
        try {
            this._messageList._removeSection(this._messageList._eventsSection);
        } catch (e) {}
        

        this._messageListParent = this._messageList.get_parent();
        this._messageListParent.remove_actor(this._messageList);

        this._indicator = new MessagesIndicator(Main.panel.statusArea.dateMenu._indicator._sources);

        this.box.add_child(this._indicator.actor);

        this._vbox = new St.BoxLayout({
            height: 400
        });

        this._vbox.add(this._messageList);
        this.menu.box.add(this._vbox);

        try {
            this._messageList._removeSection(this._messageList._mediaSection);
        } catch (e) {}

        this.menu.connect("open-state-changed", (menu, isOpen) => {
            if (isOpen) {
                let now = new Date();
                this._messageList.setDate(now);
            }
        });

        this._closeButton = this._messageList._clearButton;
        this._hideIndicator = this._closeButton.connect("notify::visible", (obj) => {
            if (this._autoHide) {
                if (obj.visible) {
                    this.actor.show();
                } else {
                    this.actor.hide();
                }
            }
        });

    },
    setHide: function (value) {
        this._autoHide = value
        if (!value) {
            this.actor.show();
        } else if (this._indicator._sources == "") {
            this.actor.hide();
        }
    },
    destroy: function () {
        this._closeButton.disconnect(this._hideIndicator);
        this._vbox.remove_child(this._messageList)
        this._messageListParent.add_actor(this._messageList);
        this.parent();
    }
});

var MessagesIndicator = new Lang.Class({
    Name: 'MessagesIndicator',

    _init: function (src) {

        this._icon = new St.Icon({
            style_class: 'system-status-icon'
        });

	this._icon.icon_name = NoNotifications;

        this.actor = this._icon;

        this._sources = src;

        this._source_added = Main.messageTray.connect('source-added', (t, source) => this._onSourceAdded(t, source));
        this._source_removed = Main.messageTray.connect('source-removed', (t, source) => {
            this._sources.splice(this._sources.indexOf(source), 1);
            this._updateCount();
        });
        this._queue_changed = Main.messageTray.connect('queue-changed', () => this._updateCount());

        let sources = Main.messageTray.getSources();
        sources.forEach((source) => {
            this._onSourceAdded(null, source);
        });
    },
    _onSourceAdded: function (tray, source) {
        source.connect('notify::count', () => this._updateCount());
        this._sources.push(source);
        this._updateCount();
    },
    _updateCount: function () {
        let count = 0;
        this._sources.forEach((source) => {
            count += source.count;
        });

        let icon = (count > 0) ? NewNotifications : NoNotifications;

        this._icon.icon_name = icon;
        this.actor = this._icon;
    },
    destroy: function () {
        Main.messageTray.disconnect(this._source_added);
        Main.messageTray.disconnect(this._source_removed);
        Main.messageTray.disconnect(this._queue_changed);
    },
});
