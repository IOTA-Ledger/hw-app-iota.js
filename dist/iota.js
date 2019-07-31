"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _struct = _interopRequireDefault(require("struct"));

var _bundle = _interopRequireDefault(require("iota.lib.js/lib/crypto/bundle/bundle"));

var _utils = require("iota.lib.js/lib/utils/utils");

var _bip32Path = _interopRequireDefault(require("bip32-path"));

var _semver = _interopRequireDefault(require("semver"));

var inputValidator = _interopRequireWildcard(require("./input_validator"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/**
 * IOTA API
 * @module hw-app-iota
 */
var CLA = 0x7a;
var Commands = {
  // specific timeouts:
  INS_SET_SEED: 0x01,
  // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_PUBKEY: 0x02,
  // TIMEOUT_CMD_PUBKEY
  INS_TX: 0x03,
  // TIMEOUT_CMD_NON_USER_INTERACTION => TIMEOUT_CMD_USER_INTERACTION (IF cur_idx == lst_idx)
  INS_SIGN: 0x04,
  // TIMEOUT_CMD_PUBKEY
  INS_GET_APP_CONFIG: 0x10,
  // TIMEOUT_CMD_NON_USER_INTERACTION
  INS_RESET: 0xff // TIMEOUT_CMD_NON_USER_INTERACTION

};
var TIMEOUT_CMD_PUBKEY = 10000;
var TIMEOUT_CMD_NON_USER_INTERACTION = 10000;
var TIMEOUT_CMD_USER_INTERACTION = 150000;
var LEGACY_VERSION_RANGE = '<0.5';
var HASH_LENGTH = 81;
var TAG_LENGTH = 27;
var SIGNATURE_FRAGMENT_SLICE_LENGTH = 3 * HASH_LENGTH;
var EMPTY_TAG = '9'.repeat(TAG_LENGTH);
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
    case 0x9000:
      // SW_OK
      return 'Success';

    case 0x6700:
      // SW_INCORRECT_LENGTH
      return 'Incorrect input length';

    case 0x6a80:
      // SW_COMMAND_INVALID_DATA
      return 'Incorrect data';

    case 0x6b00:
      // SW_INCORRECT_P1P2
      return 'Incorrect command parameter';

    case 0x6c00:
      // SW_INCORRECT_LENGTH_P3
      return 'Incorrect length specified in header';

    case 0x6d00:
      // SW_INS_NOT_SUPPORTED
      return 'Invalid INS command';

    case 0x6e00:
      // SW_CLA_NOT_SUPPORTED
      return 'Incorrect CLA (Wrong application opened)';

    case 0x6900:
      // SW_COMMAND_NOT_ALLOWED
      return 'Command not allowed (Command out of order)';

    case 0x6982:
      // SW_SECURITY_STATUS_NOT_SATISFIED
      return 'Security not satisfied (Device locked)';

    case 0x6985:
      // SW_CONDITIONS_OF_USE_NOT_SATISFIED
      return 'Condition of use not satisfied (Denied by the user)';

    case 0x6401:
      // SW_COMMAND_TIMEOUT
      return 'Security not satisfied (Timeout exceeded)';

    case 0x69a1:
      // SW_BUNDLE_ERROR + INSECURE HASH
      return 'Bundle error (Insecure hash)';

    case 0x69a2:
      // SW_BUNDLE_ERROR + NON-ZERO BALANCE
      return 'Bundle error (Non zero balance)';

    case 0x69a3:
      // SW_BUNDLE_ERROR + INVALID META TX
      return 'Bundle error (Invalid meta transaction)';

    case 0x69a4:
      // SW_BUNDLE_ERROR + INVALID ADDRESS INDEX
      return 'Bundle error (Invalid input address/index pair(s))';

    case 0x69a5:
      // SW_BUNDLE_ERROR + ADDRESS REUSED
      return 'Bundle error (Address reused)';
    // Legacy exceptions

    case 0x6984:
      // SW_COMMAND_INVALID_DATA
      return 'Invalid input data';

    case 0x6986:
      // SW_APP_NOT_INITIALIZED
      return 'App has not been initialized by user';

    case 0x6991:
      // SW_TX_INVALID_INDEX
      return 'Invalid transaction index';

    case 0x6992:
      // SW_TX_INVALID_ORDER
      return 'Invalid transaction order (Output, Inputs, Change)';

    case 0x6993:
      // SW_TX_INVALID_META
      return 'Invalid meta transaction';

    case 0x6994:
      // SW_TX_INVALID_OUTPUT
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


var Iota =
/*#__PURE__*/
function () {
  function Iota(transport) {
    (0, _classCallCheck2["default"])(this, Iota);
    this.transport = transport;
    this.config = undefined;
    this.security = 0;
    this.pathArray = undefined;
    transport.decorateAppAPIMethods(this, ['setActiveSeed', 'getAddress', 'prepareTransfers', 'getAppVersion', 'getAppMaxBundleSize'], 'IOT');
  }
  /**
   * Prepares the IOTA seed to be used for subsequent calls.
   *
   * @param {String} path - String representation of the BIP32 path. At most 5 levels.
   * @param {Number} [security=2] - IOTA security level to use
   * @example
   * iota.setActiveSeed("44'/4218'/0'/0'", 2);
   **/


  (0, _createClass2["default"])(Iota, [{
    key: "setActiveSeed",
    value: function () {
      var _setActiveSeed = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee(path) {
        var security,
            pathArray,
            _args = arguments;
        return _regenerator["default"].wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                security = _args.length > 1 && _args[1] !== undefined ? _args[1] : 2;

                if (_bip32Path["default"].validateString(path)) {
                  _context.next = 3;
                  break;
                }

                throw new Error('Invalid BIP32 path string');

              case 3:
                pathArray = _bip32Path["default"].fromString(path).toPathArray();

                if (!(!pathArray || pathArray.length < 2 || pathArray.length > 5)) {
                  _context.next = 6;
                  break;
                }

                throw new Error('Invalid BIP32 path length');

              case 6:
                if (inputValidator.isSecurity(security)) {
                  _context.next = 8;
                  break;
                }

                throw new Error('Invalid security level provided');

              case 8:
                this.pathArray = pathArray;
                this.security = security; // query the app config, if not present

                if (!this.config) {
                  _context.next = 14;
                  break;
                }

                _context.t0 = this.config;
                _context.next = 17;
                break;

              case 14:
                _context.next = 16;
                return this._getAppConfig();

              case 16:
                _context.t0 = _context.sent;

              case 17:
                this.config = _context.t0;

                if (!_semver["default"].satisfies(this.config.app_version, LEGACY_VERSION_RANGE)) {
                  _context.next = 25;
                  break;
                }

                // use legacy structs
                this._createPubkeyInput = this._createPubkeyInputLegacy;
                this._createTxInput = this._createTxInputLegacy;
                _context.next = 23;
                return this._setSeed();

              case 23:
                _context.next = 27;
                break;

              case 25:
                _context.next = 27;
                return this._reset(true);

              case 27:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function setActiveSeed(_x) {
        return _setActiveSeed.apply(this, arguments);
      }

      return setActiveSeed;
    }()
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

  }, {
    key: "getAddress",
    value: function () {
      var _getAddress = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee2(index) {
        var options,
            address,
            _args2 = arguments;
        return _regenerator["default"].wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                options = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : {};

                if (this.security) {
                  _context2.next = 3;
                  break;
                }

                throw new Error('Seed not yet initalized');

              case 3:
                if (inputValidator.isIndex(index)) {
                  _context2.next = 5;
                  break;
                }

                throw new Error('Invalid Index provided');

              case 5:
                options.checksum = options.checksum || false;
                options.display = options.display || false;
                _context2.next = 9;
                return this._publicKey(index, options.display);

              case 9:
                address = _context2.sent;

                if (!options.checksum) {
                  _context2.next = 12;
                  break;
                }

                return _context2.abrupt("return", (0, _utils.addChecksum)(address));

              case 12:
                return _context2.abrupt("return", address);

              case 13:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getAddress(_x2) {
        return _getAddress.apply(this, arguments);
      }

      return getAddress;
    }()
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

  }, {
    key: "prepareTransfers",
    value: function () {
      var _prepareTransfers2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee3(transfers, inputs, remainder) {
        var now,
            balance,
            payment,
            trytes,
            _args3 = arguments;
        return _regenerator["default"].wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                now = _args3.length > 3 && _args3[3] !== undefined ? _args3[3] : function () {
                  return Date.now();
                };

                if (this.security) {
                  _context3.next = 3;
                  break;
                }

                throw new Error('Seed not yet initalized');

              case 3:
                if (inputValidator.isTransfersArray(transfers)) {
                  _context3.next = 5;
                  break;
                }

                throw new Error('Invalid transfers array provided');

              case 5:
                if (inputValidator.isInputsArray(inputs)) {
                  _context3.next = 7;
                  break;
                }

                throw new Error('Invalid inputs array provided');

              case 7:
                // filter unnecessary inputs
                inputs = inputs.filter(function (input) {
                  return input.balance > 0;
                });

                if (!(inputs.length < 1)) {
                  _context3.next = 10;
                  break;
                }

                throw new Error('At least one input required');

              case 10:
                if (!(transfers.length > 1)) {
                  _context3.next = 12;
                  break;
                }

                throw new Error('Unsupported number of transfers');

              case 12:
                balance = inputs.reduce(function (a, i) {
                  return a + i.balance;
                }, 0);
                payment = transfers.reduce(function (a, t) {
                  return a + t.value;
                }, 0);

                if (!(balance === payment)) {
                  _context3.next = 18;
                  break;
                }

                // ignore the remainder, if there is no change
                remainder = undefined;
                _context3.next = 20;
                break;

              case 18:
                if (remainder) {
                  _context3.next = 20;
                  break;
                }

                throw new Error('Remainder object required');

              case 20:
                if (!remainder) {
                  _context3.next = 24;
                  break;
                }

                if (inputValidator.isRemainderObject(remainder)) {
                  _context3.next = 23;
                  break;
                }

                throw new Error('Invalid remainder object provided');

              case 23:
                remainder = {
                  address: remainder.address,
                  value: balance - payment,
                  keyIndex: remainder.keyIndex
                };

              case 24:
                _context3.next = 26;
                return this._prepareTransfers(transfers, inputs, remainder, now);

              case 26:
                trytes = _context3.sent;
                _context3.next = 29;
                return this._reset(true);

              case 29:
                return _context3.abrupt("return", trytes);

              case 30:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function prepareTransfers(_x3, _x4, _x5) {
        return _prepareTransfers2.apply(this, arguments);
      }

      return prepareTransfers;
    }()
    /**
     * Retrieves version information about the installed application from the device.
     *
     * @returns {Promise<String>} Semantic Version string (i.e. MAJOR.MINOR.PATCH)
     **/

  }, {
    key: "getAppVersion",
    value: function () {
      var _getAppVersion = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee4() {
        var config;
        return _regenerator["default"].wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return this._getAppConfig();

              case 2:
                config = _context4.sent;
                // update the stored config
                this.config = config;
                return _context4.abrupt("return", config.app_version);

              case 5:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function getAppVersion() {
        return _getAppVersion.apply(this, arguments);
      }

      return getAppVersion;
    }()
    /**
     * Retrieves the largest supported number of transactions (including meta transactions)
     * in one transfer bundle from the device.
     *
     * @returns {Promise<Integer>} Maximum bundle size
     **/

  }, {
    key: "getAppMaxBundleSize",
    value: function () {
      var _getAppMaxBundleSize = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee5() {
        var config;
        return _regenerator["default"].wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this._getAppConfig();

              case 2:
                config = _context5.sent;
                // update the stored config
                this.config = config; // return value from config or default 8

                return _context5.abrupt("return", config.app_max_bundle_size ? config.app_max_bundle_size : 8);

              case 5:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function getAppMaxBundleSize() {
        return _getAppMaxBundleSize.apply(this, arguments);
      }

      return getAppMaxBundleSize;
    }() ///////// Private methods should not be called directly! /////////

  }, {
    key: "_addSeedFields",
    value: function _addSeedFields(struct) {
      return struct.word8('security').word32Ule('pathLength').array('pathArray', this.pathArray.length, 'word32Ule');
    }
  }, {
    key: "_initSeedFields",
    value: function _initSeedFields(struct) {
      var fields = struct.fields;
      fields.security = this.security;
      fields.pathLength = this.pathArray.length;
      fields.pathArray = this.pathArray;
    }
  }, {
    key: "_setSeed",
    value: function () {
      var _setSeed2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee6() {
        var setSeedInStruct;
        return _regenerator["default"].wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                setSeedInStruct = new _struct["default"]();

                this._addSeedFields(setSeedInStruct);

                setSeedInStruct.allocate();

                this._initSeedFields(setSeedInStruct);

                _context6.next = 6;
                return this._sendCommand(Commands.INS_SET_SEED, 0, 0, setSeedInStruct.buffer(), TIMEOUT_CMD_NON_USER_INTERACTION);

              case 6:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function _setSeed() {
        return _setSeed2.apply(this, arguments);
      }

      return _setSeed;
    }()
  }, {
    key: "_createPubkeyInputLegacy",
    value: function _createPubkeyInputLegacy(index) {
      var struct = new _struct["default"]();
      struct = struct.word32Ule('index');
      struct.allocate();
      struct.fields.index = index;
      return struct;
    }
  }, {
    key: "_createPubkeyInput",
    value: function _createPubkeyInput(index) {
      var struct = new _struct["default"]();

      this._addSeedFields(struct);

      struct = struct.word32Ule('index');
      struct.allocate();

      this._initSeedFields(struct);

      struct.fields.index = index;
      return struct;
    }
  }, {
    key: "_publicKey",
    value: function () {
      var _publicKey2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee7(index, display) {
        var pubkeyInStruct, response, pubkeyOutStruct;
        return _regenerator["default"].wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                pubkeyInStruct = this._createPubkeyInput(index);
                _context7.next = 3;
                return this._sendCommand(Commands.INS_PUBKEY, display ? 0x01 : 0x00, 0, pubkeyInStruct.buffer(), TIMEOUT_CMD_PUBKEY);

              case 3:
                response = _context7.sent;
                pubkeyOutStruct = new _struct["default"]().chars('address', HASH_LENGTH);
                pubkeyOutStruct.setBuffer(response);
                return _context7.abrupt("return", pubkeyOutStruct.fields.address);

              case 7:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function _publicKey(_x6, _x7) {
        return _publicKey2.apply(this, arguments);
      }

      return _publicKey;
    }()
  }, {
    key: "_sign",
    value: function () {
      var _sign2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee8(index, sliceLength) {
        var signInStruct, response, signOutStruct;
        return _regenerator["default"].wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                signInStruct = new _struct["default"]().word32Ule('index');
                signInStruct.allocate();
                signInStruct.fields.index = index;
                _context8.next = 5;
                return this._sendCommand(Commands.INS_SIGN, 0, 0, signInStruct.buffer(), TIMEOUT_CMD_PUBKEY);

              case 5:
                response = _context8.sent;
                signOutStruct = new _struct["default"]().chars('signature', sliceLength).word8Sle('fragmentsRemaining');
                signOutStruct.setBuffer(response);
                return _context8.abrupt("return", {
                  signature: signOutStruct.fields.signature,
                  fragmentsRemaining: signOutStruct.fields.fragmentsRemaining
                });

              case 9:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function _sign(_x8, _x9) {
        return _sign2.apply(this, arguments);
      }

      return _sign;
    }()
  }, {
    key: "_createTxInputLegacy",
    value: function _createTxInputLegacy(address, address_idx, value, tag, tx_idx, tx_len, time) {
      var struct = new _struct["default"]();
      struct = struct.chars('address', HASH_LENGTH).word32Ule('address_idx').word64Sle('value').chars('tag', TAG_LENGTH).word32Ule('tx_idx').word32Ule('tx_len').word32Ule('time');
      struct.allocate();
      var fields = struct.fields;
      fields.address = address;
      fields.address_idx = address_idx;
      fields.value = value;
      fields.tag = tag;
      fields.tx_idx = tx_idx;
      fields.tx_len = tx_len;
      fields.time = time;
      return struct;
    }
  }, {
    key: "_createTxInput",
    value: function _createTxInput(address, address_idx, value, tag, tx_idx, tx_len, time) {
      var struct = new _struct["default"]();

      if (tx_idx == 0) {
        this._addSeedFields(struct);
      }

      struct = struct.chars('address', HASH_LENGTH).word32Ule('address_idx').word64Sle('value').chars('tag', TAG_LENGTH).word32Ule('tx_idx').word32Ule('tx_len').word32Ule('time');
      struct.allocate();

      if (tx_idx == 0) {
        this._initSeedFields(struct);
      }

      var fields = struct.fields;
      fields.address = address;
      fields.address_idx = address_idx;
      fields.value = value;
      fields.tag = tag;
      fields.tx_idx = tx_idx;
      fields.tx_len = tx_len;
      fields.time = time;
      return struct;
    }
  }, {
    key: "_transaction",
    value: function () {
      var _transaction2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee9(address, address_idx, value, tag, tx_idx, tx_len, time) {
        var txInStruct, timeout, response, txOutStruct;
        return _regenerator["default"].wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                txInStruct = this._createTxInput(address, address_idx, value, tag, tx_idx, tx_len, time);
                timeout = TIMEOUT_CMD_NON_USER_INTERACTION;

                if (tx_idx == tx_len) {
                  timeout = TIMEOUT_CMD_USER_INTERACTION;
                }

                _context9.next = 5;
                return this._sendCommand(Commands.INS_TX, tx_idx == 0 ? 0x00 : 0x80, 0, txInStruct.buffer(), timeout);

              case 5:
                response = _context9.sent;
                txOutStruct = new _struct["default"]().word8('finalized').chars('bundleHash', HASH_LENGTH);
                txOutStruct.setBuffer(response);
                return _context9.abrupt("return", {
                  finalized: txOutStruct.fields.finalized,
                  bundleHash: txOutStruct.fields.bundleHash
                });

              case 9:
              case "end":
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function _transaction(_x10, _x11, _x12, _x13, _x14, _x15, _x16) {
        return _transaction2.apply(this, arguments);
      }

      return _transaction;
    }()
  }, {
    key: "_getSignatureFragments",
    value: function () {
      var _getSignatureFragments2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee10(index, sliceLength) {
        var numSlices, signature, i, result;
        return _regenerator["default"].wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                numSlices = this.security * 2187 / sliceLength;
                signature = '';
                i = 1;

              case 3:
                if (!(i <= numSlices)) {
                  _context10.next = 13;
                  break;
                }

                _context10.next = 6;
                return this._sign(index, sliceLength);

              case 6:
                result = _context10.sent;
                signature += result.signature; // the remaining fragments must match the num slices

                if (!(i === numSlices != (result.fragmentsRemaining === 0))) {
                  _context10.next = 10;
                  break;
                }

                throw new Error('Wrong signture length');

              case 10:
                i++;
                _context10.next = 3;
                break;

              case 13:
                return _context10.abrupt("return", signature.match(/.{2187}/g));

              case 14:
              case "end":
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function _getSignatureFragments(_x17, _x18) {
        return _getSignatureFragments2.apply(this, arguments);
      }

      return _getSignatureFragments;
    }()
  }, {
    key: "_addSignatureFragmentsToBundle",
    value: function () {
      var _addSignatureFragmentsToBundle2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee11(bundle) {
        var i, address, signatureFragments, j, tx;
        return _regenerator["default"].wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                i = 0;

              case 1:
                if (!(i < bundle.bundle.length)) {
                  _context11.next = 21;
                  break;
                }

                if (!(bundle.bundle[i].value >= 0)) {
                  _context11.next = 4;
                  break;
                }

                return _context11.abrupt("continue", 18);

              case 4:
                address = bundle.bundle[i].address;
                _context11.next = 7;
                return this._getSignatureFragments(i, SIGNATURE_FRAGMENT_SLICE_LENGTH);

              case 7:
                signatureFragments = _context11.sent;
                bundle.bundle[i].signatureMessageFragment = signatureFragments.shift(); // set the signature fragments for all successive meta transactions

                j = 1;

              case 10:
                if (!(j < this.security)) {
                  _context11.next = 18;
                  break;
                }

                if (!(++i >= bundle.bundle.length)) {
                  _context11.next = 13;
                  break;
                }

                return _context11.abrupt("return");

              case 13:
                tx = bundle.bundle[i];

                if (tx.address === address && tx.value === 0) {
                  tx.signatureMessageFragment = signatureFragments.shift();
                }

              case 15:
                j++;
                _context11.next = 10;
                break;

              case 18:
                i++;
                _context11.next = 1;
                break;

              case 21:
              case "end":
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function _addSignatureFragmentsToBundle(_x19) {
        return _addSignatureFragmentsToBundle2.apply(this, arguments);
      }

      return _addSignatureFragmentsToBundle;
    }()
  }, {
    key: "_signBundle",
    value: function () {
      var _signBundle2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee12(bundle, addressKeyIndices) {
        var finalized, bundleHash, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, tx, keyIndex, result;

        return _regenerator["default"].wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                finalized = false;
                bundleHash = '';
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context12.prev = 5;
                _iterator = bundle.bundle[Symbol.iterator]();

              case 7:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context12.next = 18;
                  break;
                }

                tx = _step.value;
                keyIndex = addressKeyIndices[tx.address] ? addressKeyIndices[tx.address] : 0;
                _context12.next = 12;
                return this._transaction(tx.address, keyIndex, tx.value, tx.obsoleteTag, tx.currentIndex, tx.lastIndex, tx.timestamp);

              case 12:
                result = _context12.sent;
                finalized = result.finalized;
                bundleHash = result.bundleHash;

              case 15:
                _iteratorNormalCompletion = true;
                _context12.next = 7;
                break;

              case 18:
                _context12.next = 24;
                break;

              case 20:
                _context12.prev = 20;
                _context12.t0 = _context12["catch"](5);
                _didIteratorError = true;
                _iteratorError = _context12.t0;

              case 24:
                _context12.prev = 24;
                _context12.prev = 25;

                if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                  _iterator["return"]();
                }

              case 27:
                _context12.prev = 27;

                if (!_didIteratorError) {
                  _context12.next = 30;
                  break;
                }

                throw _iteratorError;

              case 30:
                return _context12.finish(27);

              case 31:
                return _context12.finish(24);

              case 32:
                if (finalized) {
                  _context12.next = 34;
                  break;
                }

                throw new Error('Bundle not finalized');

              case 34:
                if (!(bundleHash !== bundle.bundle[0].bundle)) {
                  _context12.next = 36;
                  break;
                }

                throw new Error('Wrong bundle hash');

              case 36:
                _context12.next = 38;
                return this._addSignatureFragmentsToBundle(bundle);

              case 38:
                return _context12.abrupt("return", bundle);

              case 39:
              case "end":
                return _context12.stop();
            }
          }
        }, _callee12, this, [[5, 20, 24, 32], [25,, 27, 31]]);
      }));

      function _signBundle(_x20, _x21) {
        return _signBundle2.apply(this, arguments);
      }

      return _signBundle;
    }()
  }, {
    key: "_hasDuplicateAddresses",
    value: function _hasDuplicateAddresses(transfers, inputs, remainder) {
      var set = new Set();
      transfers.forEach(function (t) {
        return set.add(t.address);
      });
      inputs.forEach(function (i) {
        return set.add(i.address);
      });

      if (remainder && set.has(remainder.address)) {
        return true;
      }

      return set.length === transfers.length + inputs.length;
    }
  }, {
    key: "_prepareTransfers",
    value: function () {
      var _prepareTransfers3 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee13(transfers, inputs, remainder, now) {
        var _this = this;

        var timestamp, bundle, addressKeyIndices, bundleTrytes;
        return _regenerator["default"].wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                transfers = transfers.map(function (t) {
                  return _objectSpread({}, t, {
                    // remove checksum
                    address: (0, _utils.noChecksum)(t.address),
                    // pad tag
                    tag: t.tag ? t.tag.padEnd(TAG_LENGTH, '9') : EMPTY_TAG
                  });
                });
                inputs = inputs.map(function (i) {
                  return _objectSpread({}, i, {
                    // remove checksum
                    address: (0, _utils.noChecksum)(i.address),
                    // set correct security level
                    security: _this.security
                  });
                });

                if (remainder) {
                  // remove checksum
                  remainder = _objectSpread({}, remainder, {
                    address: (0, _utils.noChecksum)(remainder.address)
                  });
                }

                if (!this._hasDuplicateAddresses(transfers, inputs, remainder)) {
                  _context13.next = 5;
                  break;
                }

                throw new Error('transaction must not contain duplicate addresses');

              case 5:
                // use the current time
                timestamp = Math.floor(now() / 1000);
                bundle = new _bundle["default"]();
                transfers.forEach(function (t) {
                  return bundle.addEntry(1, t.address, t.value, t.tag, timestamp, -1);
                });
                inputs.forEach(function (i) {
                  return bundle.addEntry(i.security, i.address, -i.balance, EMPTY_TAG, timestamp, i.keyIndex);
                });

                if (remainder) {
                  bundle.addEntry(1, remainder.address, remainder.value, EMPTY_TAG, timestamp, remainder.keyIndex);
                }

                bundle.addTrytes([]);
                bundle.finalize(); // map internal addresses to their index

                addressKeyIndices = {};
                inputs.forEach(function (i) {
                  return addressKeyIndices[i.address] = i.keyIndex;
                });

                if (remainder) {
                  addressKeyIndices[remainder.address] = remainder.keyIndex;
                } // sign the bundle on the ledger


                _context13.next = 17;
                return this._signBundle(bundle, addressKeyIndices);

              case 17:
                bundle = _context13.sent;
                // compute and return the corresponding trytes
                bundleTrytes = [];
                bundle.bundle.forEach(function (tx) {
                  return bundleTrytes.push((0, _utils.transactionTrytes)(tx));
                });
                return _context13.abrupt("return", bundleTrytes.reverse());

              case 21:
              case "end":
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function _prepareTransfers(_x22, _x23, _x24, _x25) {
        return _prepareTransfers3.apply(this, arguments);
      }

      return _prepareTransfers;
    }()
  }, {
    key: "_createAppConfigOutputLegacy",
    value: function _createAppConfigOutputLegacy() {
      var struct = new _struct["default"]().word8('app_flags').word8('app_version_major').word8('app_version_minor').word8('app_version_patch');
      return struct;
    }
  }, {
    key: "_createAppConfigOutput",
    value: function _createAppConfigOutput() {
      var struct = new _struct["default"]().word8('app_version_major').word8('app_version_minor').word8('app_version_patch').word8('app_max_bundle_size').word8('app_flags');
      return struct;
    }
  }, {
    key: "_getAppConfig",
    value: function () {
      var _getAppConfig2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee14() {
        var response, getAppConfigOutStruct, fields;
        return _regenerator["default"].wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _context14.next = 2;
                return this._sendCommand(Commands.INS_GET_APP_CONFIG, 0, 0, undefined, TIMEOUT_CMD_NON_USER_INTERACTION);

              case 2:
                response = _context14.sent;
                getAppConfigOutStruct = this._createAppConfigOutput(); // check whether the response matches the struct plus 2 bytes status code

                if (response.length < getAppConfigOutStruct.length() + 2) {
                  getAppConfigOutStruct = this._createAppConfigOutputLegacy();
                }

                getAppConfigOutStruct.setBuffer(response);
                fields = getAppConfigOutStruct.fields;
                return _context14.abrupt("return", {
                  app_max_bundle_size: fields.app_max_bundle_size,
                  app_flags: fields.app_flags,
                  app_version: fields.app_version_major + '.' + fields.app_version_minor + '.' + fields.app_version_patch
                });

              case 8:
              case "end":
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function _getAppConfig() {
        return _getAppConfig2.apply(this, arguments);
      }

      return _getAppConfig;
    }()
  }, {
    key: "_reset",
    value: function () {
      var _reset2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee15() {
        var partial,
            _args15 = arguments;
        return _regenerator["default"].wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                partial = _args15.length > 0 && _args15[0] !== undefined ? _args15[0] : false;
                _context15.next = 3;
                return this._sendCommand(Commands.INS_RESET, partial ? 1 : 0, 0, undefined, TIMEOUT_CMD_NON_USER_INTERACTION);

              case 3:
              case "end":
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function _reset() {
        return _reset2.apply(this, arguments);
      }

      return _reset;
    }()
  }, {
    key: "_sendCommand",
    value: function () {
      var _sendCommand2 = (0, _asyncToGenerator2["default"])(
      /*#__PURE__*/
      _regenerator["default"].mark(function _callee16(ins, p1, p2, data, timeout) {
        var transport, smsg, statusCodeStr;
        return _regenerator["default"].wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                transport = this.transport;
                _context16.prev = 1;
                transport.setExchangeTimeout(timeout);
                _context16.next = 5;
                return transport.send(CLA, ins, p1, p2, data);

              case 5:
                return _context16.abrupt("return", _context16.sent);

              case 8:
                _context16.prev = 8;
                _context16.t0 = _context16["catch"](1);
                // set the message according to the status code
                smsg = getIOTAStatusMessage(_context16.t0);
                _context16.t0.message = "Ledger device: ".concat(smsg);

                if (_context16.t0.statusCode) {
                  // add hex status code if present
                  statusCodeStr = _context16.t0.statusCode.toString(16);
                  _context16.t0.message += " (0x".concat(statusCodeStr, ")");
                }

                throw _context16.t0;

              case 14:
              case "end":
                return _context16.stop();
            }
          }
        }, _callee16, this, [[1, 8]]);
      }));

      function _sendCommand(_x26, _x27, _x28, _x29, _x30) {
        return _sendCommand2.apply(this, arguments);
      }

      return _sendCommand;
    }()
  }]);
  return Iota;
}();

var _default = Iota;
exports["default"] = _default;