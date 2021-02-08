# hw-app-iota

[![GitHub License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://raw.githubusercontent.com/IOTA-Ledger/hw-app-iota.js/master/LICENSE)
[![NPM Version](https://img.shields.io/npm/v/hw-app-iota)](https://www.npmjs.com/package/hw-app-iota)
[![Actions Status](https://github.com/IOTA-Ledger/hw-app-iota.js/workflows/Node.js%20CI/badge.svg)](https://github.com/IOTA-Ledger/hw-app-iota.js/actions)

JS Library for communication with Ledger Hardware Wallets and the [IOTA Ledger Application](https://github.comIOTA-Ledger/blue-app-iota).

## Examples

### Basic example
```js
import Transport from "@ledgerhq/hw-transport-node-hid";
// import Transport from "@ledgerhq/hw-transport-u2f"; // for browser
import Iota from 'hw-app-iota';

const getAddress = async () => {
  const transport = await Transport.create();
  const iota = new Iota(transport);
  return await iota.getAddress("44'/1'/0'/0'/0'", { prefix: 'atoi' });
};

getAddress().then(a => console.log(a));
```
