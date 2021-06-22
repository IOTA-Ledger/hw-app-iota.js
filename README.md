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
  await iota.setActiveSeed("44'/4218'/0'/0'");
  return await iota.getAddress(0, {checksum: true});
};

getAddress().then(a => console.log(a));
```

### Transaction example
```js
import Transport from "@ledgerhq/hw-transport-node-hid";
// import Transport from "@ledgerhq/hw-transport-u2f"; // for browser
import Iota from 'hw-app-iota';

const prepareTransfers = async () => {
  const transport = await Transport.create();
  const iota = new Iota(transport);
  await iota.setActiveSeed("44'/4218'/0'/0'");

  const transfers = [{
    address: 'ANADDRESS',
    value: 10000,
    tag: 'ATAG'
  }];
  const inputs = [{
    address: 'INPUTADDRESS',
    balance: 10000,
    keyIndex: 4
  }];
  return await iota.prepareTransfers(transfers, inputs);
};

prepareTransfers().then(t => console.log(t));
```

### See also

- [Ledger app IOTA demos](https://github.com/IOTA-ledger/ledger-app-iota-demos)

## API Reference

### hw-app-iota~Iota
Class for the interaction with the Ledger IOTA application.

* [~Iota](#module_hw-app-iota..Iota)
    * [.setActiveSeed(path, [security])](#module_hw-app-iota..Iota+setActiveSeed)
    * [.getAddress(index, [options])](#module_hw-app-iota..Iota+getAddress) ⇒ <code>Promise.&lt;String&gt;</code>
    * [.prepareTransfers(transfers, inputs, [remainder], [now])](#module_hw-app-iota..Iota+prepareTransfers) ⇒ <code>Promise.&lt;Array.&lt;String&gt;&gt;</code>
    * [.getAppVersion()](#module_hw-app-iota..Iota+getAppVersion) ⇒ <code>Promise.&lt;String&gt;</code>
    * [.getAppMaxBundleSize()](#module_hw-app-iota..Iota+getAppMaxBundleSize) ⇒ <code>Promise.&lt;Integer&gt;</code>

<a name="module_hw-app-iota..Iota+setActiveSeed"></a>

#### iota.setActiveSeed(path, [security])
Prepares the IOTA seed to be used for subsequent calls.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | <code>String</code> |  | String representation of the BIP32 path. At most 5 levels. |
| [security] | <code>Integer</code> | <code>2</code> | IOTA security level to use |

**Example**  
```js
iota.setActiveSeed("44'/4218'/0'/0'", 2);
```
<a name="module_hw-app-iota..Iota+getAddress"></a>

#### iota.getAddress(index, [options]) ⇒ <code>Promise.&lt;String&gt;</code>
Generates an address index-based.
The result depends on the initalized seed and security level.

**Returns**: <code>Promise.&lt;String&gt;</code> - Tryte-encoded address  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| index | <code>Integer</code> |  | Index of the address |
| [options] | <code>Object</code> |  |  |
| [options.checksum] | <code>Boolean</code> | <code>false</code> | Append 9 tryte checksum |
| [options.display] | <code>Boolean</code> | <code>false</code> | Display generated address on display |

**Example**  
```js
iota.getAddress(0, { checksum: true });
```
<a name="module_hw-app-iota..Iota+prepareTransfers"></a>

#### iota.prepareTransfers(transfers, inputs, [remainder], [now]) ⇒ <code>Promise.&lt;Array.&lt;String&gt;&gt;</code>
Prepares the array of raw transaction data (trytes) by generating a bundle and signing the inputs.

**Returns**: <code>Promise.&lt;Array.&lt;String&gt;&gt;</code> - Transaction trytes of 2673 trytes per transaction  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| transfers | <code>Array.&lt;Object&gt;</code> |  | Transfer objects |
| transfers[].address | <code>String</code> |  | Tryte-encoded address of recipient, with or without the 9 tryte checksum |
| transfers[].value | <code>Integer</code> |  | Value to be transferred |
| transfers[].tag | <code>String</code> |  | Tryte-encoded tag. Maximum value is 27 trytes. |
| inputs | <code>Array.&lt;Object&gt;</code> |  | Inputs used for funding the transfer |
| inputs[].address | <code>String</code> |  | Tryte-encoded source address, with or without the 9 tryte checksum |
| inputs[].balance | <code>Integer</code> |  | Balance of that input |
| inputs[].keyIndex | <code>String</code> |  | Index of the address |
| [inputs[].tags] | <code>Array.&lt;String&gt;</code> |  | Tryte-encoded tags, one for each security level. |
| [remainder] | <code>Object</code> |  | Destination for sending the remainder value (of the inputs) to. |
| remainder.address | <code>String</code> |  | Tryte-encoded address, with or without the 9 tryte checksum |
| remainder.keyIndex | <code>Integer</code> |  | Index of the address |
| [remainder.tag] | <code>String</code> |  | Tryte-encoded tag. Maximum value is 27 trytes. |
| [now] | <code>function</code> | <code>Date.now()</code> | Function to get the milliseconds since the UNIX epoch for timestamps. |

<a name="module_hw-app-iota..Iota+getAppVersion"></a>

#### iota.getAppVersion() ⇒ <code>Promise.&lt;String&gt;</code>
Retrieves version information about the installed application from the device.

**Returns**: <code>Promise.&lt;String&gt;</code> - Semantic Version string (i.e. MAJOR.MINOR.PATCH)  
<a name="module_hw-app-iota..Iota+getAppMaxBundleSize"></a>

#### iota.getAppMaxBundleSize() ⇒ <code>Promise.&lt;Integer&gt;</code>
Retrieves the largest supported number of transactions (including meta transactions)
in one transfer bundle from the device.

**Returns**: <code>Promise.&lt;Integer&gt;</code> - Maximum bundle size
