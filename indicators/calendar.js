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

const { St, Gtk, GLib, Clutter, Gio, Shell } = imports.gi;
const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext.domain("bigSur-StatusArea");
const _ = Gettext.gettext;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const CustomButton = Extension.imports.indicators.button.CustomButton;

var CalendarIndicator = new Lang.Class({
    Name: "CalendarIndicator",
    Extends: CustomButton,
    _init: function () {
        this.parent("CalendarIndicator");

        this._clock = Main.panel.statusArea.dateMenu._clock;
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

        this.box.add_actor(this._clockIndicator);
        this.box.add_actor(this._clockIndicatorFormat);

        let boxLayout;
        let vbox;

        hbox = new St.BoxLayout({ name: 'calendarArea' });

        // Fill up the second column
        boxLayout = new imports.ui.dateMenu.CalendarColumnLayout([this._calendar, this._date]);
        vbox = new St.Widget({ style_class: 'datemenu-calendar-column',
                               layout_manager: boxLayout });
        boxLayout.hookup_style(vbox);
        hbox.add(vbox);

        let now = new Date();
        let hbox_date = new St.BoxLayout({
			vertical: true,style_class: 'datemenu-today-button',
            x_expand: true,
            can_focus: true,
            reactive: false,
        });
        vbox.add_actor(hbox_date);
        
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
        vbox.add_child(this._displaysSection);

        let displayBox = new St.BoxLayout({
            vertical: true,
	        x_expand: true,
            style_class: "datemenu-displays-box"
        });
        displayBox.add_child(this._eventsSection);
        displayBox.add_child(this._clocksSection);
        displayBox.add_child(this._weatherSection);
        this._displaysSection.add_actor(displayBox);
        vbox.add_child(this._date);
        vbox.add_child(this._calendar);

        this.menu.box.add(hbox);

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
    },

    override: function (format) {
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
    },
    changeFormat: function () {
        if (this._dateFormat && this._dateFormat != "") {
            let date = new Date();
            this._clockIndicatorFormat.set_text(date.toLocaleFormat(this._dateFormat));
        }
    },
    resetFormat: function () {
        if (this._formatChanged) {
            GLib.source_remove(this._formatChanged);
            this._formatChanged = null;
        }
        this._clockIndicator.show();
        this._clockIndicatorFormat.hide();
    },
    destroy: function () {
        this.resetFormat();
        this._calendar.disconnect(this._date_changed);
        
        this.box.remove_child(this._clockIndicator);

        this._date.get_parent().remove_child(this._date);
        this._calendar.get_parent().remove_child(this._calendar);
        this._clocksSection.get_parent().remove_child(this._clocksSection);
        this._weatherSection.get_parent().remove_child(this._weatherSection);
      
        this._calendarParent.add_child(this._date);
        this._sectionParent.add_child(this._clocksSection);
        this._sectionParent.add_child(this._weatherSection);
        this._calendarParent.add_child(this._calendar);

        this._indicatorParent.add_actor(this._clockIndicator);

        this.parent();
    }
});
