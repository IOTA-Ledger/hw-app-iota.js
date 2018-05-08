'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _struct = require('struct');

var _struct2 = _interopRequireDefault(_struct);

var _bundle = require('iota.lib.js/lib/crypto/bundle/bundle');

var _bundle2 = _interopRequireDefault(_bundle);

var _utils = require('iota.lib.js/lib/utils/utils');

var _inputValidator = require('iota.lib.js/lib/utils/inputValidator');

var _bip32Path = require('bip32-path');

var _bip32Path2 = _interopRequireDefault(_bip32Path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EMPTY_TAG = '9'.repeat(27);
var Commands = {
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

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = transfers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var transfer = _step.value;

      if (!(0, _inputValidator.isAddress)(transfer.address)) {
        return false;
      }
      if (!Number.isInteger(transfer.value) || transfer.value < 0) {
        return false;
      }
      if (!(0, _inputValidator.isTrytes)(transfer.tag, '0,27')) {
        return false;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return true;
}

function isInputsArray(inputs) {
  if (!(inputs instanceof Array)) {
    return false;
  }

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = inputs[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var input = _step2.value;

      if (!(0, _inputValidator.isAddress)(input.address)) {
        return false;
      }
      if (!Number.isInteger(input.balance) || input.balance < 0) {
        return false;
      }
      if (!Number.isInteger(input.keyIndex) || input.keyIndex < 0) {
        return false;
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return true;
}

/**
 * IOTA API
 * @module hw-app-iota
 */
exports.default = Iota;

/**
 * Class for the interaction with the Ledger IOTA application.
 *
 * @example
 * import IOTA from "@ledgerhq/hw-app-iota";
 * const iota = new IOTA(transport);
 */

var Iota = function () {
  function Iota(transport) {
    _classCallCheck(this, Iota);

    this.transport = transport;
    this.security = 0;
    transport.decorateAppAPIMethods(this, ['setActiveSeed', 'getAddress', 'getSignedTransactions', 'displayAddress', 'readIndexes', 'writeIndexes'], 'IOT');
  }

  /**
   * Initializes the Ledger.
   *
   * @param {String} path - String representation of the 5-level BIP32 path
   * @param {Number} [security=2] - IOTA security level to use
   * @example
   * iota.setActiveSeed("44'/107A'/0'/0/0", 2);
   **/


  _createClass(Iota, [{
    key: 'setActiveSeed',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(path) {
        var security = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        var pathArray;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (_bip32Path2.default.validString(path)) {
                  _context.next = 2;
                  break;
                }

                throw new Error('Invalid BIP44 path string');

              case 2:
                pathArray = _bip32Path2.default.fromString(path).toPathArray();

                if (!(!pathArray || pathArray.length !== 5)) {
                  _context.next = 5;
                  break;
                }

                throw new Error('Invalid BIP44 path length');

              case 5:
                if (!(!Number.isInteger(security) || security < 1 || security > 3)) {
                  _context.next = 7;
                  break;
                }

                throw new Error('Invalid security level provided');

              case 7:
                this.security = security;

                _context.next = 10;
                return this._setActiveSeed(pathArray, security);

              case 10:
                return _context.abrupt('return');

              case 11:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function setActiveSeed(_x2) {
        return _ref.apply(this, arguments);
      }

      return setActiveSeed;
    }()

    /**
     * Generates an address index-based.
     *
     * @param {Integer} index - Index of the address
     * @param {Object} [options]
     * @param {Boolean} [options.checksum=false] - Append 9 tryte checksum
     * @returns {Promise<String>} Tryte-encoded address
     **/

  }, {
    key: 'getAddress',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(index) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var address;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (this.security) {
                  _context2.next = 2;
                  break;
                }

                throw new Error('getAddress: setSeedInput not yet called');

              case 2:
                if (!(!Number.isInteger(index) || index < 0)) {
                  _context2.next = 4;
                  break;
                }

                throw new Error('Invalid Index provided');

              case 4:
                options.checksum = options.checksum || false;

                _context2.next = 7;
                return this._getPubKey(index);

              case 7:
                address = _context2.sent;

                if (options.checksum) {
                  address = (0, _utils.addChecksum)(address);
                }

                return _context2.abrupt('return', address);

              case 10:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getAddress(_x4) {
        return _ref2.apply(this, arguments);
      }

      return getAddress;
    }()

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
     * @returns {Promise<String[]>} Transaction trytes of 2673 trytes per transaction
     */

  }, {
    key: 'getSignedTransactions',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(transfers, inputs, remainder) {
        var balance, payment;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (this.security) {
                  _context3.next = 2;
                  break;
                }

                throw new Error('getSignedTransactions: setSeedInput not yet called');

              case 2:
                if (isTransfersArray(transfers)) {
                  _context3.next = 4;
                  break;
                }

                throw new Error('Invalid transfers array provided');

              case 4:
                if (isInputsArray(inputs)) {
                  _context3.next = 6;
                  break;
                }

                throw new Error('Invalid inputs array provided');

              case 6:

                // filter unnecessary inputs
                inputs = inputs.filter(function (input) {
                  return input.balance > 0;
                });

                if (!(inputs.length < 1)) {
                  _context3.next = 9;
                  break;
                }

                throw new Error('At least one input required');

              case 9:
                if (!(transfers.length > 1 || inputs.length > 2)) {
                  _context3.next = 11;
                  break;
                }

                throw new Error('Unsupported number of transfers or inputs');

              case 11:
                balance = inputs.reduce(function (a, i) {
                  return a + i.balance;
                }, 0);
                payment = transfers.reduce(function (a, t) {
                  return a + t.value;
                }, 0);

                if (!remainder) {
                  _context3.next = 19;
                  break;
                }

                if (!(!(0, _inputValidator.isAddress)(remainder.address) || !Number.isInteger(remainder.keyIndex) || remainder.keyIndex < 0)) {
                  _context3.next = 16;
                  break;
                }

                throw new Error('Invalid remainder object provided');

              case 16:

                remainder = {
                  address: (0, _utils.noChecksum)(remainder.address),
                  value: balance - payment,
                  keyIndex: remainder.keyIndex
                };
                _context3.next = 21;
                break;

              case 19:
                if (!(balance != payment)) {
                  _context3.next = 21;
                  break;
                }

                throw new Error('Remainder object required');

              case 21:
                _context3.next = 23;
                return this._getSignedTransactions(transfers, inputs, remainder);

              case 23:
                return _context3.abrupt('return', _context3.sent);

              case 24:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function getSignedTransactions(_x5, _x6, _x7) {
        return _ref3.apply(this, arguments);
      }

      return getSignedTransactions;
    }()

    /**
     * Displays address on Ledger to verify it belongs to ledger seed.
     *
     * @param {Integer} index - Index of the address
     **/

  }, {
    key: 'displayAddress',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(index) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (this.security) {
                  _context4.next = 2;
                  break;
                }

                throw new Error('displayAddress: setSeedInput not yet called');

              case 2:
                if (!(!Number.isInteger(index) || index < 0)) {
                  _context4.next = 4;
                  break;
                }

                throw new Error('Invalid Index provided');

              case 4:
                _context4.next = 6;
                return this._displayAddress(index);

              case 6:
                return _context4.abrupt('return');

              case 7:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function displayAddress(_x8) {
        return _ref4.apply(this, arguments);
      }

      return displayAddress;
    }()

    /**
     * Retrieves the 5 seed indexes stored on the Ledger.
     *
     * @returns {Promise<Integer[]>}
     **/

  }, {
    key: 'readIndexes',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5() {
        var indexes;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this._readIndexes();

              case 2:
                indexes = _context5.sent;
                return _context5.abrupt('return', indexes);

              case 4:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function readIndexes() {
        return _ref5.apply(this, arguments);
      }

      return readIndexes;
    }()

    /**
     * Writes 5 seed indexes to Ledger.
     *
     * @param {Integer[]} indexes - Seed indexes to write
     **/

  }, {
    key: 'writeIndexes',
    value: function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(indexes) {
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.next = 2;
                return this._writeIndexes(indexes);

              case 2:
                return _context6.abrupt('return');

              case 3:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function writeIndexes(_x9) {
        return _ref6.apply(this, arguments);
      }

      return writeIndexes;
    }()

    ///////// Private methods should not be called directly! /////////

  }, {
    key: '_setActiveSeed',
    value: function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(pathArray, security) {
        var pathStruct, seedStruct, buf, proxy, i, _this;

        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                pathStruct = new _struct2.default().word64Sle('path');
                seedStruct = new _struct2.default().array('paths', 5, pathStruct).word64Sle('security');

                seedStruct.allocate();
                buf = seedStruct.buffer();
                proxy = seedStruct.fields;

                for (i in pathArray) {
                  proxy.paths[i].path = pathArray[i];
                }
                proxy.security = security;

                _this = this;
                return _context7.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_SET_SEED, 0, 0, buf).then(function (response) {
                    resolve(response);
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 9:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function _setActiveSeed(_x10, _x11) {
        return _ref7.apply(this, arguments);
      }

      return _setActiveSeed;
    }()
  }, {
    key: 'sign',
    value: function () {
      var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(index) {
        var signStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                signStruct = new _struct2.default().word64Sle('index');

                signStruct.allocate();
                buf = signStruct.buffer();
                proxy = signStruct.fields;

                proxy.index = index;

                _this = this;
                return _context8.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_SIGN, 0, 0, buf).then(function (response) {
                    var signOutputStruct = new _struct2.default().chars('signature', 243).word8Sle('fragmentsRemaining');
                    signOutputStruct.allocate();
                    buf = signOutputStruct.buffer();
                    proxy = signOutputStruct.fields;
                    signOutputStruct._setBuff(response);
                    resolve({
                      signature: proxy.signature,
                      fragmentsRemaining: proxy.fragmentsRemaining
                    });
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 7:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function sign(_x12) {
        return _ref8.apply(this, arguments);
      }

      return sign;
    }()
  }, {
    key: 'transaction',
    value: function () {
      var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(address, address_idx, value, tag, tx_idx, tx_len, tx_time) {
        var txStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                console.log('transaction', address, address_idx, value, tag, tx_idx, tx_len, tx_time);
                txStruct = new _struct2.default().chars('address', 81).word64Sle('address_idx').word64Sle('value').chars('tag', 27).word64Sle('tx_idx').word64Sle('tx_len').word64Sle('tx_time');

                txStruct.allocate();
                buf = txStruct.buffer();
                proxy = txStruct.fields;


                proxy.address = address;
                proxy.address_idx = address_idx;
                proxy.value = value;
                proxy.tag = tag;
                proxy.tx_idx = tx_idx;
                proxy.tx_len = tx_len;
                proxy.tx_time = tx_time;

                _this = this;
                return _context9.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_TX, 0, 0, buf).then(function (response) {
                    var txOutputStruct = new _struct2.default().word8Sle('finalized').chars('bundleHash', 81);
                    txOutputStruct.allocate();
                    buf = txOutputStruct.buffer();
                    proxy = txOutputStruct.fields;
                    txOutputStruct._setBuff(response);
                    resolve({
                      bundleHash: proxy.bundleHash,
                      finalized: proxy.finalized
                    });
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 14:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function transaction(_x13, _x14, _x15, _x16, _x17, _x18, _x19) {
        return _ref9.apply(this, arguments);
      }

      return transaction;
    }()
  }, {
    key: 'signBundleResultToFragments',
    value: function () {
      var _ref10 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(index) {
        var signatureFragmentStr, signatureLength, signatureFragments, result, amountOfFragments, i;
        return regeneratorRuntime.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                signatureFragmentStr = '';
                signatureLength = 2187;
                signatureFragments = [];

              case 3:
                if (!true) {
                  _context10.next = 12;
                  break;
                }

                _context10.next = 6;
                return this.sign(index);

              case 6:
                result = _context10.sent;

                signatureFragmentStr += result.signature;

                if (result.fragmentsRemaining) {
                  _context10.next = 10;
                  break;
                }

                return _context10.abrupt('break', 12);

              case 10:
                _context10.next = 3;
                break;

              case 12:
                // Should never get any decimals
                // round is just there to make sure amountOfFragments is an integer.
                amountOfFragments = Math.round(signatureFragmentStr.length / signatureLength);
                // Pad remainder of fragment

                for (i = 0; i < amountOfFragments; i++) {
                  signatureFragments.push(signatureFragmentStr.substring(i * signatureLength, (i + 1) * signatureLength));
                }

                return _context10.abrupt('return', signatureFragments);

              case 15:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function signBundleResultToFragments(_x20) {
        return _ref10.apply(this, arguments);
      }

      return signBundleResultToFragments;
    }()
  }, {
    key: 'addSignatureFragmentsToBundle',
    value: function () {
      var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(bundle) {
        var i, address, signatureFragments, j;
        return regeneratorRuntime.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                i = 0;

              case 1:
                if (!(i < bundle.bundle.length)) {
                  _context11.next = 12;
                  break;
                }

                if (!(bundle.bundle[i].value < 0)) {
                  _context11.next = 9;
                  break;
                }

                address = bundle.bundle[i].address;
                _context11.next = 6;
                return this.signBundleResultToFragments(i);

              case 6:
                signatureFragments = _context11.sent;


                bundle.bundle[i].signatureMessageFragment = signatureFragments.shift();

                // if user chooses higher than 27-tryte security
                // for each security level, add an additional signature
                for (j = 1; j < this.security; j++) {
                  //  Because the signature is > 2187 trytes, we need to
                  //  find the subsequent transaction to add the remainder of the signature
                  //  Same address as well as value = 0 (as we already spent the input)
                  if (bundle.bundle[i + j].address === address && bundle.bundle[i + j].value === 0) {
                    bundle.bundle[i + j].signatureMessageFragment = signatureFragments.shift();
                  }
                }

              case 9:
                i++;
                _context11.next = 1;
                break;

              case 12:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function addSignatureFragmentsToBundle(_x21) {
        return _ref11.apply(this, arguments);
      }

      return addSignatureFragmentsToBundle;
    }()
  }, {
    key: '_signBundle',
    value: function () {
      var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(options) {
        var inputMapping, bundle, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, tx, index, result;

        return regeneratorRuntime.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                inputMapping = options.inputMapping, bundle = options.bundle;
                _iteratorNormalCompletion3 = true;
                _didIteratorError3 = false;
                _iteratorError3 = undefined;
                _context12.prev = 4;
                _iterator3 = bundle.bundle[Symbol.iterator]();

              case 6:
                if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                  _context12.next = 15;
                  break;
                }

                tx = _step3.value;
                index = inputMapping[tx.address] ? inputMapping[tx.address] : 0;
                _context12.next = 11;
                return this.transaction(tx.address, index, tx.value, tx.obsoleteTag, tx.currentIndex, tx.lastIndex, tx.timestamp);

              case 11:
                result = _context12.sent;

              case 12:
                _iteratorNormalCompletion3 = true;
                _context12.next = 6;
                break;

              case 15:
                _context12.next = 21;
                break;

              case 17:
                _context12.prev = 17;
                _context12.t0 = _context12['catch'](4);
                _didIteratorError3 = true;
                _iteratorError3 = _context12.t0;

              case 21:
                _context12.prev = 21;
                _context12.prev = 22;

                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }

              case 24:
                _context12.prev = 24;

                if (!_didIteratorError3) {
                  _context12.next = 27;
                  break;
                }

                throw _iteratorError3;

              case 27:
                return _context12.finish(24);

              case 28:
                return _context12.finish(21);

              case 29:
                _context12.next = 31;
                return this.addSignatureFragmentsToBundle(bundle);

              case 31:
                return _context12.abrupt('return', bundle);

              case 32:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this, [[4, 17, 21, 29], [22,, 24, 28]]);
      }));

      function _signBundle(_x22) {
        return _ref12.apply(this, arguments);
      }

      return _signBundle;
    }()
  }, {
    key: '_getSignedTransactions',
    value: function () {
      var _ref13 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13(transfers, inputs, remainder) {
        var _this2 = this;

        var timestamp, bundle, inputMapping, bundleTrytes;
        return regeneratorRuntime.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                // remove checksums
                transfers.forEach(function (t) {
                  return t.address = (0, _utils.noChecksum)(t.address);
                });
                inputs.forEach(function (i) {
                  return i.address = (0, _utils.noChecksum)(i.address);
                });

                // pad transfer tags
                transfers.forEach(function (t) {
                  return t.tag = t.tag ? t.tag.padEnd(27, '9') : EMPTY_TAG;
                });
                // set correct security level
                inputs.forEach(function (i) {
                  return i.security = _this2.security;
                });

                // use the current time
                timestamp = Math.floor(Date.now() / 1000);
                bundle = new _bundle2.default();


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
                bundle.finalize();

                // map internal addresses to their index
                inputMapping = {};

                inputs.forEach(function (i) {
                  return inputMapping[i.address] = i.keyIndex;
                });
                if (remainder) {
                  inputMapping[remainder.address] = remainder.keyIndex;
                }

                // sign the bundle on the ledger
                _context13.next = 16;
                return this._signBundle({
                  inputMapping: inputMapping,
                  bundle: bundle
                });

              case 16:
                bundle = _context13.sent;


                // compute and return the corresponding trytes
                bundleTrytes = [];

                bundle.bundle.forEach(function (tx) {
                  return bundleTrytes.push((0, _utils.transactionTrytes)(tx));
                });
                return _context13.abrupt('return', bundleTrytes.reverse());

              case 20:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this);
      }));

      function _getSignedTransactions(_x23, _x24, _x25) {
        return _ref13.apply(this, arguments);
      }

      return _getSignedTransactions;
    }()
  }, {
    key: '_getPubKey',
    value: function () {
      var _ref14 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14(index) {
        var indexStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                indexStruct = new _struct2.default().word64Sle('index');

                indexStruct.allocate();
                buf = indexStruct.buffer();
                proxy = indexStruct.fields;

                proxy.index = index;
                _this = this;
                return _context14.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_PUBKEY, 0, 0, buf).then(function (response) {
                    var addressStruct = new _struct2.default().chars('address', 81);
                    addressStruct.allocate();
                    buf = addressStruct.buffer();
                    proxy = addressStruct.fields;
                    addressStruct._setBuff(response);
                    resolve(proxy.address);
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 7:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function _getPubKey(_x26) {
        return _ref14.apply(this, arguments);
      }

      return _getPubKey;
    }()
  }, {
    key: '_displayAddress',
    value: function () {
      var _ref15 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee15(index) {
        var indexStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                indexStruct = new _struct2.default().word64Sle('index');

                indexStruct.allocate();
                buf = indexStruct.buffer();
                proxy = indexStruct.fields;

                proxy.index = index;
                _this = this;
                return _context15.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_DISP_ADDR, 0, 0, buf).then(function (response) {
                    resolve(response);
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 7:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function _displayAddress(_x27) {
        return _ref15.apply(this, arguments);
      }

      return _displayAddress;
    }()
  }, {
    key: '_readIndexes',
    value: function () {
      var _ref16 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee16() {
        var indexStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                indexStruct = new _struct2.default();

                indexStruct.allocate();
                buf = indexStruct.buffer();
                proxy = indexStruct.fields;
                _this = this;
                return _context16.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_READ_INDEXES, 0, 0, buf).then(function (response) {
                    var indexesStruct = new _struct2.default().array('indexes', 5, 'word64Sle');
                    indexesStruct.allocate();
                    buf = indexesStruct.buffer();
                    proxy = indexesStruct.fields;
                    indexesStruct._setBuff(response);
                    resolve(proxy.indexes);
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 6:
              case 'end':
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function _readIndexes() {
        return _ref16.apply(this, arguments);
      }

      return _readIndexes;
    }()
  }, {
    key: '_writeIndexes',
    value: function () {
      var _ref17 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee17(indexes) {
        var indexStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                indexStruct = new _struct2.default().array('indexes', 5, 'word64Sle');

                indexStruct.allocate();
                buf = indexStruct.buffer();
                proxy = indexStruct.fields;

                proxy.indexes = indexes;
                _this = this;
                return _context17.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_WRITE_INDEXES, 0, 0, buf).then(function (response) {
                    resolve(response);
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 7:
              case 'end':
                return _context17.stop();
            }
          }
        }, _callee17, this);
      }));

      function _writeIndexes(_x28) {
        return _ref17.apply(this, arguments);
      }

      return _writeIndexes;
    }()
  }]);

  return Iota;
}();