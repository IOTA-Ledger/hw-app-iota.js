import Struct from 'struct';
import Bundle from 'iota.lib.js/lib/crypto/bundle/bundle';
import {
  addChecksum,
  noChecksum,
  transactionTrytes
} from 'iota.lib.js/lib/utils/utils';
import bippath from 'bip32-path';
import semver from 'semver';
import * as inputValidator from './input_validator';

/**
 * IOTA API
 * @module hw-app-iota
 */

const CLA = 0x7a;
const Commands = {
  // specific timeouts:
  INS_SET_SEED: 0x01, // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_PUBKEY: 0x02, // TIMEOUT_CMD_PUBKEY
  INS_TX: 0x03, // TIMEOUT_CMD_NON_USER_INTERACTION => TIMEOUT_CMD_USER_INTERACTION (IF cur_idx == lst_idx)
  INS_SIGN: 0x04, // TIMEOUT_CMD_PUBKEY
  INS_GET_APP_CONFIG: 0x10, // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_RESET: 0xff // TIMEOUT_CMD_NON_USER_INTERACTION
};
const TIMEOUT_CMD_PUBKEY = 10000;
const TIMEOUT_CMD_NON_USER_INTERACTION = 10000;
const TIMEOUT_CMD_USER_INTERACTION = 150000;

const LEGACY_VERSION_RANGE = '<0.5';
const HASH_LENGTH = 81;
const TAG_LENGTH = 27;
const SIGNATURE_FRAGMENT_SLICE_LENGTH = 3 * HASH_LENGTH;
const EMPTY_TAG = '9'.repeat(TAG_LENGTH);

/**
 * Provides meaningful responses to error codes returned by IOTA Ledger app
 * @param {Object} error - Error statusCode
 * @returns {String} String message corresponding to error statusCode
 */
