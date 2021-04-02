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

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Gettext = imports.gettext.domain("bigSur-StatusArea");
const _ = Gettext.gettext;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Lang = imports.lang;

const Extension = imports.misc.extensionUtils.getCurrentExtension();
const MenuItems = Extension.imports.menuItems;

function init() {
    Convenience.initTranslations("bigSur-StatusArea");
}

const IconButton = new GObject.Class({
    Name: "IconButton",
    GTypeName: "IconButton",
    Extends: Gtk.Button,

    _init: function (params) {
        this.parent({});
        if (params["circular"]) {
            let context = this.get_style_context();
            context.add_class("circular");
        }
        if (params["icon_name"]) {
            let image = new Gtk.Image({
                icon_name: params["icon_name"],
                xalign: 0.46
            });
            this.add(image);
        }
    }
});

var DialogWindow = new Lang.Class({
    Name: "DialogWindow",
    GTypeName: "DialogWindow",
    Extends: Gtk.Dialog,

    _init: function (title, parent) {
        this.parent({
            title: title,
            transient_for: parent.get_toplevel(),
            use_header_bar: true,
            modal: true
        });
        let vbox = new Gtk.VBox({
            spacing: 20,
            homogeneous: false,
            margin: 5
        });

        this._createLayout(vbox);
        this.get_content_area().add(vbox);
    },

    _createLayout: function (vbox) {
        throw "Not implemented!";
    }
});

const NotebookPage = new GObject.Class({
    Name: "NotebookPage",
    GTypeName: "NotebookPage",
    Extends: Gtk.Box,

    _init: function (title) {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
            margin: 24,
            spacing: 20,
            homogeneous: false
        });
        this.title = new Gtk.Label({
            label: "<b>" + title + "</b>",
            use_markup: true,
            xalign: 0
        });
    }
});

var FrameBox = new Lang.Class({
    Name: "FrameBox",
    GTypeName: "FrameBox",
    Extends: Gtk.Frame,

    _init: function (label) {
        this._listBox = new Gtk.ListBox();
        this._listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        this.parent({
            label_yalign: 0.50,
            child: this._listBox
        });
        this.label = label;
    },

    add: function (boxRow) {
        this._listBox.add(boxRow);
    }
});

var FrameBoxRow = new Lang.Class({
    Name: "FrameBoxRow",
    GTypeName: "FrameBoxRow",
    Extends: Gtk.ListBoxRow,

    _init: function () {
        this._grid = new Gtk.Grid({
            margin: 5,
            column_spacing: 20,
            row_spacing: 20
        });
        this.parent({
            child: this._grid
        });
    },

    add: function (widget) {
        this._grid.add(widget);
    }
});

const PrefsWidget = new GObject.Class({
    Name: "Prefs.Widget",
    GTypeName: "PrefsWidget",
    Extends: Gtk.Box,

    _init: function () {
        this.parent({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            border_width: 5
        });
        this.settings = Convenience.getSettings();
        this.menuItems = new MenuItems.MenuItems(this.settings);

        let notebook = new Gtk.Notebook({
            margin_left: 6,
            margin_right: 6
        });

        let settingsPage = new SettingsPage(this.settings);
        notebook.append_page(settingsPage, settingsPage.title);

        let indicatorsPage = new IndicatorsPage(this.settings, this.menuItems);
        notebook.append_page(indicatorsPage, indicatorsPage.title);

        let aboutPage = new AboutPage(this.settings);
        notebook.append_page(aboutPage, aboutPage.title);

        this.add(notebook);
    }
});

