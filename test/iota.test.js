const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const {
  RecordStore,
  createTransportReplayer
} = require('@ledgerhq/hw-transport-mocker');
const { createPrepareTransfers, generateAddress } = require('@iota/core');
const { addChecksum } = require('@iota/checksum');

// use the library
const { default: Iota } = require('../dist/iota');

const HASH_LENGTH = 81;
const NULL_HASH_TRYTES = '9'.repeat(HASH_LENGTH);
const BIP32_PATH = "44'/4218'/0'/0'";
const NOW = () => 1000;

const EXPECTED_RESULTS = {
  address: NULL_HASH_TRYTES,
  version: '0.5.0',
  maxBundleSize: 8
};

describe('Iota', function() {
  let transport;
  let iota;

  beforeEach(async function() {
    const recordingName = this.currentTest.fullTitle().replace(/[^\w]+/g, '_');
    const recordingFileName = path.join(
      path.dirname(__filename),
      'recordings',
      recordingName + '.txt'
    );

    const recording = fs.readFileSync(recordingFileName, 'utf-8');
    const recordStore = RecordStore.fromString(recording);
    const Transport = createTransportReplayer(recordStore);

    transport = await Transport.open();
    iota = new Iota(transport);
  });

  afterEach(async function() {
    await transport.close();
  });

  describe('#getAddress', function() {
    it('without checksum', async function() {
      await iota.setActiveSeed(BIP32_PATH, 2);
      const address = await iota.getAddress(0);

      expect(address).to.equal(EXPECTED_RESULTS.address);
    });

    it('with checksum', async function() {
      await iota.setActiveSeed(BIP32_PATH, 2);
      const address = await iota.getAddress(0, { checksum: true });

      expect(address).to.equal(addChecksum(EXPECTED_RESULTS.address));
    });
  });

  describe('#getAppVersion', function() {
    it('can get version', async function() {
      const version = await iota.getAppVersion();

      expect(version).to.equal(EXPECTED_RESULTS.version);
    });
  });

  describe('#getAppMaxBundleSize', function() {
    it('can get max bundle size', async function() {
      const size = await iota.getAppMaxBundleSize();

      expect(size).to.equal(EXPECTED_RESULTS.maxBundleSize);
    });
  });

  describe('#prepareTransfers', function() {
    const seed = NULL_HASH_TRYTES;

    // prepare transfers offline
    const prepareTransfers = createPrepareTransfers(undefined, NOW);

    let transfers;

    function createTransfers(security) {
      const inputIndex = 0;
      const remainderIndex = 1;

      const inputAddress = generateAddress(seed, inputIndex, security, false);
      const remainderAddress = generateAddress(
        seed,
        remainderIndex,
        security,
        false
      );

      const outputs = [
        {
          address: NULL_HASH_TRYTES,
          value: 1,
          tag: '',
          message: ''
        }
      ];
      const inputs = [
        {
          address: inputAddress,
          keyIndex: inputIndex,
          security,
          balance: 2
        }
      ];

      return {
        outputs,
        inputs,
        remainder: {
          address: remainderAddress,
          keyIndex: remainderIndex
        }
      };
    }

    // bundle generation takes longer
    this.slow(600);
    this.timeout(2500);

    beforeEach(async function() {
      transfers = createTransfers(2);
    });

    it('without checksum', async function() {
      const security = 2;

      const expected = await prepareTransfers(seed, transfers.outputs, {
        inputs: transfers.inputs,
        remainderAddress: transfers.remainder.address,
        security
      });

      await iota.setActiveSeed(BIP32_PATH, security);
      const actual = await iota.prepareTransfers(
        transfers.outputs,
        transfers.inputs,
        transfers.remainder,
        NOW
      );

      expect(actual).to.deep.equal(expected);
    });

    it('with checksum', async function() {
      const security = 2;
      const expected = await prepareTransfers(seed, transfers.outputs, {
        inputs: transfers.inputs,
        remainderAddress: transfers.remainder.address,
        security
      });

      transfers.outputs.forEach(o => (o.address = addChecksum(o.address)));
      transfers.inputs.forEach(i => (i.address = addChecksum(i.address)));
      transfers.remainder.address = addChecksum(transfers.remainder.address);

      await iota.setActiveSeed(BIP32_PATH, security);
      const actual = await iota.prepareTransfers(
        transfers.outputs,
        transfers.inputs,
        transfers.remainder,
        NOW
      );

      expect(actual).to.deep.equal(expected);
    });
  });
});