function getIOTAStatusMessage(error) {
  // no status code so must not even be communicating
  if (error.id == 'U2F_5') {
    return 'Ledger device timeout. Ensure Ledger is plugged in and IOTA app is running';
  }

  switch (error.statusCode) {
    // improve text of most common errors
    case 0x9000: // SW_OK
      return 'Success';
    case 0x6700: // SW_INCORRECT_LENGTH
      return 'Incorrect input length';
    case 0x6a80: // SW_COMMAND_INVALID_DATA
      return 'Incorrect data';
    case 0x6b00: // SW_INCORRECT_P1P2
      return 'Incorrect command parameter';
    case 0x6c00: // SW_INCORRECT_LENGTH_P3
      return 'Incorrect length specified in header';
    case 0x6d00: // SW_INS_NOT_SUPPORTED
      return 'Invalid INS command';
    case 0x6e00: // SW_CLA_NOT_SUPPORTED
      return 'Incorrect CLA (Wrong application opened)';
    case 0x6900: // SW_COMMAND_NOT_ALLOWED
      return 'Command not allowed (Command out of order)';
    case 0x6982: // SW_SECURITY_STATUS_NOT_SATISFIED
      return 'Security not satisfied (Device locked)';
    case 0x6985: // SW_CONDITIONS_OF_USE_NOT_SATISFIED
      return 'Condition of use not satisfied (Denied by the user)';
    case 0x6401: // SW_COMMAND_TIMEOUT
      return 'Security not satisfied (Timeout exceeded)';
    case 0x69a1: // SW_BUNDLE_ERROR + INSECURE HASH
      return 'Bundle error (Insecure hash)';
    case 0x69a2: // SW_BUNDLE_ERROR + NON-ZERO BALANCE
      return 'Bundle error (Non zero balance)';
    case 0x69a3: // SW_BUNDLE_ERROR + INVALID META TX
      return 'Bundle error (Invalid meta transaction)';
    case 0x69a4: // SW_BUNDLE_ERROR + INVALID ADDRESS INDEX
      return 'Bundle error (Invalid input address/index pair(s))';
    case 0x69a5: // SW_BUNDLE_ERROR + ADDRESS REUSED
      return 'Bundle error (Address reused)';

    // Legacy exceptions
    case 0x6984: // SW_COMMAND_INVALID_DATA
      return 'Invalid input data';
    case 0x6986: // SW_APP_NOT_INITIALIZED
      return 'App has not been initialized by user';
    case 0x6991: // SW_TX_INVALID_INDEX
      return 'Invalid transaction index';
    case 0x6992: // SW_TX_INVALID_ORDER
      return 'Invalid transaction order (Output, Inputs, Change)';
    case 0x6993: // SW_TX_INVALID_META
      return 'Invalid meta transaction';
    case 0x6994: // SW_TX_INVALID_OUTPUT
      return 'Invalid output transaction (Output must come first)';

    default:
      // UNKNOWN ERROR CODE
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
    this.config = undefined;
    this.security = 0;
    this.pathArray = undefined;
    transport.decorateAppAPIMethods(
      this,
      [
        'setActiveSeed',
        'getAddress',
        'prepareTransfers',
        'getAppVersion',
        'getAppMaxBundleSize'
      ],
      'IOT'
    );
  }

  /**
   * Prepares the IOTA seed to be used for subsequent calls.
   *
   * @param {String} path - String representation of the BIP32 path. At most 5 levels.
   * @param {Number} [security=2] - IOTA security level to use
   * @example
   * iota.setActiveSeed("44'/4218'/0'/0'", 2);
   **/
  async setActiveSeed(path, security = 2) {
    if (!bippath.validateString(path)) {
      throw new Error('Invalid BIP32 path string');
    }
    const pathArray = bippath.fromString(path).toPathArray();
    if (!pathArray || pathArray.length < 2 || pathArray.length > 5) {
      throw new Error('Invalid BIP32 path length');
    }
    if (!inputValidator.isSecurity(security)) {
      throw new Error('Invalid security level provided');
    }

    this.pathArray = pathArray;
    this.security = security;

    // query the app config, if not present
    this.config = this.config ? this.config : await this._getAppConfig();

    if (semver.satisfies(this.config.app_version, LEGACY_VERSION_RANGE)) {
      // use legacy structs
      this._createPubkeyInput = this._createPubkeyInputLegacy;
      this._createTxInput = this._createTxInputLegacy;

      await this._setSeed();
    } else {
      // reset the state on the Ledger
      await this._reset(true);
    }
  }

  /**
   * Generates an address index-based.
   * The result depends on the initalized seed and security level.
   *
   * @param {Integer} index - Index of the address
   * @param {Object} [options]
   * @param {Boolean} [options.checksum=false] - Append 9 tryte checksum
   * @param {Boolean} [options.display=false] - Display generated address on display
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
    options.display = options.display || false;

    const address = await this._publicKey(index, options.display);
    if (options.checksum) {
      return addChecksum(address);
    }
    return address;
  }

  /**
   * Prepares the array of raw transaction data (trytes) by generating a bundle and signing the inputs.
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
   * @param {Function} [now = Date.now()] - Function to get the milliseconds since the UNIX epoch for timestamps.
   * @returns {Promise<String[]>} Transaction trytes of 2673 trytes per transaction
   */
  async prepareTransfers(transfers, inputs, remainder, now = () => Date.now()) {
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
    if (transfers.length > 1) {
      throw new Error('Unsupported number of transfers');
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

    const trytes = await this._prepareTransfers(
      transfers,
      inputs,
      remainder,
      now
    );
    // reset the bundle
    await this._reset(true);

    return trytes;
  }

  /**
   * Retrieves version information about the installed application from the device.
   *
   * @returns {Promise<String>} Semantic Version string (i.e. MAJOR.MINOR.PATCH)
   **/
  async getAppVersion() {
    const config = await this._getAppConfig();
    // update the stored config
    this.config = config;

    return config.app_version;
  }

  /**
   * Retrieves the largest supported number of transactions (including meta transactions)
   * in one transfer bundle from the device.
   *
   * @returns {Promise<Integer>} Maximum bundle size
   **/
  async getAppMaxBundleSize() {
    const config = await this._getAppConfig();
    // update the stored config
    this.config = config;

    // return value from config or default 8
    return config.app_max_bundle_size ? config.app_max_bundle_size : 8;
  }

  ///////// Private methods should not be called directly! /////////

  _addSeedFields(struct) {
    return struct
      .word8('security')
      .word32Ule('pathLength')
      .array('pathArray', this.pathArray.length, 'word32Ule');
  }

  _initSeedFields(struct) {
    const fields = struct.fields;
    fields.security = this.security;
    fields.pathLength = this.pathArray.length;
    fields.pathArray = this.pathArray;
  }

  async _setSeed() {
    const setSeedInStruct = new Struct();
    this._addSeedFields(setSeedInStruct);

    setSeedInStruct.allocate();
    this._initSeedFields(setSeedInStruct);

    await this._sendCommand(
      Commands.INS_SET_SEED,
      0,
      0,
      setSeedInStruct.buffer(),
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  _createPubkeyInputLegacy(index) {
    let struct = new Struct();
    struct = struct.word32Ule('index');

    struct.allocate();

    struct.fields.index = index;

    return struct;
  }

  _createPubkeyInput(index) {
    let struct = new Struct();
    this._addSeedFields(struct);
    struct = struct.word32Ule('index');

    struct.allocate();

    this._initSeedFields(struct);
    struct.fields.index = index;

    return struct;
  }

  async _publicKey(index, display) {
    const pubkeyInStruct = this._createPubkeyInput(index);

    const response = await this._sendCommand(
      Commands.INS_PUBKEY,
      display ? 0x01 : 0x00,
      0,
      pubkeyInStruct.buffer(),
      TIMEOUT_CMD_PUBKEY
    );

    const pubkeyOutStruct = new Struct().chars('address', HASH_LENGTH);
    pubkeyOutStruct.setBuffer(response);

    return pubkeyOutStruct.fields.address;
  }

  async _sign(index, sliceLength) {
    const signInStruct = new Struct().word32Ule('index');

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
      .chars('signature', sliceLength)
      .word8Sle('fragmentsRemaining');
    signOutStruct.setBuffer(response);

    return {
      signature: signOutStruct.fields.signature,
      fragmentsRemaining: signOutStruct.fields.fragmentsRemaining
    };
  }

  _createTxInputLegacy(address, address_idx, value, tag, tx_idx, tx_len, time) {
    let struct = new Struct();
    struct = struct
      .chars('address', HASH_LENGTH)
      .word32Ule('address_idx')
      .word64Sle('value')
      .chars('tag', TAG_LENGTH)
      .word32Ule('tx_idx')
      .word32Ule('tx_len')
      .word32Ule('time');

    struct.allocate();

    const fields = struct.fields;
    fields.address = address;
    fields.address_idx = address_idx;
    fields.value = value;
    fields.tag = tag;
    fields.tx_idx = tx_idx;
    fields.tx_len = tx_len;
    fields.time = time;

    return struct;
  }

  _createTxInput(address, address_idx, value, tag, tx_idx, tx_len, time) {
    let struct = new Struct();
    if (tx_idx == 0) {
      this._addSeedFields(struct);
    }
    struct = struct
      .chars('address', HASH_LENGTH)
      .word32Ule('address_idx')
      .word64Sle('value')
      .chars('tag', TAG_LENGTH)
      .word32Ule('tx_idx')
      .word32Ule('tx_len')
      .word32Ule('time');

    struct.allocate();

    if (tx_idx == 0) {
      this._initSeedFields(struct);
    }
    const fields = struct.fields;
    fields.address = address;
    fields.address_idx = address_idx;
    fields.value = value;
    fields.tag = tag;
    fields.tx_idx = tx_idx;
    fields.tx_len = tx_len;
    fields.time = time;

    return struct;
  }

  async _transaction(address, address_idx, value, tag, tx_idx, tx_len, time) {
    const txInStruct = this._createTxInput(
      address,
      address_idx,
      value,
      tag,
      tx_idx,
      tx_len,
      time
    );

    let timeout = TIMEOUT_CMD_NON_USER_INTERACTION;
    if (tx_idx == tx_len) {
      timeout = TIMEOUT_CMD_USER_INTERACTION;
    }

    const response = await this._sendCommand(
      Commands.INS_TX,
      tx_idx == 0 ? 0x00 : 0x80,
      0,
      txInStruct.buffer(),
      timeout
    );

    const txOutStruct = new Struct()
      .word8('finalized')
      .chars('bundleHash', HASH_LENGTH);
    txOutStruct.setBuffer(response);

    return {
      finalized: txOutStruct.fields.finalized,
      bundleHash: txOutStruct.fields.bundleHash
    };
  }

  async _getSignatureFragments(index, sliceLength) {
    const numSlices = (this.security * 2187) / sliceLength;

    let signature = '';
    for (let i = 1; i <= numSlices; i++) {
      const result = await this._sign(index, sliceLength);
      signature += result.signature;

      // the remaining fragments must match the num slices
      if ((i === numSlices) != (result.fragmentsRemaining === 0)) {
        throw new Error('Wrong signture length');
      }
    }

    // split into segments of exactly 2187 chars
    return signature.match(/.{2187}/g);
  }

  async _addSignatureFragmentsToBundle(bundle) {
    for (let i = 0; i < bundle.bundle.length; i++) {
      const tx = bundle.bundle[i];

      // only sign inputs
      if (tx.value >= 0) {
        continue;
      }

      // compute all the signature fragments for that input transaction
      const signatureFragments = await this._getSignatureFragments(
        i,
        SIGNATURE_FRAGMENT_SLICE_LENGTH
      );
      // and set the first fragment
      tx.signatureMessageFragment = signatureFragments.shift();

      // set the signature fragments for all successive meta transactions
      const address = tx.address;
      for (let j = 1; j < this.security; j++) {
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
    let finalized = false;
    let bundleHash = '';
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
      bundleHash = result.bundleHash;
    }

    if (!finalized) {
      throw new Error('Bundle not finalized');
    }
    if (bundleHash !== bundle.bundle[0].bundle) {
      throw new Error('Wrong bundle hash');
    }

    await this._addSignatureFragmentsToBundle(bundle);
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

  async _prepareTransfers(transfers, inputs, remainder, now) {
    transfers = transfers.map(t => ({
      ...t,
      // remove checksum
      address: noChecksum(t.address),
      // pad tag
      tag: t.tag ? t.tag.padEnd(TAG_LENGTH, '9') : EMPTY_TAG
    }));
    inputs = inputs.map(i => ({
      ...i,
      // remove checksum
      address: noChecksum(i.address),
      // set correct security level
      security: this.security
    }));
    if (remainder) {
      // remove checksum
      remainder = { ...remainder, address: noChecksum(remainder.address) };
    }

    if (this._hasDuplicateAddresses(transfers, inputs, remainder)) {
      throw new Error('transaction must not contain duplicate addresses');
    }

    // use the current time
    const timestamp = Math.floor(now() / 1000);
    let bundle = new Bundle();

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
    const addressKeyIndices = {};
    inputs.forEach(i => (addressKeyIndices[i.address] = i.keyIndex));
    if (remainder) {
      addressKeyIndices[remainder.address] = remainder.keyIndex;
    }

    // sign the bundle on the ledger
    await this._signBundle(bundle, addressKeyIndices);

    // compute and return the corresponding trytes
    const bundleTrytes = [];
    bundle.bundle.forEach(tx => bundleTrytes.push(transactionTrytes(tx)));
    return bundleTrytes.reverse();
  }

  _createAppConfigOutputLegacy() {
    const struct = new Struct()
      .word8('app_flags')
      .word8('app_version_major')
      .word8('app_version_minor')
      .word8('app_version_patch');

    return struct;
  }

  _createAppConfigOutput() {
    const struct = new Struct()
      .word8('app_version_major')
      .word8('app_version_minor')
      .word8('app_version_patch')
      .word8('app_max_bundle_size')
      .word8('app_flags');

    return struct;
  }

  async _getAppConfig() {
    const response = await this._sendCommand(
      Commands.INS_GET_APP_CONFIG,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    let getAppConfigOutStruct = this._createAppConfigOutput();
    // check whether the response matches the struct plus 2 bytes status code
    if (response.length < getAppConfigOutStruct.length() + 2) {
      getAppConfigOutStruct = this._createAppConfigOutputLegacy();
    }
    getAppConfigOutStruct.setBuffer(response);

    const fields = getAppConfigOutStruct.fields;
    return {
      app_max_bundle_size: fields.app_max_bundle_size,
      app_flags: fields.app_flags,
      app_version:
        fields.app_version_major +
        '.' +
        fields.app_version_minor +
        '.' +
        fields.app_version_patch
    };
  }

  async _reset(partial = false) {
    await this._sendCommand(
      Commands.INS_RESET,
      partial ? 1 : 0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _sendCommand(ins, p1, p2, data, timeout) {
    const transport = this.transport;

    try {
      transport.setExchangeTimeout(timeout);
      return await transport.send(CLA, ins, p1, p2, data);
    } catch (error) {
      // set the message according to the status code
      const smsg = getIOTAStatusMessage(error);
      error.message = `Ledger device: ${smsg}`;
      if (error.statusCode) {
        // add hex status code if present
        const statusCodeStr = error.statusCode.toString(16);
        error.message += ` (0x${statusCodeStr})`;
      }
      throw error;
    }
  }
}

export default Iota;
