import Struct from 'struct';
import Bundle from 'iota.lib.js/lib/crypto/bundle/bundle';
import {
  addChecksum,
  noChecksum,
  transactionTrytes
} from 'iota.lib.js/lib/utils/utils';
import { isAddress, isTrytes } from 'iota.lib.js/lib/utils/inputValidator';

const EMPTY_TAG = '9'.repeat(27);
const Commands = {
  INS_SET_SEED: 0x01,
  INS_PUBKEY: 0x02,
  INS_TX: 0x03,
  INS_SIGN: 0x04,
  INS_DISP_ADDR: 0x05,
  INS_READ_INDEXES: 0x06,
  INS_WRITE_INDEXES: 0x07
};

function isTransfersArray(transfers) {
  if (!(transfers instanceof Array)) {
    return false;
  }

  for (var transfer of transfers) {
    if (!isAddress(transfer.address)) {
      return false;
    }
    if (!Number.isInteger(transfer.value) || transfer.value < 0) {
      return false;
    }
    if (!isTrytes(transfer.tag, '0,27')) {
      return false;
    }
  }

  return true;
}

function isInputsArray(inputs) {
  if (!(inputs instanceof Array)) {
    return false;
  }

  for (var input of inputs) {
    if (!isAddress(input.address)) {
      return false;
    }
    if (!Number.isInteger(input.balance) || input.balance < 0) {
      return false;
    }
    if (!Number.isInteger(input.keyIndex) || input.keyIndex < 0) {
      return false;
    }
  }

  return true;
}

/**
 * IOTA API
 *
 * @example
 * import IOTA from "@ledgerhq/hw-app-iota";
 * const iota = new IOTA(transport)
 */
export default class IOTA {
  constructor(transport) {
    this.transport = transport;
    this.security = 0;
    transport.decorateAppAPIMethods(
      this,
      [
        'setSeedInput',
        'getAddress',
        'getSignedTransactions',
        'displayAddress',
        'readIndexes',
        'writeIndexes'
      ],
      'IOT'
    );
  }

