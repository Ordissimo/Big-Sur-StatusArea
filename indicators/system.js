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

const { AccountsService, Clutter, GLib, St, Gio } = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Gettext = imports.gettext.domain("bigSur-StatusArea");
const _ = Gettext.gettext;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const CustomButton = Extension.imports.indicators.button.CustomButton;

var PANEL_ICON_SIZE = 16;

var UserIndicator = new Lang.Class({
    Name: "UserIndicator",
    Extends: CustomButton,

    _init: function () {
        this.parent("UserIndicator");
        //this.menu.box.set_width(270);
        this.menu.actor.add_style_class_name("aggregate-menu");
        this._system = Main.panel.statusArea.aggregateMenu._system;
        this._screencast = Main.panel.statusArea.aggregateMenu._screencast;

        let userManager = AccountsService.UserManager.get_default();
        this._user = userManager.get_user(GLib.get_user_name());

        this._nameLabel = new St.Label({
            text: this._user.get_real_name(),
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "panel-status-menu-box"
        });
	    
        this._powerIcon = new St.Icon({ 
	icon_name: 'avatar-default-symbolic', 
	style_class: "system-status-icon"});

        if (this._screencast)
             this.box.add_child(this._screencast);
        this.box.add_child(this._powerIcon);
        this.box.add_child(this._nameLabel);

        this._createSubMenu();

        Main.panel.statusArea.aggregateMenu.menu.box.remove_actor(this._system.menu.actor);
        //IS THIS NEEDED?
        // this.menu.addMenuItem(this._system.menu);
    },
    _createSubMenu: function () {

        this._switchUserSubMenu = new PopupMenu.PopupSubMenuMenuItem('', true);
        this._switchUserSubMenu.icon.icon_name = 'avatar-default-symbolic';

        this.menu.connect("open-state-changed", (menu, isOpen) => {
            if (isOpen) {
                this._switchUserSubMenu.label.text = this._user.get_real_name();
                this._nameLabel.text = this._user.get_real_name();
            }
        });

        let logout =  new PopupMenu.PopupMenuItem(_("Log Out"));
        logout.connect("activate", () => this._system._systemActions.activateLogout());
        if (!this._system._logoutItem.actor.visible) {
            logout.actor.hide();
        }
        this._switchUserSubMenu.menu.addMenuItem(logout);

        let account = new PopupMenu.PopupMenuItem(_("Account Settings"));
        account.connect("activate", () => this._openApp("gnome-user-accounts-panel.desktop"));
        this._switchUserSubMenu.menu.addMenuItem(account);

        this.menu.addMenuItem(this._switchUserSubMenu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR

        let settings = new PopupMenu.PopupBaseMenuItem();

        let settings_label = new St.Label({
            text: _("System Settings"),
            y_align: Clutter.ActorAlign.CENTER
        });
        let settings_icon = new St.Icon({
            icon_name: "preferences-system-symbolic",
            style_class: "system-status-icon",
            icon_size: PANEL_ICON_SIZE
        });

        settings.actor.add_actor(settings_icon);
        settings.actor.add_actor(settings_label);

        settings.connect("activate", () => this._openApp("gnome-control-center.desktop"));
        this.menu.addMenuItem(settings);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR

        let lock = new PopupMenu.PopupBaseMenuItem();

        let lock_label = new St.Label({
            text: _("Lock"),
            y_align: Clutter.ActorAlign.CENTER
        });
        let lock_icon = new St.Icon({
            icon_name: "changes-prevent-symbolic",
            style_class: "system-status-icon",
            icon_size: PANEL_ICON_SIZE
        });

        lock.actor.add_actor(lock_icon);
        lock.actor.add_actor(lock_label);

        lock.connect("activate", () => this._system._systemActions.activateLockScreen());
        this.menu.addMenuItem(lock);
        //IS THIS NEEDED?
        // if (!this._system._lockScreenAction.visible) {
        //     lock.actor.hide();
        // }

        //////////////
        let switchuser = new PopupMenu.PopupBaseMenuItem();

        let switchuser_label = new St.Label({
            text: _("Switch User"),
            y_align: Clutter.ActorAlign.CENTER
        });
        
        this._switchuser_gicon = 'system-switch-user-symbolic';
        let switchuser_icon = new St.Icon({ icon_name: this._switchuser_gicon });
        switchuser_icon.icon_size = PANEL_ICON_SIZE;

        switchuser.actor.add_actor(switchuser_icon);
        switchuser.actor.add_actor(switchuser_label);

        this.menu.addMenuItem(switchuser);
        switchuser.connect("activate", () => this._system._systemActions.activateSwitchUser());
        if (!this._system._loginScreenItem.actor.visible) {
            switchuser.actor.hide();
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR

        //////////////
        let orientation = new PopupMenu.PopupBaseMenuItem();

        let orientation_label = new St.Label({
            text: _("Orientation Lock"),
            y_align: Clutter.ActorAlign.CENTER
        });

        this._orientation_icon_icon = 'rotation-locked-symbolic';;
        let orientation_icon = new St.Icon({ icon_name: this._orientation_icon_icon });
        orientation_icon.icon_size = PANEL_ICON_SIZE;

        orientation.actor.add_actor(orientation_icon);
        orientation.actor.add_actor(orientation_label);

        orientation.connect("activate", () => this._system._systemActions.activateLockOrientation());
        this.menu.addMenuItem(orientation);
        //IS THIS NEEDED?
        // if (!this._system._orientationLockAction.visible) {
        //     orientation.actor.hide();
        // }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem()); // SEPARATOR	    
	    
        ///////////////
        let suspend = new PopupMenu.PopupBaseMenuItem();

        let suspend_label = new St.Label({
            text: _("Suspend"),
            y_align: Clutter.ActorAlign.CENTER
        });
        let suspend_icon = new St.Icon({
            icon_name: "media-playback-pause-symbolic",
            style_class: "system-status-icon",
            icon_size: PANEL_ICON_SIZE
        });

        suspend.actor.add_actor(suspend_icon);
        suspend.actor.add_actor(suspend_label);

        suspend.connect("activate", () => this._system._systemActions.activateSuspend());
        this.menu.addMenuItem(suspend);
        //IS THIS NEEDED?
        // if (!this._system._suspendAction.visible) {
        //     suspend.actor.hide();
        // }

        let restart = new PopupMenu.PopupBaseMenuItem();

        let restart_label = new St.Label({
            text: _("Restart"),
            y_align: Clutter.ActorAlign.CENTER
        });

	let restart_icon = new St.Icon({
            icon_name: "system-reboot-symbolic",
            style_class: "system-status-icon",
            icon_size: PANEL_ICON_SIZE
        });

        restart.actor.add_actor(restart_icon);
        restart.actor.add_actor(restart_label);

        restart.connect("activate", () => this._system._systemActions.activateRestart());
        this.menu.addMenuItem(restart);
        //IS THIS NEEDED?
        // if (!this._system._restartAction.visible) {
        //     restart.actor.hide();
        // }

        let power = new PopupMenu.PopupBaseMenuItem();

        let power_label = new St.Label({
            text: _("Power Off"),
            y_align: Clutter.ActorAlign.CENTER
        });

	let power_icon = new St.Icon({
            icon_name: "system-shutdown-symbolic",
            style_class: "system-status-icon",
            icon_size: PANEL_ICON_SIZE
        });
        power_icon.icon_size = PANEL_ICON_SIZE;

        power.actor.add_actor(power_icon);
        power.actor.add_actor(power_label);

        power.connect("activate", () => this._system._systemActions.activatePowerOff());
        this.menu.addMenuItem(power);
        //IS THIS NEEDED?
        // if (!this._system._powerOffAction.visible) {
        //     power.actor.hide();
        // }
    },
    changeLabel: function (label) {
        if (label == "") {
            label = GLib.get_real_name();
        }
        this._nameLabel.set_text(label);
    },
    changeIcon: function (enabled) {
        if (enabled) {
            this._powerIcon.show();
            this._nameLabel.hide();
        } else {
            this._powerIcon.hide();
            this._nameLabel.show();
        }
    },
    destroy: function () {
        this.menu.box.remove_actor(this._system.menu.actor);
        Main.panel.statusArea.aggregateMenu.menu.box.add_actor(this._system.menu.actor);
        
        this.parent();
    }
});