var SettingsPage = new Lang.Class({
    Name: "SettingsPage",
    Extends: NotebookPage,

    _init: function (settings) {
        this.parent(_("Settings"));
        this.settings = settings;
        this.desktopSettings = new Gio.Settings({
            schema_id: "org.gnome.desktop.interface"
        });

        /*
         * User Settings
         */
        let userFrame = new FrameBox(_("User/System Indicator"));
        let nameIconRow = new FrameBoxRow();

        let nameIconLabel = new Gtk.Label({
            label: _("Show an icon instead of name"),
            xalign: 0,
            hexpand: true
        });
        let nameIconSwitch = new Gtk.Switch({
            halign: Gtk.Align.END
        });
        this.settings.bind("user-icon", nameIconSwitch, "active", Gio.SettingsBindFlags.DEFAULT);

        nameIconRow.add(nameIconLabel);
        nameIconRow.add(nameIconSwitch);

        userFrame.add(nameIconRow);

        /*
         * Calendar Settings
         */
        let calendarFrame = new FrameBox(_("Calendar Indicator"));
        let dateFormatRow = new FrameBoxRow();

        let dateFormatLabel = new Gtk.Label({
            label: _("Change date format"),
            xalign: 0,
            hexpand: true
        });
        let dateFormatWikiButton = new Gtk.LinkButton({
            label: _("wiki"),
            uri: "https://help.gnome.org/users/gthumb/unstable/gthumb-date-formats.html",
            //xalign: 0,
            //hexpand: true,
            //image: new Gtk.Image({
            //icon_name: "emblem-web",
            //xalign: 0.46
            //})
        });

        let context = dateFormatWikiButton.get_style_context();
        context.add_class("circular");

        let dateFormatEntry = new Gtk.Entry({
            hexpand: true,
            halign: Gtk.Align.END
        });
        this.settings.bind("date-format", dateFormatEntry, "text", Gio.SettingsBindFlags.DEFAULT);

        dateFormatRow.add(dateFormatLabel);
        dateFormatRow.add(dateFormatWikiButton);
        dateFormatRow.add(dateFormatEntry);

        calendarFrame.add(dateFormatRow);

        /*
         * Power Settings
         */
        let powerFrame = new FrameBox(_("Power Indicator"));
        let showPercentageLabelRow = new FrameBoxRow();

        showPercentageLabelRow.add(new Gtk.Label({
            label: _("Show battery percentage"),
            xalign: 0,
            hexpand: true
        }));
        let showPercentageLabelSwitch = new Gtk.Switch({
            halign: Gtk.Align.END
        });
        this.desktopSettings.bind("show-battery-percentage", showPercentageLabelSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
        showPercentageLabelRow.add(showPercentageLabelSwitch);

        powerFrame.add(showPercentageLabelRow);

        // add the frames
        this.add(userFrame);
        this.add(calendarFrame);
        this.add(powerFrame);
    }
});

var IndicatorsPage = new Lang.Class({
    Name: "IndicatorsPage",
    Extends: NotebookPage,

    _init: function (settings, menuItems) {
        this.parent(_("Position and size"));
        this.settings = settings;
        this.menuItems = menuItems;
/////////////////////////////////////////////////////////////////////////////////////

        this.separatingBox = new FrameBox(_("Indicators xxxxx"));

        this.add(this.separatingBox);
/////////////////////////////////////////////////////////////////////////////////////
        this.spacingBox = new FrameBox(_("Indicators spacing"));
	
        let activateSpacingLabelRow = new FrameBoxRow();

        activateSpacingLabelRow.add(new Gtk.Label({
            label: _("Activate Indicator spacing"),
            xalign: 0,
            hexpand: true
        }));
        let activateSpacingLabelSwitch = new Gtk.Switch({
            halign: Gtk.Align.END
        });
        this.spacingBox.add(activateSpacingLabelRow);
        //if (!this.settings.get_default_value("activate-spacing")) {
	
        this.spacingRow = new FrameBoxRow();

        this.spacingLabel = new Gtk.Label({
            label: "",
            xalign: 0,
            hexpand: true
        });
        this.spacingScale = new Gtk.HScale({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 15,
                step_increment: 1,
                page_increment: 1,
                page_size: 0
            }),
            digits: 0,
            round_digits: 0,
            hexpand: true,
            value_pos: Gtk.PositionType.RIGHT
        });
        this.spacingScale.connect("format-value", function (scale, value) {
            return value.toString() + " px";
        });
        this.spacingScale.add_mark(9, Gtk.PositionType.BOTTOM, "");
        this.spacingScale.set_value(this.settings.get_int("spacing"));
        this.spacingScale.connect("value-changed", Lang.bind(this, function () {
            this.settings.set_int("spacing", this.spacingScale.get_value());
        }));

        this.spacingRow.add(this.spacingLabel);
        this.spacingRow.add(this.spacingScale);

        this.spacingBox.add(this.spacingRow);

        this.settings.bind("activate-spacing" , activateSpacingLabelSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
        activateSpacingLabelSwitch.connect("notify", Lang.bind(this, this.spacingEnable));
        activateSpacingLabelRow.add(activateSpacingLabelSwitch);

        this.add(this.spacingBox);


        this.indicatorsFrame = new FrameBox("");
        this.buildList();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
        let activateSeparatingLabelRow = new FrameBoxRow();

        activateSeparatingLabelRow.add(new Gtk.Label({
            label: _("Date and notification indicators separated, this change requires a restart of gnome-shell"),
            xalign: 0,
            hexpand: true
        }));
        let activateSeparatingLabelSwitch = new Gtk.Switch({
            halign: Gtk.Align.END
        });
        this.settings.bind("separate-date-and-notification" , activateSeparatingLabelSwitch, "active", Gio.SettingsBindFlags.DEFAULT);
        activateSeparatingLabelSwitch.connect("notify", Lang.bind(this, this.separatingEnable));
        activateSeparatingLabelRow.add(activateSeparatingLabelSwitch);

        this.separatingBox.add(activateSeparatingLabelRow);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // add the frames
        this.add(this.indicatorsFrame);
        this.spacingBox.show(); //add_actor(this.spacingRow);
    },
    buildList: function () {

        this.remove(this.indicatorsFrame);
        this.indicatorsFrame = new FrameBox(_("Indicators Order"));
        this.add(this.indicatorsFrame);

        this.indicatorsArray = new Array();
        this.statusArray = new Array();
        this.labelsArray = new Array();
        let items = this.menuItems.getItems();

        for (let indexItem in items) {
            let item = items[indexItem];

            let indicatorRow = new FrameBoxRow();

            let indicatorLabel = new Gtk.Label({
                label: _(item["label"]),
                xalign: 0,
                hexpand: true
            });

            let positionCombo = new Gtk.ComboBoxText({
                halign: Gtk.Align.END
            });
            positionCombo.append_text(_("Left"));
            positionCombo.append_text(_("Center"));
            positionCombo.set_active(item["position"]);
            positionCombo.connect("changed", Lang.bind(this, this.enableCenter, indexItem));

            let statusSwitch = new Gtk.Switch({
                active: (item["enable"] == "1"),
                halign: Gtk.Align.END
            });
            statusSwitch.connect("notify", Lang.bind(this, this.changeEnable, indexItem));


            let buttonBox = new Gtk.Box({
                halign: Gtk.Align.END
            });

            let context = buttonBox.get_style_context();
            context.add_class("linked");

            let buttonUp = new Gtk.Button({
                //label: _("Up"),
                image: new Gtk.Image({
                    icon_name: "go-up-symbolic"
                })
            });

            if (indexItem > 0) {
                buttonUp.connect("clicked", Lang.bind(this, this.changeOrder, indexItem, -1));
            }

            let buttonDown = new Gtk.Button({
                //label: _("Down")
                image: new Gtk.Image({
                    icon_name: "go-down-symbolic"
                })
            });
            if (indexItem < items.length - 1) {
                buttonDown.connect("clicked", Lang.bind(this, this.changeOrder, indexItem, 1));
            }

            buttonBox.add(buttonUp);
            buttonBox.add(buttonDown);

            indicatorRow.add(indicatorLabel);
            indicatorRow.add(statusSwitch);
            indicatorRow.add(positionCombo);
            indicatorRow.add(buttonBox);

            this.indicatorsFrame.add(indicatorRow);
            this.indicatorsArray.push(indicatorRow);
            this.statusArray.push(statusSwitch);
            this.labelsArray.push(_(item["label"]));
        }

        let positionRow = new FrameBoxRow();
        positionRow.add(new Gtk.Label({
            label: _("Top to bottom -> Left to right"),
            hexpand: true
        }));
        let resetIndicatorsRow = new FrameBoxRow();
        resetIndicatorsRow.add(new Gtk.Label({
            label: _("Reset Indicators"),
            halign: 2,
            hexpand: true
        }));
        let resetButton = new Gtk.Button({
            visible: true,
            label: _("Reset"),
            can_focus: true
        });
        resetButton.get_style_context().add_class(Gtk.STYLE_CLASS_DESTRUCTIVE_ACTION);
        resetButton.connect("clicked", Lang.bind(this, this.resetPosition));

        resetIndicatorsRow.add(resetButton);
        this.indicatorsFrame.add(positionRow);
        this.indicatorsFrame.add(resetIndicatorsRow);

        this.indicatorsArray.push(positionRow);
        this.indicatorsArray.push(resetIndicatorsRow);

        this.indicatorsFrame.show_all();
    },
    changeOrder: function (o, index, order) {
        this.menuItems.changeOrder(index, order);
        this.buildList();
    },
    changeEnable: function (object, p, index) {
        this.menuItems.changeEnable(index, object.active)
    },
    enableCenter: function (object, index) {
        this.menuItems.changePosition(index, object.get_active());
        this.changeOrder(null, index, -index);
    },
    resetPosition: function () {
        this.settings.set_value("items", this.settings.get_default_value("items"));
        this.buildList();
    },
    spacingEnable: function (object, p) {
        if (object.active) {
            this.settings.set_boolean("activate-spacing", true);
            this.spacingRow.show();
	}
	else {
            this.spacingRow.hide();
            this.settings.set_boolean("activate-spacing", false);
	}
    },
    separatingEnable: function (object, p) {
        if (object.active) {
	    for(let x = 0; x < this.labelsArray.length; x++) {
		 log ("WWWWWWWWWWWWWWWWWW " + this.labelsArray[x])
		 if (this.labelsArray[x] == _("Calendar")) {
                     this.indicatorsArray[x].show();
		 }
	    }
            this.settings.set_boolean("separate-date-and-notification" , true);
	}
	else {
	    for(let x = 0; x < this.labelsArray.length; x++) {
		 log ("XXXXXXXXXXXXXXXXXXXXX " + this.labelsArray[x])
		 if (this.labelsArray[x] == _("Calendar")) {
                     this.indicatorsArray[x].hide();
                     this.statusArray[x].set_active(false);
		 }
	    }
            this.settings.set_boolean("separate-date-and-notification" , false);
	}
    },
});

