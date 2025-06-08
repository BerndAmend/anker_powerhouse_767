#!/usr/bin/env -S deno -A
import { createBluetooth } from "node-ble";
import { parseArgs } from "@std/cli";
import { delay } from "@std/async";
import { Buffer } from "node:buffer";
import NodeBle from "node-ble";

function processCharacteristic1(data: Buffer) {
  console.log(data.toJSON());
  return {
    checksumCorrect:
      data.at(-1) === (data.subarray(0, -1).reduce((x, y) => x + y, 0) & 0xff),
    raw: data,
  };
}

function serializeCharacteristic1(data: {}): Buffer {
  return Buffer.from([8, 238, 0, 0, 0, 1, 1, 10, 0, 2]);
  // const ret = Buffer.alloc(10);

  // ret.writeUInt8(0x8);
  // ret.writeUInt8(0xee, 1);

  // ret.writeUInt8(ret.subarray(0, -1).reduce((x, y) => x + y, 0) & 0xff, 9);

  // return ret;
}

function processCharacteristic2(data: Buffer) {
  console.log(data.toJSON());
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
      checksumCorrect: data.at(-1) === (data.subarray(0, -1).reduce((x, y) =>
        x + y, 0) & 0xff),
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
    checksumCorrect:
      data.at(-1) === (data.subarray(0, -1).reduce((x, y) => x + y, 0) & 0xff),
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
await adapter.startDiscovery();
const device = await adapter.waitDevice(flags.device);

// device.on("connect", (state) => console.log("Connected", state));
// device.on("disconnect", (state) => console.log("Disconnected", state));

await device.connect();

const gattServer = await device.gatt();
const service1 = await gattServer.getPrimaryService(
  "014bf5da-0000-1000-8000-00805f9b34fb",
);

export const characteristic1 = await service1.getCharacteristic(
  "00007777-0000-1000-8000-00805f9b34fb",
);
export const characteristic2 = await service1.getCharacteristic(
  "00008888-0000-1000-8000-00805f9b34fb",
);

console.log(
  "characteristic1",
  processCharacteristic1(await characteristic1.readValue()),
);

// await characteristic1.writeValue(serializeCharacteristic1({}), {
//   type: "request",
// });

await characteristic2.startNotifications();
characteristic2.on("valuechanged", (buffer) => {
  const data = processCharacteristic2(buffer);
  console.log(data);
  console.log(data.raw.toString("hex"));
  // console.log(data.raw.subarray(0, 17));
  // console.log(data.raw.subarray(43, 65));
  // console.log(data.raw.subarray(73, 74));
  // console.log(data.raw.subarray(82, 84));
});
