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
			this._eventsSection = new imports.ui.dateMenu.EventsSection();
			this._clocksSection = Main.panel.statusArea.dateMenu._clocksItem;
			this._weatherSection = Main.panel.statusArea.dateMenu._weatherItem;
			this._clockIndicator = Main.panel.statusArea.dateMenu._clockDisplay;

			this._clockIndicatorFormat = new St.Label({
				  style_class: "clock-display",
				  visible: false,
				 y_align: Clutter.ActorAlign.CENTER
			});



			this._indicatorParent = this._clockIndicator.get_parent();
			this._calendarParent = this._calendar.get_parent();
			this._sectionParent = this._clocksSection.get_parent();

			this._indicatorParent.remove_actor(this._clockIndicator);
			this._indicatorParent.remove_child(this._date);
			this._calendarParent.remove_child(this._calendar);
			this._sectionParent.remove_child(this._clocksSection);
			this._sectionParent.remove_child(this._weatherSection);

			this.box.add_child(this._clockIndicator, 0);
        	this.box.add_child(this._clockIndicatorFormat, 0);
        }   
    },
    addCalendar: function () {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
		this._vboxd.show();
                let now = new Date();
                let hbox_date = new St.BoxLayout({
					vertical: true,style_class: 'datemenu-today-button',
					x_expand: true,
					can_focus: true,
					reactive: false,
                });
                this._vboxd.add_actor(hbox_date);
        
                let _dayLabel = new St.Label({ style_class: 'day-label',
                                        x_align: Clutter.ActorAlign.START,
                                        });
                hbox_date.add_actor(_dayLabel);
                _dayLabel.set_text(now.toLocaleFormat('%A'));
                 let _dateLabel = new St.Label({ style_class: 'date-label' });
                 hbox_date.add_actor(_dateLabel);
                 let dateFormat = Shell.util_translate_time_string(N_("%B %-d %Y"));
                 _dateLabel.set_text(now.toLocaleFormat(dateFormat));




                this._displaysSection = new St.ScrollView({
                     style_class: "datemenu-displays-section vfade",
                     clip_to_allocation: true,
                     x_expand: true,
                });

                this._displaysSection.set_policy(St.PolicyType.NEVER, St.PolicyType.EXTERNAL);
                this._vboxd.add_child(this._displaysSection);

                this.displayBox = new St.BoxLayout({
                     vertical: true,
                     x_expand: true,
                     style_class: "datemenu-displays-box"
               });
               this.displayBox.add_child(this._eventsSection);
               this.displayBox.add_child(this._clocksSection);
               this.displayBox.add_child(this._weatherSection);
               this._displaysSection.add_actor(this.displayBox);
               this._vboxd.add_child(this._date);
               this._vboxd.add_child(this._calendar);

                this.menu.connect("open-state-changed", (menu, isOpen) => {
                     if (isOpen) {
                          let now = new Date();
                          this._calendar.setDate(now);
                          this._eventsSection.setDate(now);
                          //this._date.setDate(now);
                     }
                });
		this._date_changed = this._calendar.connect(
                     "selected-date-changed",
                     (calendar, date) => {
                          this._eventsSection.setDate(date);
                     }
		);
        }
	else
	        this._vboxd.hide();
    },
    override: function (format) {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
                this.resetFormat();
                if (format == "") {
                      return
                }
                let that = this;
                this._formatChanged = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                     that.changeFormat();
                     return true;
                });
                this._clockIndicator.hide();
                this._clockIndicatorFormat.show();
                this._dateFormat = format;
                this.changeFormat();
	}
    },
    changeFormat: function () {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
               if (this._dateFormat && this._dateFormat != "") {
                     let date = new Date();
                     this._clockIndicatorFormat.set_text(date.toLocaleFormat(this._dateFormat));
               }
	}
    },
    resetFormat: function () {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
                if (this._formatChanged) {
                     GLib.source_remove(this._formatChanged);
                     this._formatChanged = null;
                }
                this._clockIndicator.show();
                this._clockIndicatorFormat.hide();
	}
    },
    removeCalendar: function () {
        if (!this.settings.get_boolean("separate-date-and-notification")) {
			this.resetFormat();
			this._calendar.disconnect(this._date_changed);

			this.displayBox.remove_child(this._clocksSection);
			this.displayBox.remove_child(this._weatherSection);
			this._vboxd.remove_actor(this._date);
			this._vboxd.remove_actor(this._calendar);
			this.box.remove_child(this._clockIndicator);


			this._indicatorParent.add_actor(this._date);
			this._indicatorParent.add_actor(this._clockIndicator);
			this._sectionParent.add_child(this._weatherSection);
			this._sectionParent.add_child(this._clocksSection);
			this._calendarParent.add_child(this._calendar);
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
                 this._icon.show();
	    }
	    else {
               this.actor.hide();
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
