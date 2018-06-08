import Struct from 'struct';
import Bundle from 'iota.lib.js/lib/crypto/bundle/bundle';
import {
  addChecksum,
  noChecksum,
  transactionTrytes
} from 'iota.lib.js/lib/utils/utils';
import bippath from 'bip32-path';
import * as inputValidator from './input_validator';

/**
 * IOTA API
 * @module hw-app-iota
 */

const EMPTY_TAG = '9'.repeat(27);
const Commands = {                // specific timeouts:
  INS_SET_SEED: 0x01,             // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_PUBKEY: 0x02,               // TIMEOUT_CMD_PUBKEY
  INS_TX: 0x03,                   // TIMEOUT_CMD_NON_USER_INTERACTION => TIMEOUT_CMD_USER_INTERACTION (IF cur_idx == lst_idx)
  INS_SIGN: 0x04,                 // TIMEOUT_CMD_PUBKEY
  INS_DISP_ADDR: 0x05,            // TIMEOUT_CMD_PUBKEY
  INS_READ_INDEXES: 0x06,         // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_WRITE_INDEXES: 0x07,        // TIMEOUT_CMD_USER_INTERACTION
  INS_GET_APP_CONFIG: 0x08        // TIMEOUT_CMD_NON_USER_INTERACTION
};
const TIMEOUT_CMD_PUBKEY = 5000;
const TIMEOUT_CMD_NON_USER_INTERACTION = 5000;
const TIMEOUT_CMD_USER_INTERACTION = 90000;

/**
 * Provides meaningful responses to error codes returned by IOTA Ledger app
 * @param {Number} code - Error statusCode
 * @returns {String} String message corresponding to error statusCode
 */
export function getIOTAStatusMessage(error) {
  // no status code so must not even be communicating
  if (error.id == "U2F_5") {
    return "Ledger device timeout. Ensure Ledger is plugged in and IOTA app is running";
  }
    
  switch (error.statusCode) {
  // improve text of most common errors
    case 0x9000:        // SW_OK
      return "Success";
    case 0x6700:        // SW_INCORRECT_LENGTH
      return "Incorrect input length";
    case 0x6982:        // SW_SECURITY_STATUS_NOT_SATISFIED
      return "Security not satisfied (Denied by user)";
    case 0x6c00:        // SW_INCORRECT_LENGTH_P3
      return "Incorrect length specified in header"
    case 0x6d00:        // SW_INS_NOT_SUPPORTED
      return "Invalid INS command";
    case 0x6e00:        // SW_CLA_NOT_SUPPORTED
      return "Incorrect CLA (First byte must be 0x80)";
    case 0x6984:        // SW_COMMAND_INVALID_DATA
      return "Invalid input data";
    case 0x6985:        // SW_COMMAND_INVALID_STATE
      return "Invalid ledger state (Command out of order(?))";
    case 0x6986:        // SW_APP_NOT_INITIALIZED
      return "App has not been initialized by user";
    case 0x6991:        // SW_TX_INVALID_INDEX
      return "Invalid transaction index";
    case 0x6992:        // SW_TX_INVALID_ORDER
      return "Invalid transaction order (Output, Inputs, Change)";
    case 0x6993:        // SW_TX_INVALID_META
      return "Invalid meta transaction";
    case 0x6994:        // SW_TX_INVALID_OUTPUT
      return "Invalid output transaction (Output must come first)";
    case 0x69a1:        // SW_BUNDLE_ERROR + INSECURE HASH
      return "Insecure hash";
    case 0x69a2:        // SW_BUNDLE_ERROR + NON-ZERO BALANCE
      return "Non zero balance";
    case 0x69a3:        // SW_BUNDLE_ERROR + INVALID META TX
      return "Invalid meta transaction";
    case 0x69a4:        // SW_BUNDLE_ERROR + INVALID ADDRESS INDEX
      return "Invalid input address/index pair(s)";
    case 0x69a5:        // SW_BUNDLE_ERROR + ADDRESS REUSED
      return "Address reused";
    default:            // UNKNOWN ERROR CODE
      return error.message;
    }
}

