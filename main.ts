#!/usr/bin/env -S deno -A
import { createBluetooth } from "node-ble";
import { parseArgs } from "@std/cli";
import { delay } from "@std/async";
import type { Buffer } from "node:buffer";
import { processData as processPowerhouseData } from "./powerhouse.ts";
import { processData as processSolixPowerstationData } from "./powerstation.ts";

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

// handle Anker PowerHouse 767
if (services.includes("014bf5da-0000-1000-8000-00805f9b34fb")) {
  const service1 = await gattServer.getPrimaryService(
    "014bf5da-0000-1000-8000-00805f9b34fb",
  );

  const characteristics = await service1.characteristics();
  console.debug(`Available characteristics: ${characteristics.length}`)
  for (const characteristic of characteristics) {
    console.debug(characteristic)
  }
  
  const characteristic1 = await service1.getCharacteristic(
    "00007777-0000-1000-8000-00805f9b34fb",
  );
  const characteristic2 = await service1.getCharacteristic(
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
    const data = processPowerhouseData(buffer);
    console.log(data);
    // console.log(data.raw.subarray(0, 17));
    // console.log(data.raw.subarray(43, 65));
    // console.log(data.raw.subarray(73, 74));
    // console.log(data.raw.subarray(82, 84));
  });
}

// handle Anker Solix C300X, it has two services:
// 00001801-0000-1000-8000-00805f9b34fb
// 8c850001-0302-41c5-b46e-cf057c562025
if (services.includes("00001801-0000-1000-8000-00805f9b34fb")) {
  const service1 = await gattServer.getPrimaryService(
    "8c850001-0302-41c5-b46e-cf057c562025",
  );
  
  const characteristicList = await service1.characteristics();
  console.debug(`Available characteristics: ${characteristicList.length}`)
  for (const uuid of characteristicList) {
    const characteristic = await service1.getCharacteristic(
      uuid,
    );
    const flags = await characteristic.getFlags();
    console.debug(`Characteristic: ${uuid}, flags: ${flags}`);
    try {
      const value = await characteristic.readValue()
      console.debug(`${value}:${value.toString('hex')}`);
    } catch (error) {
      console.debug(error.message)
    }
  }
  
  // this characteristic has "notify" flag and provides updates
  const characteristic = await service1.getCharacteristic(
    "8c850003-0302-41c5-b46e-cf057c562025",
  );
  await characteristic.startNotifications();
  characteristic.on("valuechanged", (buffer) => {
    const data = processSolixPowerstationData(buffer);
    console.log(data);
  });
}
