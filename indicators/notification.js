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

const { Clutter, Gio, GLib, GnomeDesktop,
        GObject, GWeather, Pango, Shell, St } = imports.gi;
const Main = imports.ui.main;
const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain("bigSur-StatusArea");
const _ = Gettext.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const CustomButton = Extension.imports.indicators.button.CustomButton;

const NoNotifications = 'task-past-due-symbolic';
const NewNotifications = 'task-due-symbolic';


var CalendarColumnLayout2 = GObject.registerClass(
class CalendarColumnLayout2 extends Clutter.BoxLayout {
    _init(actors) {
        super._init({ orientation: Clutter.Orientation.VERTICAL });
        this._colActors = actors;
    }

    vfunc_get_preferred_width(container, forHeight) {
        const actors =
            this._colActors.filter(a => a.get_parent() === container);
        if (actors.length === 0)
            return super.vfunc_get_preferred_width(container, forHeight);
        return actors.reduce(([minAcc, natAcc], child) => {
            const [min, nat] = child.get_preferred_width(forHeight);
            return [Math.max(minAcc, min), Math.max(natAcc, nat)];
        }, [0, 0]);
    }
});

var settingsChanged = null;

var NotificationIndicator = new Lang.Class({
    Name: "NotificationIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("NotificationIndicator");

        settingsChanged = this.settings.connect("changed::separate-date-and-notification", this.applySettings);

	this.prepareCalendar();
        this._messageList = Main.panel.statusArea.dateMenu._messageList;
        try {
            this._messageList._removeSection(this._messageList._eventsSection);
        } catch (e) {}
        

        this._messageListParent = this._messageList.get_parent();
        this._messageListParent.remove_actor(this._messageList);

        this._indicator = new MessagesIndicator(Main.panel.statusArea.dateMenu._indicator._sources, this.settings);

        this.box.add_child(this._indicator.actor);
        this.hbox = new St.BoxLayout({
			vertical: false,
			name: 'calendarArea'
		});

        this._vbox = new St.BoxLayout({
            height: 400
        });

        this._vbox.add(this._messageList);
        this.hbox.add(this._vbox);

	// Fill up the second column
	const boxLayout = new CalendarColumnLayout2([this._calendar, this._date]);
	this._vboxd = new St.Widget({ style_class: 'datemenu-calendar-column',
	                       layout_manager: boxLayout });
	boxLayout.hookup_style(this._vboxd);
	this.hbox.add(this._vboxd);

	this.addCalendar();
        this.menu.box.add(this.hbox);

        try {
            this._messageList._removeSection(this._messageList._mediaSection);
        } catch (e) {}

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
    applySettings: function () {
        if (this.settings.get_boolean("separate-date-and-notification")) {
             this.prepareCalendar();
             this.addCalendar();
	}
	else {
             this.removeCalendar();
	}
    },
    prepareCalendar: function () {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
		this._calendar = Main.panel.statusArea.dateMenu._calendar;
		this._date = Main.panel.statusArea.dateMenu._date;
		this._clockDisplay = Main.panel.statusArea.dateMenu._clockDisplay;
		this._displaysSection = Main.panel.statusArea.dateMenu._displaysSection;
		this._clockDisplayParent = this._clockDisplay.get_parent();
		this._calendarParent = this._calendar.get_parent();
		this._dateParent = this._date.get_parent();
		this._displaysSectionParent = this._displaysSection.get_parent();
		this._clockDisplayParent.remove_actor(this._clockDisplay);
		this._calendarParent.remove_actor(this._calendar);
		this._dateParent.remove_actor(this._date);
		this._displaysSectionParent.remove_actor(this._displaysSection);
        	this.box.insert_child_at_index(this._clockDisplay, 0);
        }   
    },
    addCalendar: function () {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
		this._vboxd.show();
		this._vboxd.add_actor(this._date);
		this._vboxd.add_actor(this._calendar);
		this._vboxd.add_actor(this._displaysSection);

		this.menu.connect("open-state-changed", (menu, isOpen) => {
		    if (isOpen) {
                        if (!this.settings.get_boolean("separate-date-and-notification")) {
		              let now = new Date();
		              this._date.setDate(now);
		              this._calendar.setDate(now);
		              this._eventsSection.setDate(now);
		              //this._messageList.setDate(now);
			}
		    }
		});
        }
	else
	        this._vboxd.hide();
    },
    removeCalendar: function () {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
		this._vboxd.remove_actor(this._date);
		this._vboxd.remove_actor(this._calendar);
		this._vboxd.remove_actor(this._displaysSection);
		this.box.remove_child(this._clockDisplay);

		this._calendarParent.add_actor(this._calendar);
		this._dateParent.add_actor(this._date);
		this._displaysSectionParent.add_actor(this._displaysSection);        
		this._clockDisplayParent.add_actor(this._clockDisplay);
        }
    },

    destroy: function () {
        this._closeButton.disconnect(this._hideIndicator);
        this.settings.disconnect(settingsChanged);
	this.removeCalendar();
        this._vbox.remove_child(this._messageList);
        this._messageListParent.add_actor(this._messageList);
        this.parent();
    }
});

var MessagesIndicator = new Lang.Class({
    Name: 'MessagesIndicator',

    _init: function (src, settings) {
        this.settings = settings;
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
        this._updateCount()
    },
    _onSourceAdded: function (tray, source) {
        source.connect('notify::count', () => this._updateCount());
        this._sources.push(source);
        this._updateCount();
    },
    _updateCount: function () {
        let count = 0;
	let icon = null
        this._sources.forEach((source) => {
            count += source.count;
        });
       
        if (this.settings.get_boolean("separate-date-and-notification")) {
            icon = (count > 0) ? NewNotifications : NoNotifications;
            this._icon.icon_name = icon;
	}
	else {
	    if (count > 0) {
                 this._icon.icon_name = 'media-record-symbolic';
	    }
	    else {
                 icon = 'notifications-symbolic';
                 this._icon.gicon = Gio.icon_new_for_string(`${Me.path}/icons/${icon}.svg`);
	    }
	}

        this.actor = this._icon;
    },
    destroy: function () {
        Main.messageTray.disconnect(this._source_added);
        Main.messageTray.disconnect(this._source_removed);
        Main.messageTray.disconnect(this._queue_changed);
    },
});
