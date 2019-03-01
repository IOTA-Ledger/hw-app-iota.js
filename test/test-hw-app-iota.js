const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const {
  RecordStore,
  createTransportReplayer
} = require('@ledgerhq/hw-transport-mocker');
const { createPrepareTransfers, generateAddress } = require('@iota/core');

const HASH_LENGTH = 81;
const SIGNATURE_FRAGMENT_LENGTH = 27 * HASH_LENGTH;
const NULL_HASH_TRYTES = '9'.repeat(HASH_LENGTH);

// use the library
const { default: Iota } = require('../dist/iota');

const EXPECTED_RESULTS = {
  address: NULL_HASH_TRYTES,
  version: '0.5.0',
  maxBundleSize: 8
};

describe('hw-app-iota', function() {
  let transport;

  beforeEach(async function() {
    const recordingName = this.currentTest.fullTitle().replace(/[^\w]/g, '_');
    const recordingFileName = path.join(
      path.dirname(__filename),
      'recordings',
      recordingName + '.json'
    );

    const recording = JSON.parse(fs.readFileSync(recordingFileName, 'utf-8'));
    const recordStore = RecordStore.fromObject(recording);
    const Transport = createTransportReplayer(recordStore);

    transport = await Transport.open();
  });

  afterEach(async function() {
    await transport.close();
  });

  it('can get address', async function() {
    const iota = new Iota(transport);
    await iota.setActiveSeed("44'/4218'/0'/0'");
    const address = await iota.getAddress(0);

    expect(address).to.equal(EXPECTED_RESULTS.address);
  });

  it('can get version', async function() {
    const iota = new Iota(transport);
    const version = await iota.getAppVersion();

    expect(version).to.equal(EXPECTED_RESULTS.version);
  });

  it('can get max bundle size', async function() {
    const iota = new Iota(transport);
    const size = await iota.getAppMaxBundleSize();

    expect(size).to.equal(EXPECTED_RESULTS.maxBundleSize);
  });

  it('can prepare transfers', async function() {
    const seed = NULL_HASH_TRYTES;
    const security = 2;
    const now = () => 1000;

    const inputIndex = 0;
    const remainderIndex = 1;

    const inputAddress = generateAddress(seed, inputIndex, security, false);
    const remainderAddress = generateAddress(
      seed,
      remainderIndex,
      security,
      false
    );

    const transfers = [
      {
        address: NULL_HASH_TRYTES,
        value: 1,
        tag: '9A9999999999999999999999999',
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

    // prepare transfers offline
    const prepareTransfers = createPrepareTransfers(undefined, now);

    const expected = await prepareTransfers(seed, transfers, {
      inputs,
      remainderAddress,
      security
    });

    class MyIota extends Iota {
      async _sign(index, _) {
        // read the entire signature fragment in one APDU command
        return await super._sign(index, security * SIGNATURE_FRAGMENT_LENGTH);
      }
    }

    const iota = new MyIota(transport);
    await iota.setActiveSeed("44'/4218'/0'/0'", security);

    const actual = await iota.prepareTransfers(
      transfers,
      inputs,
      {
        address: remainderAddress,
        keyIndex: remainderIndex
      },
      now
    );

    expect(actual).to.deep.equal(expected);
  });
});
