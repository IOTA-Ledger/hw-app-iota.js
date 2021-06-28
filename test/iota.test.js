import { expect, use as chaiUse } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import fs from 'fs';
import path from 'path';

import Iota from 'hw-app-iota';
import Joi from 'joi';

import {
  RecordStore,
  createTransportReplayer,
} from '@ledgerhq/hw-transport-mocker';
import { createPrepareTransfers, generateAddress } from '@iota/core';
import { addChecksum } from '@iota/checksum';

// enable promises in Chai
chaiUse(chaiAsPromised);

const SECURITY = 2;
const HASH_LENGTH = 81;
const NULL_HASH_TRYTES = '9'.repeat(HASH_LENGTH);
const BIP32_PATH = "44'/4218'/0'/0'";
const NOW = () => 1000;

const EXPECTED_RESULTS = {
  address: NULL_HASH_TRYTES,
  version: '0.5.0',
  maxBundleSize: 8,
};

describe('Iota', function () {
  let transport;
  let iota;

  beforeEach(async function () {
    const recordingName = this.currentTest.fullTitle().replace(/[^\w]+/g, '_');
    const recordingFileName = path.join(
      path.resolve(),
      'test',
      'recordings',
      recordingName + '.txt'
    );

    // read only if recording exists
    const recording = fs.existsSync(recordingFileName)
      ? fs.readFileSync(recordingFileName, 'utf-8')
      : '';
    const recordStore = RecordStore.fromString(recording);
    const Transport = createTransportReplayer(recordStore);

    transport = await Transport.open();
    iota = new Iota(transport);
  });

  afterEach(async function () {
    await transport.close();
  });

  describe('#setActiveSeed', function () {
    it('no path', async function () {
      await expect(iota.setActiveSeed()).to.be.rejectedWith(
        Joi.ValidationError
      );
    });

    it('path too short', async function () {
      const path = "0'";
      await expect(iota.setActiveSeed(path)).to.be.rejectedWith(
        Error,
        'length'
      );
    });

    it('path too long', async function () {
      const path = "0'/0'/0'/0'/0'/0'";
      await expect(iota.setActiveSeed(path)).to.be.rejectedWith(
        Error,
        'length'
      );
    });
  });

  describe('#getAddress', function () {
    it('without checksum', async function () {
      await iota.setActiveSeed(BIP32_PATH, 2);
      const address = await iota.getAddress(0);

      expect(address).to.equal(EXPECTED_RESULTS.address);
    });

    it('with checksum', async function () {
      await iota.setActiveSeed(BIP32_PATH, 2);
      const address = await iota.getAddress(0, { checksum: true });

      expect(address).to.equal(addChecksum(EXPECTED_RESULTS.address));
    });

    it('not initialized', async function () {
      await expect(iota.getAddress(0)).to.be.rejectedWith(Error, 'initialized');
    });
  });

  describe('#getAppVersion', function () {
    it('can get version', async function () {
      const version = await iota.getAppVersion();

      expect(version).to.equal(EXPECTED_RESULTS.version);
    });
  });

  describe('#getAppMaxBundleSize', function () {
    it('can get max bundle size', async function () {
      const size = await iota.getAppMaxBundleSize();

      expect(size).to.equal(EXPECTED_RESULTS.maxBundleSize);
    });
  });

  describe('#prepareTransfers', function () {
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
          message: '',
        },
      ];
      const inputs = [
        {
          address: inputAddress,
          keyIndex: inputIndex,
          security,
          balance: 2,
        },
      ];

      return {
        outputs,
        inputs,
        remainder: {
          address: remainderAddress,
          keyIndex: remainderIndex,
        },
      };
    }

    // bundle generation takes longer
    this.slow(600);
    this.timeout(2500);

    this.beforeEach(function () {
      transfers = createTransfers(SECURITY);
    });

    it('not initialized', async function () {
      await expect(
        iota.prepareTransfers(
          transfers.outputs,
          transfers.inputs,
          transfers.remainder
        )
      ).to.be.rejectedWith(Error, 'initialized');
    });

    it('zero-value transaction', async function () {
      transfers.outputs[0].value = 0;
      transfers.inputs[0].balance = 0;

      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      await expect(
        iota.prepareTransfers(transfers.outputs, transfers.inputs)
      ).to.be.rejectedWith(Error);
    });

    it('no input', async function () {
      transfers.outputs[0].value = 0;

      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      await expect(
        iota.prepareTransfers(transfers.outputs, [])
      ).to.be.rejectedWith(Joi.ValidationError);
    });

    it('no output', async function () {
      transfers.inputs[0].balance = 0;

      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      await expect(
        iota.prepareTransfers([], transfers.inputs)
      ).to.be.rejectedWith(Joi.ValidationError);
    });

    it('no remainder', async function () {
      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      await expect(
        iota.prepareTransfers(transfers.outputs, transfers.inputs)
      ).to.be.rejectedWith(Error, 'remainder');
    });

    it('insufficient balance', async function () {
      transfers.outputs[0].value = 2;
      transfers.inputs[0].balance = 1;

      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      await expect(
        iota.prepareTransfers(
          transfers.outputs,
          transfers.inputs,
          transfers.remainder
        )
      ).to.be.rejectedWith(Error, 'balance');
    });

    it('without checksum', async function () {
      const expected = await prepareTransfers(seed, transfers.outputs, {
        inputs: transfers.inputs,
        remainderAddress: transfers.remainder.address,
        SECURITY,
      });

      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      const actual = await iota.prepareTransfers(
        transfers.outputs,
        transfers.inputs,
        transfers.remainder,
        NOW
      );

      expect(actual).to.deep.equal(expected);
    });

    it('with checksum', async function () {
      const expected = await prepareTransfers(seed, transfers.outputs, {
        inputs: transfers.inputs,
        remainderAddress: transfers.remainder.address,
        SECURITY,
      });

      transfers.outputs.forEach((o) => (o.address = addChecksum(o.address)));
      transfers.inputs.forEach((i) => (i.address = addChecksum(i.address)));
      transfers.remainder.address = addChecksum(transfers.remainder.address);

      const outputsClone = transfers.outputs.map((o) => Object.assign({}, o));
      const inputsClone = transfers.inputs.map((i) => Object.assign({}, i));

      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      const actual = await iota.prepareTransfers(
        transfers.outputs,
        transfers.inputs,
        transfers.remainder,
        NOW
      );

      expect(actual).to.deep.equal(expected);

      // the transfer objects must not have changed
      expect(transfers.outputs).to.deep.equal(outputsClone);
      expect(transfers.inputs).to.deep.equal(inputsClone);
    });

    it('with tags', async function () {
      const expected = await prepareTransfers(seed, transfers.outputs, {
        inputs: transfers.inputs,
        remainderAddress: transfers.remainder.address,
        SECURITY,
      });

      const inputs = transfers.inputs.map((i) => ({ ...i, tags: ['', ''] }));
      const remainder = { ...transfers.remainder, tag: '' };

      await iota.setActiveSeed(BIP32_PATH, SECURITY);
      const actual = await iota.prepareTransfers(
        transfers.outputs,
        inputs,
        remainder,
        NOW
      );

      expect(actual).to.deep.equal(expected);
    });
  });
});