  async setSeedInput(bip44Path, security = 2) {
    if (bip44Path.length !== 5) {
      throw new Error('setSeedInput: bip44Path must be a length of 5!');
    }
    if (!Number.isInteger(security) || security < 1 || security > 3) {
      throw new Error('Invalid security level provided');
    }
    this.security = security;

    var pathStruct = new Struct().word64Sle('path');
    var seedStruct = new Struct()
      .array('paths', 5, pathStruct)
      .word64Sle('security');
    seedStruct.allocate();
    var buf = seedStruct.buffer();
    var proxy = seedStruct.fields;
    for (var i in bip44Path) {
      proxy.paths[i].path = bip44Path[i];
    }
    proxy.security = security;

    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport
        .send(0x80, Commands.INS_SET_SEED, 0, 0, buf)
        .then(response => {
          resolve(response);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  /**
   * Generates an address index-based.
   *
   * @method getAddress
   * @param {Integer} index - Index of the address
   * @param {Object} [options]
   * @param {Boolean} [options.checksum=false] - Append 9 tryte checksum
   * @returns {Promise<String>} - Tryte-encoded address
   **/
  async getAddress(index, options = {}) {
    if (!this.security) {
      throw new Error('getAddress: setSeedInput not yet called');
    }
    if (!Number.isInteger(index) || index < 0) {
      throw new Error('Invalid Index provided');
    }
    options.checksum = options.checksum || false;

    var address = await this._getPubKey(index);
    if (options.checksum) {
      address = addChecksum(address);
    }

    return address;
  }

  /**
   * Returns an array of raw transaction data (trytes) including the signatures.
   *
   * @param {Object[]} transfers - Transfer objects
   * @param {String} transfers[].address - Tryte-encoded address of recipient
   * @param {Integer} transfers[].value - Value to be transferred
   * @param {String} transfers[].tag - Tryte-encoded tag. Maximum value is 27 trytes.
   * @param {Object[]} inputs - Inputs used for funding the transfer
   * @param {String} inputs[].address - Tryte-encoded source address
   * @param {Integer} inputs[].balance - Balance of that input
   * @param {String} inputs[].keyIndex - Index of the address
   * @param {Object} [remainder] - Destination for sending the remainder value (of the inputs) to.
   * @param {String} remainder.address - Tryte-encoded address
   * @param {Integer} remainder.keyIndex - Index of the address
   * @returns {Promise<String[]>} - Transaction trytes of 2673 trytes per transaction
   */
  async getSignedTransactions(transfers, inputs, remainder) {
    if (!this.security) {
      throw new Error('getSignedTransactions: setSeedInput not yet called');
    }
    if (!isTransfersArray(transfers)) {
      throw new Error('Invalid transfers array provided');
    }
    if (!isInputsArray(inputs)) {
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

    if (remainder) {
      if (
        !isAddress(remainder.address) ||
        !Number.isInteger(remainder.keyIndex) ||
        remainder.keyIndex < 0
      ) {
        throw new Error('Invalid remainder object provided');
      }

      remainder = {
        address: noChecksum(remainder.address),
        value: balance - payment,
        keyIndex: remainder.keyIndex
      };
    } else if (balance != payment) {
      throw new Error('Remainder object required');
    }

    return await this._getSignedTransactions(transfers, inputs, remainder);
  }

  /**
   * Displays address on Ledger to verify it belongs to ledger seed.
   *
   * @method displayAddress
   * @param {Integer} index - Index of the address
   **/
  async displayAddress(index) {
    if (!this.security) {
      throw new Error('displayAddress: setSeedInput not yet called');
    }
    if (!Number.isInteger(index) || index < 0) {
      throw new Error('Invalid Index provided');
    }

    await this._displayAddress(index);

    return;
  }

  /**
   * Retrieves the 5 seed indexes stored on the Ledger.
   *
   * @method readIndexes
   * @returns {Promise<Integer[]>}
   **/
  async readIndexes() {
    var indexes = await this._readIndexes();

    return indexes;
  }

  /**
   * Writes 5 seed indexes to Ledger.
   *
   * @method writeIndexes
   * @param {Integer[]} indexes - Seed indexes to write
   **/
  async writeIndexes(indexes) {
    await this._writeIndexes(indexes);

    return;
  }

  ///////// Private methods should not be called directly! /////////

  async sign(index) {
    var signStruct = new Struct().word64Sle('index');
    signStruct.allocate();
    var buf = signStruct.buffer();
    var proxy = signStruct.fields;
    proxy.index = index;

    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport
        .send(0x80, Commands.INS_SIGN, 0, 0, buf)
        .then(response => {
          var signOutputStruct = new Struct()
            .chars('signature', 243)
            .word8Sle('fragmentsRemaining');
          signOutputStruct.allocate();
          buf = signOutputStruct.buffer();
          proxy = signOutputStruct.fields;
          signOutputStruct._setBuff(response);
          resolve({
            signature: proxy.signature,
            fragmentsRemaining: proxy.fragmentsRemaining
          });
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  async transaction(address, address_idx, value, tag, tx_idx, tx_len, tx_time) {
    console.log(
      'transaction',
      address,
      address_idx,
      value,
      tag,
      tx_idx,
      tx_len,
      tx_time
    );
    var txStruct = new Struct()
      .chars('address', 81)
      .word64Sle('address_idx')
      .word64Sle('value')
      .chars('tag', 27)
      .word64Sle('tx_idx')
      .word64Sle('tx_len')
      .word64Sle('tx_time');
    txStruct.allocate();
    var buf = txStruct.buffer();
    var proxy = txStruct.fields;

    proxy.address = address;
    proxy.address_idx = address_idx;
    proxy.value = value;
    proxy.tag = tag;
    proxy.tx_idx = tx_idx;
    proxy.tx_len = tx_len;
    proxy.tx_time = tx_time;

    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport
        .send(0x80, Commands.INS_TX, 0, 0, buf)
        .then(response => {
          var txOutputStruct = new Struct()
            .word8Sle('finalized')
            .chars('bundleHash', 81);
          txOutputStruct.allocate();
          buf = txOutputStruct.buffer();
          proxy = txOutputStruct.fields;
          txOutputStruct._setBuff(response);
          resolve({
            bundleHash: proxy.bundleHash,
            finalized: proxy.finalized
          });
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  async signBundleResultToFragments(index) {
    var signatureFragmentStr = '';
    var signatureLength = 2187;
    var signatureFragments = [];

    while (true) {
      var result = await this.sign(index);
      signatureFragmentStr += result.signature;
      if (!result.fragmentsRemaining) {
        break;
      }
    }
    // Should never get any decimals
    // round is just there to make sure amountOfFragments is an integer.
    var amountOfFragments = Math.round(
      signatureFragmentStr.length / signatureLength
    );
    // Pad remainder of fragment
    for (var i = 0; i < amountOfFragments; i++) {
      signatureFragments.push(
        signatureFragmentStr.substring(
          i * signatureLength,
          (i + 1) * signatureLength
        )
      );
    }

    return signatureFragments;
  }

  async addSignatureFragmentsToBundle(bundle) {
    for (var i = 0; i < bundle.bundle.length; i++) {
      if (bundle.bundle[i].value < 0) {
        var address = bundle.bundle[i].address;
        var signatureFragments = await this.signBundleResultToFragments(i);

        bundle.bundle[i].signatureMessageFragment = signatureFragments.shift();

        // if user chooses higher than 27-tryte security
        // for each security level, add an additional signature
        for (var j = 1; j < this.security; j++) {
          //  Because the signature is > 2187 trytes, we need to
          //  find the subsequent transaction to add the remainder of the signature
          //  Same address as well as value = 0 (as we already spent the input)
          if (
            bundle.bundle[i + j].address === address &&
            bundle.bundle[i + j].value === 0
          ) {
            bundle.bundle[
              i + j
            ].signatureMessageFragment = signatureFragments.shift();
          }
        }
      }
    }
  }

  async _signBundle(options) {
    var { inputMapping, bundle } = options;
    for (var tx of bundle.bundle) {
      var index = inputMapping[tx.address] ? inputMapping[tx.address] : 0;
      var result = await this.transaction(
        tx.address,
        index,
        tx.value,
        tx.obsoleteTag,
        tx.currentIndex,
        tx.lastIndex,
        tx.timestamp
      );
    }
    await this.addSignatureFragmentsToBundle(bundle);
    return bundle;
  }

  async _getSignedTransactions(transfers, inputs, remainder) {
    // remove checksums
    transfers.forEach(t => (t.address = noChecksum(t.address)));
    inputs.forEach(i => (i.address = noChecksum(i.address)));

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
    var inputMapping = {};
    inputs.forEach(i => (inputMapping[i.address] = i.keyIndex));
    if (remainder) {
      inputMapping[remainder.address] = remainder.keyIndex;
    }

    // sign the bundle on the ledger
    bundle = await this._signBundle({
      inputMapping,
      bundle
    });

    // compute and return the corresponding trytes
    var bundleTrytes = [];
    bundle.bundle.forEach(tx => bundleTrytes.push(transactionTrytes(tx)));
    return bundleTrytes.reverse();
  }

  async _getPubKey(index) {
    var indexStruct = new Struct().word64Sle('index');
    indexStruct.allocate();
    var buf = indexStruct.buffer();
    var proxy = indexStruct.fields;
    proxy.index = index;
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport
        .send(0x80, Commands.INS_PUBKEY, 0, 0, buf)
        .then(response => {
          var addressStruct = new Struct().chars('address', 81);
          addressStruct.allocate();
          buf = addressStruct.buffer();
          proxy = addressStruct.fields;
          addressStruct._setBuff(response);
          resolve(proxy.address);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  async _displayAddress(index) {
    var indexStruct = new Struct().word64Sle('index');
    indexStruct.allocate();
    var buf = indexStruct.buffer();
    var proxy = indexStruct.fields;
    proxy.index = index;
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport
        .send(0x80, Commands.INS_DISP_ADDR, 0, 0, buf)
        .then(response => {
          resolve(response);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  async _readIndexes() {
    var indexStruct = new Struct();
    indexStruct.allocate();
    var buf = indexStruct.buffer();
    var proxy = indexStruct.fields;
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport
        .send(0x80, Commands.INS_READ_INDEXES, 0, 0, buf)
        .then(response => {
          var indexesStruct = new Struct().array('indexes', 5, 'word64Sle');
          indexesStruct.allocate();
          buf = indexesStruct.buffer();
          proxy = indexesStruct.fields;
          indexesStruct._setBuff(response);
          resolve(proxy.indexes);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  async _writeIndexes(indexes) {
    var indexStruct = new Struct().array('indexes', 5, 'word64Sle');
    indexStruct.allocate();
    var buf = indexStruct.buffer();
    var proxy = indexStruct.fields;
    proxy.indexes = indexes;
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport
        .send(0x80, Commands.INS_WRITE_INDEXES, 0, 0, buf)
        .then(response => {
          resolve(response);
        })
        .catch(e => {
          reject(e);
        });
    });
  }
}
