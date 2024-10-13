# Notes

Only tested on Arch Linux

# Usage

```bash
# Step 1: Use bluetoothctl to find the address of your
$ bluetoothctl
# Enter 'devices' and search for 767_PowerHouse
devices
exit
# Start the anker connector
./main.ts --device="E8:EE:CC:42:AA:D2"
or
deno -A main.ts --device="E8:EE:CC:42:AA:D2"
```

# Plans

- Add an MQTT interface using ts-zeug
