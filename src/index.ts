import Struct from "struct";
import bippath from "bip32-path";
import bech32 from "bech32";
import { getErrorMessage } from "./error";
import Transport from "@ledgerhq/hw-transport";
import { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import {
  CLA,
  ADPUInstructions,
  TIMEOUT_CMD_NON_USER_INTERACTION,
  TIMEOUT_CMD_USER_INTERACTION,
  Flows,
  ED25519_PUBLIC_KEY_LENGTH,
  ED25519_SIGNATURE_LENGTH,
  AppModes,
} from "./constants";

/**
 * IOTA API
 * @module hw-app-iota
 */

interface AddressOptions {
  prefix: string;
  display: boolean;
}

/**
 * Class for the interaction with the Ledger IOTA application.
 *
 * @example
 * import Iota from "hw-app-iota";
 * const iota = new Iota(transport);
 */
class Iota {
  transport: Transport;
  constructor(transport: Transport) {
    transport.decorateAppAPIMethods(
      this,
      ["getAppVersion", "getAddres"],
      "IOTA"
    );
    this.transport = transport;
  }

  /**
   * Retrieves version information about the installed application from the device.
   *
   * @returns {Promise<String>} Semantic Version string (i.e. MAJOR.MINOR.PATCH)
   **/
  async getAppVersion(): Promise<string> {
    const config = await this._getAppConfig();
    return config.app_version;
  }

  /**
   * Generates an address index-based.
   * The result depends on the initalized seed and security level.
   *
   * @param {String} path - String representation of the BIP32 path with exactly 5 levels.
   * @param {Object} [options]
   * @param {Boolean} [options.display=false] - Display generated address on display
   * @param {Boolean} [options.prefix='iota'] - Bech32 prefix
   * @returns {Promise<String>} Tryte-encoded address
   * @example
   * iota.getAddress(0, { prefix: 'atoi' });
   **/
  async getAddress(
    path: string,
    currency: CryptoCurrency,
    options: AddressOptions = {
      display: false,
      prefix: currency.units[0].name.toLowerCase(),
    }
  ): Promise<string> {
    const pathArray = Iota._validatePath(path);

    await this._setAccount(pathArray[0], currency);
    await this._generateAddress(pathArray[1], pathArray[2], 1, options.display);
    const addressData = await this._getData();
    return bech32.encode(options.prefix, bech32.toWords(addressData));
  }

  ///////// Private methods should not be called directly! /////////

  static _validatePath(path: string): string | any[] {
    let pathArray: string | any[];
    try {
      pathArray = bippath.fromString(path).toPathArray();
    } catch (e: any) {
      throw new Error('"path" invalid: ' + e.message);
    }

    if (!pathArray || pathArray.length != 3) {
      throw new Error(
        `"path" invalid: Invalid path length: ${pathArray.length}`
      );
    }

    return pathArray;
  }

  async _setAccount(account: any, currency: CryptoCurrency): Promise<void> {
    const setAccountInStruct = Struct().word32Ule("account") as any;

    setAccountInStruct.allocate();
    setAccountInStruct.fields.account = account;

    let app_mode: number;
    switch (currency.id) {
      case "iota":
        app_mode = AppModes.ModeIOTAStardust;
        break;
      case "shimmer":
        app_mode = AppModes.ModeShimmer;
        break;
      default:
        throw new Error("packable error: " + "IncorrectP1P2");
    }

    await this._sendCommand(
      ADPUInstructions.INS_SET_ACCOUNT,
      app_mode,
      0,
      setAccountInStruct.buffer(),
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _getDataBufferState(): Promise<{
    data_length: number;
    data_type: any;
    data_block_size: number;
    data_block_count: any;
  }> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_GET_DATA_BUFFER_STATE,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const getDataBufferStateOutStruct = Struct()
      .word16Ule("data_length")
      .word8("data_type")
      .word8("data_block_size")
      .word8("data_block_count") as any;
    getDataBufferStateOutStruct.setBuffer(response);

    const fields = getDataBufferStateOutStruct.fields;
    return {
      data_length: fields.data_length as number,
      data_type: fields.data_type,
      data_block_size: fields.data_block_size as number,
      data_block_count: fields.data_block_count,
    };
  }

  async _readDataBlock({
    block,
    size,
  }: {
    block: number;
    size: number;
  }): Promise<Uint8Array> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_READ_DATA_BLOCK,
      block,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const readDataBlockOutStruct = Struct().array("data", size, "word8") as any;
    readDataBlockOutStruct.setBuffer(response);
    const fields = readDataBlockOutStruct.fields;

    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = fields.data[i];
    }
    return data;
  }

  async _writeDataBlock(blockNr: number, data: any): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_PREPARE_SIGNING,
      blockNr,
      0,
      data,
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _getData(): Promise<Uint8Array> {
    const state = await this._getDataBufferState();

    const blocks = Math.ceil(state.data_length / state.data_block_size);
    const data = new Uint8Array(blocks * state.data_block_size);

    let offset = 0;
    for (let i = 0; i < blocks; i++) {
      const block = await this._readDataBlock({
        block: i,
        size: state.data_block_size,
      });
      data.set(block, offset);
      offset += block.length;
    }
    return data.subarray(0, state.data_length);
  }

  async _showMainFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowMainMenu,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showGeneratingAddressesFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowGeneratingAddresses,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showGenericErrorFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowGenericError,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showRejectedFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowRejected,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showSignedSuccessfullyFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowSignedSuccessfully,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showSigningFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowSigning,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _prepareSigning(
    p2: number,
    ramainderIdx: number,
    bip32Idx: number,
    bip32Change: number
  ): Promise<void> {
    const prepareSigningInStruct = Struct()
      .word32Ule("remainder_index")
      .word32Ule("remainder_bip32_index")
      .word32Ule("remainder_bip32_change") as any;

    prepareSigningInStruct.allocate();
    prepareSigningInStruct.fields.bip32_index = ramainderIdx;
    prepareSigningInStruct.fields.remainder_bip32_index = bip32Idx;
    prepareSigningInStruct.fields.remainder_bip32_change = bip32Change;

    await this._sendCommand(
      ADPUInstructions.INS_PREPARE_SIGNING,
      1,
      p2,
      prepareSigningInStruct.buffer(),
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _generateAddress(
    change: any,
    index: any,
    count: number,
    display = false
  ): Promise<void> {
    const generateAddressInStruct = Struct()
      .word32Ule("bip32_index")
      .word32Ule("bip32_change")
      .word32Ule("count") as any;

    generateAddressInStruct.allocate();
    generateAddressInStruct.fields.bip32_index = index;
    generateAddressInStruct.fields.bip32_change = change;
    generateAddressInStruct.fields.count = count;

    await this._sendCommand(
      ADPUInstructions.INS_GEN_ADDRESS,
      display ? 0x01 : 0x00,
      0,
      generateAddressInStruct.buffer(),
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _userConfirmEssence(): Promise<void> {
    this._sendCommand(
      ADPUInstructions.INS_USER_CONFIRM_ESSENCE,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _signSingle(index: number): Promise<any> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_SIGN_SINGLE,
      index,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
    const signatureType = response.at(0);
    const data = Struct();
    switch (signatureType) {
      case 0:
        data
          .word8("signature_type")
          .word8("unknown") // TODO: replace with correct block name
          .array("ed25519_public_key", ED25519_PUBLIC_KEY_LENGTH, "word8")
          .array("ed25519_signature", ED25519_SIGNATURE_LENGTH, "word8");
        break;
      case 1:
        data.word8("signature_type").array("reference", 2, "word8");
        break;
      default:
        throw new Error("packable error: " + "Invalid variant");
    }
    return data;
  }

  async _getAppConfig(): Promise<{
    app_version: string;
    app_flags: any;
    device: any;
    debug: any;
  }> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_GET_APP_CONFIG,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const getAppConfigOutStruct = Struct()
      .word8("app_version_major")
      .word8("app_version_minor")
      .word8("app_version_patch")
      .word8("app_flags")
      .word8("device")
      .word8("debug") as any;
    getAppConfigOutStruct.setBuffer(response);

    const fields = getAppConfigOutStruct.fields;
    return {
      app_version:
        fields.app_version_major +
        "." +
        fields.app_version_minor +
        "." +
        fields.app_version_patch,
      app_flags: fields.app_flags,
      device: fields.device,
      debug: fields.debug,
    };
  }

  async _reset(partial = false): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_RESET,
      partial ? 1 : 0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _sendCommand(
    ins: number,
    p1: number,
    p2: number,
    data: undefined,
    timeout: number
  ): Promise<any> {
    const transport = this.transport;
    try {
      transport.setExchangeTimeout(timeout);
      return await transport.send(CLA, ins, p1, p2, data);
    } catch (error: any) {
      // update the message, if status code is present
      if (error.statusCode) {
        error.message = getErrorMessage(error.statusCode) || error.message;
      }
      throw error;
    }
  }
}

export default Iota;

export { TIMEOUT_CMD_NON_USER_INTERACTION, ADPUInstructions };
