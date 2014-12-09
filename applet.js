const Settings = imports.ui.settings; // ++ Needed if you use Settings / Configuración
const St = imports.gi.St; //Componente Visual
const Pango = imports.gi.Pango; //Parametrizador de componente Visual
const Mainloop = imports.mainloop; //Para realizar Blucles de Ejecución
const Lang = imports.lang; //Controlador
const Applet = imports.ui.applet; //Applet
const GLib = imports.gi.GLib; //Libreria para el control de ejecuciones nivel Comandos Linux
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

function MyApplet(metadata, orientation, panelHeight, instance_id) {
    this._init(metadata, orientation, panelHeight, instance_id);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,
    _init: function (metadata, orientation, panelHeight, instance_id) {
        Applet.TextApplet.prototype._init.call(this, orientation, panelHeight, instance_id);
        Applet.IconApplet.prototype._init.call(this, orientation, panelHeight, instance_id);
        try {
            //**********************************
            //*********CONFIGURACIONES *********
            this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id); // ++ Picks up UUID from metadata for Settings
            this.orient = orientation;
            //DEFINICIÓN DE VARIABLES
            this.sensorsPath = this._detectSensors();
            let labelText = "Sensors";
            let icon = this.actor.get_children()[0];
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, this.orient);
            this.menuManager.addMenu(this.menu);

            this._contentSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._contentSection);

            //this.actor.remove_actor(icon);
            //Caja Principal
            let box = new St.BoxLayout({
                name: 'fanBox'
            });
            this.actor.add_actor(box);
            //Definición de Label de Texto de Información
            this._mainLabel = new St.Label();
            this._mainLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            //Anexamos el Texto
            box.add(this._mainLabel, {
                y_align: St.Align.MIDDLE,
                y_fill: false
            });
            //Le asignamos texto al Label principal
            this._mainLabel.set_text(labelText);

            this._SettingsSystem(); //INICIAMOS PROCESO DE LEER CONFIGURACION
            //Ejecutamos el evento que actualiza la información de la velocidad del Fan
            this._updateFanSensor();
        } catch (e) {
            //global.logError(e);
        }
    },
    on_applet_clicked: function (event) {
        //Mostrar/Ocultar Menu con cada Click en el Applet
        this.menu.toggle();
    },
    // ++ Function called when settings are changed
    on_settings_changed: function () {
        this._SettingsSystem();
    },

    _SettingsSystem: function () {
        //CARGA DE CONFIGURACIONES DE SETTINGS-SCHEMA.JSON
        this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
            "refreshInterval", // The setting key
            "refreshInterval", // The property to manage (this.refreshInterval)
            this.on_settings_changed, // Callback when value changes
            null); // Optional callback data

        this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
            "SearchFan", // The setting key
            "SearchFan", // The property to manage
            this.on_settings_changed, // Callback when value changes
            null); // Optional callback data

        this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
            "ScriptFilter", // The setting key
            "ScriptFilter", // The property to manage
            this.on_settings_changed, // Callback when value changes
            null); // Optional callback data

        this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
            "ScriptFilter_Init", // The setting key
            "ScriptFilter_Init", // The property to manage
            this.on_settings_changed, // Callback when value changes
            null); // Optional callback data

        this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
            "ScriptFilter_End", // The setting key
            "ScriptFilter_End", // The property to manage
            this.on_settings_changed, // Callback when value changes
            null); // Optional callback data

        this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
            "ToolTipApplet", // The setting key
            "ToolTipApplet", // The property to manage
            this.on_settings_changed, // Callback when value changes
            null); // Optional callback data


        //Le anexamos tooltip al componente
        this.set_applet_tooltip(_(this.ToolTipApplet));
        //**********************************
    },

    //EVENTO PARA ACTUALIZAR LA INFORMACION DE LA VELOCIDAD DEL FAN
    _updateFanSensor: function () {
        let sensors_output = GLib.spawn_command_line_sync(this.sensorsPath); //get the output of the sensors command
        let tempInfo;
        try {
            let sensors_output = GLib.spawn_command_line_sync(this.sensorsPath); //get the output of the sensors command
            let tempInfo;
            if (sensors_output[0]) {
                tempInfo = this._findFanOutput(sensors_output[1].toString());
            }
            this._mainLabel.set_text(tempInfo);
            //Anexo de Menu
            //Prelimpieza de menu
            this.menu.box.get_children().forEach(function (c) {
                c.destroy()
            });
            let items = new Array();
            let section = new PopupMenu.PopupMenuSection("Temperature");

            //Anexo de Información Detallada
            let senses_lines = sensors_output[1].toString().split("\n");
            for (let i = 0; i < senses_lines.length; i++) {
                let item = new PopupMenu.PopupMenuItem("");
                //-----net
                item.addActor(new St.Label({
                    text: senses_lines[i]
                    /*,
                    style_class: "sm-label"*/
                }));
                //-----
                /* item.connect('activate', function () {
                    //    Util.spawn(command);
                });*/
                //-----
                section.addMenuItem(item);
            }

            this.menu.addMenuItem(section);
            Mainloop.timeout_add((this.refreshInterval * 1000), Lang.bind(this, this._updateFanSensor));
        } catch (e) {
            this._updateFanSensor();
        }
    },
    //DETECTA LA UBICACIÓN DE LA FUNCION SENSORS
    _detectSensors: function () {
        //detect if sensors is installed
        let ret = GLib.spawn_command_line_sync("which sensors");
        if ((ret[0]) && (ret[3] == 0)) { //if yes
            return ret[1].toString().split("\n", 1)[0]; //find the path of the sensors
        }
        return null;
    },
    //BUSCA LA INFORMACIÓN DE LA VELOCIDAD DEL FAN
    _findFanOutput: function (txt) {
        let senses_lines = txt.split("\n");
        let line = '';
        //iterate through each lines
        for (let i = 0; i < senses_lines.length; i++) {
            line = senses_lines[i];
            if (line.indexOf(this.SearchFan) > 0) {
                if (this.ScriptFilter) {
                    return line.substring(this.ScriptFilter_Init, this.ScriptFilter_End) + ' RPM';
                } else {
                    return line;
                }
            }
        }
        return 'sudo modprobe i8k force=1';
    }
};


function main(metadata, orientation, panelHeight, instance_id) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instance_id);
    return myApplet;
}
