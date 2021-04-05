import { Device } from "@homebridge-nhc2/nhc2-hobby-api/lib/event/device";
import { Event } from "@homebridge-nhc2/nhc2-hobby-api/lib/event/event";
import { NHC2 } from "@homebridge-nhc2/nhc2-hobby-api/lib/NHC2";
import {
  API,
  APIEvent,
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

import { NHC2Logger } from "./nhc2-logger";

const PLUGIN_NAME = "homebridge-nhc2";
const PLATFORM_NAME = "NHC2";

let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (api: API) => {
  hap = api.hap;
  Accessory = api.platformAccessory;

  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, NHC2Platform);
};

class NHC2Platform implements DynamicPlatformPlugin {
  private readonly Service: typeof Service = this.api.hap.Service;
  private readonly Characteristic: typeof Characteristic = this.api.hap
    .Characteristic;

  private readonly accessories: PlatformAccessory[] = [];
  private readonly suppressedAccessories: string[] = [];
  private readonly nhc2: NHC2;

  private readonly log: NHC2Logger;

  constructor(
    private logger: Logging,
    private config: PlatformConfig,
    private api: API,
  ) {
    this.log = new NHC2Logger(logger, config);
    this.suppressedAccessories = config.suppressedAccessories || [];
    if (this.suppressedAccessories) {
      this.log.info("Suppressing accessories: ");
      this.suppressedAccessories.forEach(acc => {
        this.log.info("  - " + acc);
      });
    }
    this.nhc2 = new NHC2("mqtts://" + config.host, {
      port: config.port || 8884,
      clientId: config.clientId || "NHC2-homebridge",
      username: config.username || "hobby",
      password: config.password,
      rejectUnauthorized: false,
    });

    this.log.info("NHC2Platform finished initializing!");

    api.on(APIEvent.DID_FINISH_LAUNCHING, async () => {
      this.log.info("NHC2Platform 'didFinishLaunching'");

      await this.nhc2.subscribe();
      const nhc2Accessories = await this.nhc2.getAccessories();
      this.log.verbose("got " + nhc2Accessories.length + " accessories");
      this.addAccessories(nhc2Accessories);

      this.nhc2.getEvents().subscribe(event => {
        this.processEvent(event);
      });
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.push(accessory);
  }

  public processEvent = (event: Event) => {
    if (!!event.Params) {
      event.Params.flatMap(param =>
        param.Devices.forEach((device: Device) => {
          const deviceAccessoryForEvent = this.findAccessoryDevice(device);
          if (!!deviceAccessoryForEvent) {
            deviceAccessoryForEvent.services.forEach(service =>
              this.processDeviceProperties(device, service),
            );
          }
        }),
      );
    }
  };

  private findAccessoryDevice(device: Device) {
    return this.accessories.find(accessory => accessory.UUID === device.Uuid);
  }

  private addAccessories(accessories: Device[]) {
    const mapping: { [index: string]: any } = {
      light: {
        service: this.Service.Lightbulb,
        handlers: [this.addStatusChangeCharacteristic],
      },
      dimmer: {
        service: this.Service.Lightbulb,
        handlers: [
          this.addStatusChangeCharacteristic,
          this.addBrightnessChangeCharacteristic,
        ],
      },
      socket: {
        service: this.Service.Outlet,
        handlers: [this.addStatusChangeCharacteristic],
      },
      generic: {
        service: this.Service.Switch,
        handlers: [this.addTriggerCharacteristic],
      },
      sunblind : {
        service : this.Service.WindowCovering,
        handlers : [this.addPositionChangeCharacteristic]
      }
    };

    Object.keys(mapping).forEach(model => {
      const config = mapping[model];
      const accs = accessories.filter(
        acc =>
          !this.suppressedAccessories.includes(acc.Uuid) && acc.Model === model,
      );
      accs.forEach(acc => {
        const newAccessory = new Accessory(acc.Name as string, acc.Uuid);
        const newService = new config.service(acc.Name);
        config.handlers.forEach((handler: any) => {
          handler(newService, newAccessory);
        });
        newAccessory.addService(newService);
        this.processDeviceProperties(acc, newService);
        this.registerAccessory(newAccessory);
      });
    });
  }

  private registerAccessory(accessory: PlatformAccessory) {
    const existingAccessory = this.findExistingAccessory(accessory);
    if (!!existingAccessory) {
      this.unregisterAccessory(existingAccessory);
    }

    this.accessories.push(accessory);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
      accessory,
    ]);
    this.log.debug(
      "registered accessory: " +
        accessory.displayName +
        " (" +
        accessory.UUID +
        ")",
    );
  }

  private unregisterAccessory(accessory: PlatformAccessory) {
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
      accessory,
    ]);
    this.accessories.splice(this.accessories.indexOf(accessory), 1);
    this.log.debug(
      "unregistered accessory: " +
        accessory.displayName +
        " (" +
        accessory.UUID +
        ")",
    );
  }

  private findExistingAccessory(newAccessory: PlatformAccessory) {
    return this.accessories
      .filter(accessory => accessory.UUID === newAccessory.UUID)
      .find(() => true);
  }

  private addStatusChangeCharacteristic = (
    newService: Service,
    newAccessory: PlatformAccessory,
  ) => {
    newService
      .getCharacteristic(this.Characteristic.On)
      .on(
        CharacteristicEventTypes.SET,
        (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.nhc2.sendStatusChangeCommand(
            newAccessory.UUID,
            value as boolean,
          );
          callback();
        },
      );
  };

  private addBrightnessChangeCharacteristic = (
    newService: Service,
    newAccessory: PlatformAccessory,
  ) => {
    newService
      .getCharacteristic(this.Characteristic.Brightness)
      .on(
        CharacteristicEventTypes.SET,
        (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.nhc2.sendBrightnessChangeCommand(
            newAccessory.UUID,
            value as number,
          );
          callback();
        },
      );
  };

  private addTriggerCharacteristic = (
    newService: Service,
    newAccessory: PlatformAccessory,
  ) => {
    newService
      .getCharacteristic(this.Characteristic.On)
      .on(
        CharacteristicEventTypes.SET,
        (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.nhc2.sendTriggerBasicStateCommand(newAccessory.UUID);
          callback();
        },
      );
  };

  private addPositionChangeCharacteristic =
  ( newService: Service, newAccessory: PlatformAccessory ) => {
    newService
      .getCharacteristic(this.Characteristic.TargetPosition)
      .on(
        CharacteristicEventTypes.SET,
        (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.nhc2.sendPositionChangeCommand(
            newAccessory.UUID,
            value as number,
          );
          callback();
        },
      );
  };

  private processDeviceProperties(device: Device, service: Service) {
    if (!!device.Properties) {
      device.Properties.forEach(property => {
        if (property.Status === "On" || property.BasicState === "On") {
          service.getCharacteristic(this.Characteristic.On).updateValue(true);
        }
        if (property.Status === "Off" || property.BasicState === "Off") {
          service.getCharacteristic(this.Characteristic.On).updateValue(false);
        }
        if (!!property.Brightness) {
          service
            .getCharacteristic(this.Characteristic.Brightness)
            .updateValue(property.Brightness);
        }
        if (!! property.Position) {
          service
            .getCharacteristic(this.Characteristic.CurrentPosition)
            .updateValue(parseInt(property.Position));
        }
        if (!! property.Moving) {
          service
            .getCharacteristic(this.Characteristic.PositionState)
            .updateValue(property.Moving == "True" ? 1 : 2);
          /* TODO: find a way to determing INCREASING=1 or DECREASING=0 */
        }
      });
    }
  }
}