/**
 * Class for the interaction with the Ledger IOTA application.
 *
 * @example
 * import Iota from "hw-app-iota";
 * const iota = new Iota(transport);
 */
class Iota {
  constructor(transport) {
    this.transport = transport;
    this.security = 0;
    transport.decorateAppAPIMethods(
      this,
      [
        'setActiveSeed',
        'getAddress',
        'signTransaction',
        'displayAddress',
        'readIndexes',
        'writeIndexes',
        'getAppConfig'
      ],
      'IOT'
    );
  }

  /**
   * Initializes the Ledger with a security level and an IOTA seed based on a
   * BIP44 path.
   *
   * @param {String} path - String representation of the 5-level BIP32 path
   * @param {Number} [security=2] - IOTA security level to use
   * @example
   * iota.setActiveSeed("44'/4218'/0'/0/0", 2);
   **/
  async setActiveSeed(path, security = 2) {
    if (!bippath.validateString(path)) {
      throw new Error('Invalid BIP44 path string');
    }
    const pathArray = bippath.fromString(path).toPathArray();
    if (!pathArray || pathArray.length !== 5) {
      throw new Error('Invalid BIP44 path length');
    }
    if (!inputValidator.isSecurity(security)) {
      throw new Error('Invalid security level provided');
    }
    this.pathArray = pathArray;
    this.security = security;

    await this._setSeed(pathArray, security);
  }

  /**
   * Initializes the Ledger with a security level and an IOTA seed based on
   * one out of 5 predefined accounts.
   * This identical to calling setActiveSeed with the default IOTA path where
   * level 5 corresponds to the account number. The seed indexes are only
   * available for those 5 paths.
   *
   * @param {Number} account - Account number. Must be between 0 and 4.
   * @param {Number} [security=2] - IOTA security level to use
   * @example
   * iota.setActiveAccount(0, 2);
   **/
  async setActiveAccount(account, security = 2) {
    if (!Number.isInteger(account) || account < 0 || account >= 5) {
      throw new Error('Invalid Account number provided');
    }

    const path = "44'/4218'/0'/0/" + account;
    await this.setActiveSeed(path, security);
  }

  /**
   * Generates an address index-based.
   * The result depends on the initalized seed and security level.
   *
   * @param {Integer} index - Index of the address
   * @param {Object} [options]
   * @param {Boolean} [options.checksum=false] - Append 9 tryte checksum
   * @returns {Promise<String>} Tryte-encoded address
   * @example
   * iota.getAddress(0, { checksum: true });
   **/
  async getAddress(index, options = {}) {
    if (!this.security) {
      throw new Error('Seed not yet initalized');
    }
    if (!inputValidator.isIndex(index)) {
      throw new Error('Invalid Index provided');
    }
    options.checksum = options.checksum || false;

    var address = await this._publicKey(index);
    if (options.checksum) {
      address = addChecksum(address);
    }

    return address;
  }

