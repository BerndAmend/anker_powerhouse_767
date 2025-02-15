#!/usr/bin/env -S deno -A
import { createBluetooth } from "node-ble";
import { parseArgs } from "@std/cli";
import { delay } from "@std/async";
import type { Buffer } from "node:buffer";

function processData(data: Buffer) {
  let lightState: number;
  let lightStateStr = "";

  if (data.length === 14) {
    lightState = data[12];

    switch (lightState) {
      case 0:
        lightStateStr = "off";
        break;
      case 1:
        lightStateStr = "low";
        break;
      case 2:
        lightStateStr = "middle";
        break;
      case 3:
        lightStateStr = "high";
        break;
      default:
        lightStateStr = `unknown`;
        break;
    }

    return {
      PowerSave: data[11] === 1,
      Light: {
        state: lightState,
        stateStr: lightStateStr,
      },
      AC: data[9] === 1,
      TwelveVolt: data[10] === 1,
      //checksum: data[13],
      raw: data,
    };
  }

  const batteryState = data[68];
  let batteryStateStr = "unknown";

  switch (batteryState) {
    case 0:
      batteryStateStr = "idle"; // TODO: What does this mean?
      break;
    case 1:
      batteryStateStr = "discharging";
      break;
    case 2:
      batteryStateStr = "charging";
      break;
  }

  const result = {
    Battery: {
      state: batteryState,
      stateStr: batteryStateStr,
      hoursRemaining: data[17] / 10.0,
      daysRemaining: data[18],
      1: {
        percentage: data[70],
        temperature: data[66],
      },
      2: {
        percentage: data[71],
        temperature: data[67],
      },
    },
    Input: {
      AC: {
        watt: data.readUInt16LE(19),
      },
      Solar: {
        watt: data.readUInt16LE(37),
      },
      Total: {
        watt: data.readUInt16LE(39),
      },
    },
    Output: {
      USBC: {
        top: {
          connected: data[75] === 1,
          watt: data.readUInt16LE(23),
        },
        middle: {
          connected: data[76] === 1,
          watt: data.readUInt16LE(25),
        },
        bottom: {
          connected: data[77] === 1,
          watt: data.readUInt16LE(27),
        },
      },
      USBA: {
        top: {
          connected: data[78] === 1,
          watt: data.readUInt16LE(29),
        },
        bottom: {
          connected: data[79] === 1,
          watt: data.readUInt16LE(31),
        },
      },
      TwelveVolt: {
        top: {
          on: data[80] === 1,
          watt: data.readUInt16LE(33),
        },
        bottom: {
          on: data[81] === 1,
          watt: data.readUInt16LE(35),
        },
      },
      AC: {
        watt: data.readUInt16LE(21),
      },
      Total: {
        watt: data.readUInt16LE(41),
      },
    },
    deviceSerial: data.toString("utf-8", 85, 101),
    // checksum: data[101],
    raw: data,
  };

  return result;
}

const flags = parseArgs(Deno.args, {
  string: ["device"],
});

if (flags.device === undefined) {
  console.error(
    "required argument --device missing, check the readme on how to find your device address",
  );
  Deno.exit();
}

const { bluetooth, destroy } = createBluetooth();
const adapter = await bluetooth.defaultAdapter();
const [adapterName, adapterAddress] = await Promise.all([
  adapter.getName(),
  adapter.getAddress(),
]);
console.debug(`Using adapter ${adapterName} (${adapterAddress})`);

console.debug(`Waiting for ${flags.device}...`);
const device = await adapter.waitDevice(flags.device);
const [deviceName, deviceAddress] = await Promise.all([
  device.getName(),
  device.getAddress(),
]);
console.debug(`Found device ${deviceName} (${deviceAddress}), connecting...`);

await device.connect();
const gattServer = await device.gatt();
const services = await gattServer.services();
console.debug(`Connected. Available services:`)
for (const service of services) {
  console.debug(service);
}

const service1 = await gattServer.getPrimaryService(
  "014bf5da-0000-1000-8000-00805f9b34fb",
);

export const characteristic1 = await service1.getCharacteristic(
  "00007777-0000-1000-8000-00805f9b34fb",
);
export const characteristic2 = await service1.getCharacteristic(
  "00008888-0000-1000-8000-00805f9b34fb",
);

// async function readstuff() {
//   while (true) {
//     console.log(await characteristic1.readValue());
//     await delay(1000);
//   }
// }
// readstuff();

await characteristic2.startNotifications();
characteristic2.on("valuechanged", (buffer) => {
  const data = processData(buffer);
  console.log(data);
  // console.log(data.raw.subarray(0, 17));
  // console.log(data.raw.subarray(43, 65));
  // console.log(data.raw.subarray(73, 74));
  // console.log(data.raw.subarray(82, 84));
});
