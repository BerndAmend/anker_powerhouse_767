export function processData(data: Buffer) {
  let lightState: number;
  let lightStateStr = "";

  if (data.length === 29) {
    lightState = data[23];

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
      Light: {
        state: lightState,
        stateStr: lightStateStr,
      },
      raw: data,
    };
  }
  const result = {
    raw: data,
  };

  return result;
}