  /**
   * Returns an array of raw transaction data (trytes) including the signatures.
   *
   * @param {Object[]} transfers - Transfer objects
   * @param {String} transfers[].address - Tryte-encoded address of recipient, with or without the 9 tryte checksum
   * @param {Integer} transfers[].value - Value to be transferred
   * @param {String} transfers[].tag - Tryte-encoded tag. Maximum value is 27 trytes.
   * @param {Object[]} inputs - Inputs used for funding the transfer
   * @param {String} inputs[].address - Tryte-encoded source address, with or without the 9 tryte checksum
   * @param {Integer} inputs[].balance - Balance of that input
   * @param {String} inputs[].keyIndex - Index of the address
   * @param {Object} [remainder] - Destination for sending the remainder value (of the inputs) to.
   * @param {String} remainder.address - Tryte-encoded address, with or without the 9 tryte checksum
   * @param {Integer} remainder.keyIndex - Index of the address
   * @returns {Promise<String[]>} Transaction trytes of 2673 trytes per transaction
   */
  async signTransaction(transfers, inputs, remainder) {
    if (!this.security) {
      throw new Error('Seed not yet initalized');
    }
    if (!inputValidator.isTransfersArray(transfers)) {
      throw new Error('Invalid transfers array provided');
    }
    if (!inputValidator.isInputsArray(inputs)) {
      throw new Error('Invalid inputs array provided');
    }

    // filter unnecessary inputs
    inputs = inputs.filter(input => input.balance > 0);

    if (inputs.length < 1) {
      throw new Error('At least one input required');
    }

    if (transfers.length > 1 || inputs.length > 2) {
      throw new Error('Unsupported number of transfers or inputs');
    }

    const balance = inputs.reduce((a, i) => a + i.balance, 0);
    const payment = transfers.reduce((a, t) => a + t.value, 0);

    if (balance === payment) {
      // ignore the remainder, if there is no change
      remainder = undefined;
    } else if (!remainder) {
      throw new Error('Remainder object required');
    }

    if (remainder) {
      if (!inputValidator.isRemainderObject(remainder)) {
        throw new Error('Invalid remainder object provided');
      }

      remainder = {
        address: remainder.address,
        value: balance - payment,
        keyIndex: remainder.keyIndex
      };
    }

    const trytes = await this._signTransaction(transfers, inputs, remainder);

    // resetting the bundle can only be done by setting the seed
    await this._setSeed(this.pathArray, this.security);
    return trytes;
  }

  /**
   * Displays address on Ledger to verify it belongs to ledger seed.
   *
   * @param {Integer} index - Index of the address
   **/
  async displayAddress(index) {
    if (!this.security) {
      throw new Error('Seed not yet initalized');
    }
    if (!inputValidator.isIndex(index)) {
      throw new Error('Invalid Index provided');
    }

    await this._displayAddress(index);
  }

  /**
   * Retrieves the 5 seed indexes stored on the Ledger.
   * Each index corresponds to the index of highest remainder address used
   * so far on the respective account.
   *
   * @returns {Promise<Integer[]>}
   **/
  async readIndexes() {
    return await this._readIndexes();
  }

  /**
   * Writes the 5 seed indexes to Ledger.
   *
   * @param {Integer[]} indexes - Seed indexes to write
   **/
  async writeIndexes(indexes) {
    if (
      !inputValidator.isArray(indexes) ||
      !indexes.every(inputValidator.isIndex)
    ) {
      throw new Error('Invalid Indexes array provided');
    }
    if (indexes.length !== 5) {
      throw new Error('Unsupported number of indexes');
    }

    await this._writeIndexes(indexes);
  }
    
  /**
   * Retrieves current state flags as well as APP_MAJOR, MINOR, and PATCH versions
   *
   * @return {Promise<Integer[]>}
   **/
  async getAppConfig() {
    return await this._getAppConfig();
  }

  ///////// Private methods should not be called directly! /////////

