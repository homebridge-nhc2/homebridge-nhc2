import {Device} from "nhc2-hobby-api/lib/event/device";
import {Event} from "nhc2-hobby-api/lib/event/event";
import {NHC2} from "nhc2-hobby-api/lib/NHC2";

const PLUGIN_NAME = "homebridge-nhc2";
const PLATFORM_NAME = "NHC2";

let Accessory: any;
let Service: any;
let Characteristic: any;

export default function (homebridge: any) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, NHC2Platform, true);
}

class NHC2Platform {
    public nhc2: NHC2;
    public nhc2Accessories: any[] = [];

    constructor(private log, private config, private api) {
        this.nhc2 = new NHC2("mqtts://" + config.host, {
            port: config.port || 8884,
            clientId: config.clientId || "NHC2-homebridge",
            username: config.username || "hobby",
            password: config.password,
            rejectUnauthorized: false,
        });

        this.api.on("didFinishLaunching", async () => {
            await this.nhc2.subscribe();
            const accessories = await this.nhc2.getAccessories();
            this.addLights(accessories);
            this.addDimmers(accessories);

            this.nhc2.getEvents().subscribe(event => {
                this.processEvent(event);
            });
        });
    }

    public processEvent = (event: Event) => {
        this.flatMap(event.Params, param => param.Devices).forEach(
            (device: Device) => {
                const accessoryForEvent = this.nhc2Accessories.find(
                    accessory => accessory.UUID === device.Uuid,
                );
                if (!!accessoryForEvent) {
                    const accessoryService = accessoryForEvent.services.find(
                        service => service.displayName !== undefined,
                    );
                    this.processDeviceProperties(device, accessoryService);
                }
            },
        );
    };

    public accessories = callback => callback([]);

    public configureAccessory = cachedAccessory =>
        this.nhc2Accessories.push(cachedAccessory);

    private addLights(accessories) {
        const lights = accessories.filter(light => light.Model === "light");
        lights.forEach(light => {
            const newAccessory = new Accessory(light.Name, light.Uuid);
            const newService = new Service.Lightbulb(light.Name);
            this.addStatusChangeCharacteristic(newService, newAccessory);
            newAccessory.addService(newService);
            this.processDeviceProperties(light, newService);

            this.register(newAccessory);
        });
    }

    private addDimmers(accessories) {
        const dimmers = accessories.filter(light => light.Model === "dimmer");
        dimmers.forEach(dimmer => {
            const newAccessory = new Accessory(dimmer.Name, dimmer.Uuid);
            const newService = new Service.Lightbulb(dimmer.Name);
            this.addStatusChangeCharacteristic(newService, newAccessory);
            this.addBrightnessChangeCharacteristic(newService, newAccessory);
            newAccessory.addService(newService);
            this.processDeviceProperties(dimmer, newService);

            this.register(newAccessory);
        });
    }

    private register(newAccessory) {
        if (
            !!this.nhc2Accessories.filter(
                accessory => accessory.UUID === newAccessory.UUID,
            )
        ) {
            this.nhc2Accessories.push(newAccessory);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
                newAccessory,
            ]);
        }
    }

    private addStatusChangeCharacteristic(newService, newAccessory) {
        newService
            .getCharacteristic(Characteristic.On)
            .on("set", (value, callback) => {
                this.nhc2.sendStatusChangeCommand(newAccessory.UUID, value);
                callback();
            });
    }

    private addBrightnessChangeCharacteristic(newService, newAccessory) {
        newService
            .getCharacteristic(Characteristic.Brightness)
            .on("set", (value, callback) => {
                this.nhc2.sendBrightnessChangeCommand(newAccessory.UUID, value);
                callback();
            });
    }

    private processDeviceProperties(device: Device, service) {
        if (!!device.Properties) {
            device.Properties.forEach(property => {
                if (property.Status === "On") {
                    service.getCharacteristic(Characteristic.On).updateValue(true);
                }
                if (property.Status === "Off") {
                    service.getCharacteristic(Characteristic.On).updateValue(false);
                }
                if (!!property.Brightness) {
                    service
                        .getCharacteristic(Characteristic.Brightness)
                        .updateValue(property.Brightness);
                }
            });
        }
    }

    private flatMap = (arr, f) => [].concat.apply([], arr.map(f));
}
