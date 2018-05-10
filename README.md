This repository hosts the library to communicate with the Ledger Nano S IOTA app.

## Examples

**Basic example:**

```js
import Transport from "@ledgerhq/hw-transport-node-hid";
// import Transport from "@ledgerhq/hw-transport-u2f"; // for browser
import AppIota from 'hw-app-iota';

const getAddress = async () => {
  const transport = await Transport.create();
  const hwapp = new AppIota(transport);
  await hwapp.setActiveSeed("44'/107A'/0'/0/0", 2);
  return await hwapp.getAddress(0, {checksum: true});
};

getAddress().then(a => console.log(a));