  async _setSeed(pathArray, security) {
    const setSeedInStruct = new Struct()
      .array('pathArray', 5, 'word64Sle')
      .word64Sle('security');

    setSeedInStruct.allocate();
    setSeedInStruct.fields.pathArray = pathArray;
    setSeedInStruct.fields.security = security;

    await this._sendCommand(
      Commands.INS_SET_SEED,
      0,
      0,
      setSeedInStruct.buffer(),
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _publicKey(index) {
    const pubkeyInStruct = new Struct().word64Sle('index');

    pubkeyInStruct.allocate();
    pubkeyInStruct.fields.index = index;

    const response = await this._sendCommand(
      Commands.INS_PUBKEY,
      0,
      0,
      pubkeyInStruct.buffer(),
      TIMEOUT_CMD_PUBKEY
    );

    const pubkeyOutStruct = new Struct().chars('address', 81);
    pubkeyOutStruct.setBuffer(response);

    return pubkeyOutStruct.fields.address;
  }

  async _sign(index) {
    const signInStruct = new Struct().word64Sle('index');

    signInStruct.allocate();
    signInStruct.fields.index = index;

    const response = await this._sendCommand(
      Commands.INS_SIGN,
      0,
      0,
      signInStruct.buffer(),
      TIMEOUT_CMD_PUBKEY
    );

    const signOutStruct = new Struct()
      .chars('signature', 243)
      .word8Sle('fragmentsRemaining');
    signOutStruct.setBuffer(response);

    return {
      signature: signOutStruct.fields.signature,
      fragmentsRemaining: signOutStruct.fields.fragmentsRemaining
    };
  }

  async _transaction(address, address_idx, value, tag, tx_idx, tx_len, time) {
    const txInStruct = new Struct()
      .chars('address', 81)
      .word64Sle('address_idx')
      .word64Sle('value')
      .chars('tag', 27)
      .word64Sle('tx_idx')
      .word64Sle('tx_len')
      .word64Sle('time');

    txInStruct.allocate();
    const fields = txInStruct.fields;
    fields.address = address;
    fields.address_idx = address_idx;
    fields.value = value;
    fields.tag = tag;
    fields.tx_idx = tx_idx;
    fields.tx_len = tx_len;
    fields.time = time;

    var timeout = TIMEOUT_CMD_NON_USER_INTERACTION;
    if (tx_idx == tx_len) {
      timeout = TIMEOUT_CMD_USER_INTERACTION;
    };

    const response = await this._sendCommand(
      Commands.INS_TX,
      0,
      0,
      txInStruct.buffer(),
      timeout
    );

    const txOutStruct = new Struct()
      .word8Sle('finalized')
      .chars('bundleHash', 81);
    txOutStruct.setBuffer(response);

    return {
      finalized: txOutStruct.fields.finalized,
      bundleHash: txOutStruct.fields.bundleHash
    };
  }

  async _getSignatureFragments(index) {
    var signature = '';
    while (true) {
      const result = await this._sign(index);
      signature += result.signature;

      if (!result.fragmentsRemaining) {
        break;
      }
    }

    // split into segments of exactly 2187 chars
    return signature.match(/.{2187}/g);
  }

  async _addSignatureFragmentsToBundle(bundle) {
    for (var i = 0; i < bundle.bundle.length; i++) {
      // only sign inputs
      if (bundle.bundle[i].value >= 0) {
        continue;
      }

      const address = bundle.bundle[i].address;
      const signatureFragments = await this._getSignatureFragments(i);

      bundle.bundle[i].signatureMessageFragment = signatureFragments.shift();

      // set the signature fragments for all successive meta transactions
      for (var j = 1; j < this.security; j++) {
        if (++i >= bundle.bundle.length) {
          return;
        }

        const tx = bundle.bundle[i];
        if (tx.address === address && tx.value === 0) {
          tx.signatureMessageFragment = signatureFragments.shift();
        }
      }
    }
  }

  async _signBundle(bundle, addressKeyIndices) {
    var finalized = false;
    for (const tx of bundle.bundle) {
      const keyIndex = addressKeyIndices[tx.address]
        ? addressKeyIndices[tx.address]
        : 0;
      const result = await this._transaction(
        tx.address,
        keyIndex,
        tx.value,
        tx.obsoleteTag,
        tx.currentIndex,
        tx.lastIndex,
        tx.timestamp
      );
      finalized = result.finalized;
    }

    if (!finalized) {
      throw new Error('Bundle not finalized');
    }

    await this._addSignatureFragmentsToBundle(bundle);
    return bundle;
  }

  _hasDuplicateAddresses(transfers, inputs, remainder) {
    const set = new Set();
    transfers.forEach(t => set.add(t.address));
    inputs.forEach(i => set.add(i.address));
    if (remainder && set.has(remainder.address)) {
      return true;
    }

    return set.length === transfers.length + inputs.length;
  }

  async _signTransaction(transfers, inputs, remainder) {
    // remove checksums
    transfers.forEach(t => (t.address = noChecksum(t.address)));
    inputs.forEach(i => (i.address = noChecksum(i.address)));
    if (remainder) {
      remainder.address = noChecksum(remainder.address);
    }

    if (this._hasDuplicateAddresses(transfers, inputs, remainder)) {
      throw new Error('transaction must not contain duplicate addresses');
    }

    // pad transfer tags
    transfers.forEach(t => (t.tag = t.tag ? t.tag.padEnd(27, '9') : EMPTY_TAG));
    // set correct security level
    inputs.forEach(i => (i.security = this.security));

    // use the current time
    const timestamp = Math.floor(Date.now() / 1000);
    var bundle = new Bundle();

    transfers.forEach(t =>
      bundle.addEntry(1, t.address, t.value, t.tag, timestamp, -1)
    );
    inputs.forEach(i =>
      bundle.addEntry(
        i.security,
        i.address,
        -i.balance,
        EMPTY_TAG,
        timestamp,
        i.keyIndex
      )
    );
    if (remainder) {
      bundle.addEntry(
        1,
        remainder.address,
        remainder.value,
        EMPTY_TAG,
        timestamp,
        remainder.keyIndex
      );
    }
    bundle.addTrytes([]);
    bundle.finalize();

    // map internal addresses to their index
    var addressKeyIndices = {};
    inputs.forEach(i => (addressKeyIndices[i.address] = i.keyIndex));
    if (remainder) {
      addressKeyIndices[remainder.address] = remainder.keyIndex;
    }

    // sign the bundle on the ledger
    bundle = await this._signBundle(bundle, addressKeyIndices);

    // compute and return the corresponding trytes
    var bundleTrytes = [];
    bundle.bundle.forEach(tx => bundleTrytes.push(transactionTrytes(tx)));
    return bundleTrytes.reverse();
  }

  async _displayAddress(index) {
    const dispAddrInStruct = new Struct().word64Sle('index');

    dispAddrInStruct.allocate();
    dispAddrInStruct.fields.index = index;

    await this._sendCommand(
      Commands.INS_DISP_ADDR,
      0,
      0,
      dispAddrInStruct.buffer(),
      TIMEOUT_CMD_PUBKEY
    );
  }

  async _readIndexes() {
    const response = await this._sendCommand(Commands.INS_READ_INDEXES, 0, 0, undefined, TIMEOUT_CMD_NON_USER_INTERACTION);

    const readIndexesOutStruct = new Struct().array('indexes', 5, 'word64Sle');
    readIndexesOutStruct.setBuffer(response);

    return readIndexesOutStruct.fields.indexes;
  }

  async _writeIndexes(indexes) {
    const writeIndexesInStruct = new Struct().array('indexes', 5, 'word64Sle');

    writeIndexesInStruct.allocate();
    writeIndexesInStruct.fields.indexes = indexes;

    await this._sendCommand(
      Commands.INS_WRITE_INDEXES,
      0,
      0,
      writeIndexesInStruct.buffer(),
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _getAppConfig() {
    const response = await this._sendCommand(Commands.INS_GET_APP_CONFIG, 0, 0, undefined, TIMEOUT_CMD_NON_USER_INTERACTION);

    const getAppConfigOutStruct = new Struct().word8('app_flags').word8('app_version_major').word8('app_version_minor').word8('app_version_patch');
    getAppConfigOutStruct.setBuffer(response);

    return {
      app_flags: getAppConfigOutStruct.fields.app_flags,
      app_version_major: getAppConfigOutStruct.fields.app_version_major,
      app_version_minor: getAppConfigOutStruct.fields.app_version_minor,
      app_version_patch: getAppConfigOutStruct.fields.app_version_patch
    };
  }

  async _sendCommand(ins, p1, p2, data, timeout) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport.setExchangeTimeout(timeout);
      _this.transport
        .send(0x80, ins, p1, p2, data)
        .then(response => {
          resolve(response);
        })
        .catch(e => {
          reject(e);
        });
    });
  }
}

export default Iota;
