const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const {
  RecordStore,
  createTransportReplayer
} = require('@ledgerhq/hw-transport-mocker');

const { default: Iota } = require('../dist/iota');

const EXPECTED_RESULTS = {
  address: '9'.repeat(81),
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
});