var AboutPage = new Lang.Class({
    Name: "AboutPage",
    Extends: NotebookPage,

    _init: function (settings) {
        this.parent(_("About"));
        this.settings = settings;

        let releaseVersion = Me.metadata["version"];
        let projectName = Me.metadata["name"];
        let projectDescription = Me.metadata["description"];
        let projectUrl = Me.metadata["url"];
        let logoPath = Me.path + "/icons/logo.svg";
        let [imageWidth, imageHeight] = [128, 128];
        let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(logoPath, imageWidth, imageHeight);
        let menuImage = new Gtk.Image({
            pixbuf: pixbuf
        });
        let menuImageBox = new Gtk.VBox({
            margin_top: 5,
            margin_bottom: 5,
            expand: false
        });
        menuImageBox.add(menuImage);

        // Create the info box
        let menuInfoBox = new Gtk.VBox({
            margin_top: 5,
            margin_bottom: 5,
            expand: false
        });
        let menuLabel = new Gtk.Label({
            label: "<b>Panel Indicators</b>",
            use_markup: true,
            expand: false
        });
        let versionLabel = new Gtk.Label({
            label: "<b>" + _("Version: ") + releaseVersion + "</b>",
            use_markup: true,
            expand: false
        });
        let projectDescriptionLabel = new Gtk.Label({
            label: "\n" + _(projectDescription),
            expand: false
        });
        let helpLabel = new Gtk.Label({
            label: "\n" + _("If something breaks, don\'t hesitate to leave a comment at "),
            expand: false
        });
        let projectLinkButton = new Gtk.LinkButton({
            label: _("Webpage/Github"),
            uri: projectUrl,
            expand: false
        });
        menuInfoBox.add(menuLabel);
        menuInfoBox.add(versionLabel);
        menuInfoBox.add(projectDescriptionLabel);
        menuInfoBox.add(helpLabel);
        menuInfoBox.add(projectLinkButton);

        let authorLabel = new Gtk.Label({
            label: _("This extension is a fork of Extend Panel Menu, thanks to julio641742"),
            justify: Gtk.Justification.CENTER,
            expand: true
        });

        // Create the GNU software box
        let gnuSofwareLabel = new Gtk.Label({
            label: '<span size="small">This program comes with ABSOLUTELY NO WARRANTY.\n' +
                'See the <a href="http://www.gnu.org/licenses/gpl-3.0.html">GNU General Public License version 3</a> for details.</span>',
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            expand: true
        });
        let gnuSofwareLabelBox = new Gtk.VBox({});
        gnuSofwareLabelBox.pack_end(gnuSofwareLabel, false, false, 0);

        this.add(menuImageBox);
        this.add(menuInfoBox);
        this.add(authorLabel);
        this.add(gnuSofwareLabelBox);
    }
});

function buildPrefsWidget() {
    let widget = new PrefsWidget();
    widget.show_all();

    return widget;
}
