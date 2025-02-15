export function processData(data: Buffer) {
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
