'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _struct = require('struct');

var _struct2 = _interopRequireDefault(_struct);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Commands = {
  INS_SET_SEED: 0x01,
  INS_PUBKEY: 0x02,
  INS_TX: 0x03,
  INS_SIGN: 0x04,
  INS_DISP_ADDR: 0x05
};

/**
 * IOTA API
 *
 * @example
 * import IOTA from "@ledgerhq/hw-app-iota";
 * const iota = new IOTA(transport)
 */

var IOTA = function () {
  function IOTA(transport) {
    _classCallCheck(this, IOTA);

    this.transport = transport;
    transport.decorateAppAPIMethods(this, ['setSeedInput', 'getPubKey', 'signBundle'], 'IOT');
  }

  _createClass(IOTA, [{
    key: 'sign',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(index) {
        var signStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                signStruct = new _struct2.default().word64Sle('index');

                signStruct.allocate();
                buf = signStruct.buffer();
                proxy = signStruct.fields;

                proxy.index = index;

                _this = this;
                return _context.abrupt('return', new Promise(function (resolve, reject) {
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
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function sign(_x) {
        return _ref.apply(this, arguments);
      }

      return sign;
    }()
  }, {
    key: 'transaction',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(address, address_idx, value, tag, tx_idx, tx_len, tx_time) {
        var txStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
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
                return _context2.abrupt('return', new Promise(function (resolve, reject) {
                  _this.transport.send(0x80, Commands.INS_TX, 0, 0, buf).then(function (response) {
                    var txOutputStruct = new _struct2.default().word8Sle('finalized').chars('bundleHash', 81);
                    txOutputStruct.allocate();
                    buf = txOutputStruct.buffer();
                    proxy = txOutputStruct.fields;
                    txOutputStruct._setBuff(response);
                    resolve({ bundleHash: proxy.bundleHash, finalized: proxy.finalized });
                  }).catch(function (e) {
                    reject(e);
                  });
                }));

              case 14:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function transaction(_x2, _x3, _x4, _x5, _x6, _x7, _x8) {
        return _ref2.apply(this, arguments);
      }

      return transaction;
    }()
  }, {
    key: 'signBundleResultToFragments',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(index) {
        var signatureFragmentStr, signatureLength, signatureFragments, result, amountOfFragments, i;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                signatureFragmentStr = '';
                signatureLength = 2187;
                signatureFragments = [];

              case 3:
                if (!true) {
                  _context3.next = 12;
                  break;
                }

                _context3.next = 6;
                return this.sign(index);

              case 6:
                result = _context3.sent;

                signatureFragmentStr += result.signature;

                if (result.fragmentsRemaining) {
                  _context3.next = 10;
                  break;
                }

                return _context3.abrupt('break', 12);

              case 10:
                _context3.next = 3;
                break;

              case 12:
                // Should never get any decimals
                // round is just there to make sure amountOfFragments is an integer.
                amountOfFragments = Math.round(signatureFragmentStr.length / signatureLength);
                // Pad remainder of fragment

                for (i = 0; i < amountOfFragments; i++) {
                  signatureFragments.push(signatureFragmentStr.substring(i * signatureLength, (i + 1) * signatureLength));
                }

                return _context3.abrupt('return', signatureFragments);

              case 15:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function signBundleResultToFragments(_x9) {
        return _ref3.apply(this, arguments);
      }

      return signBundleResultToFragments;
    }()
  }, {
    key: 'addSignatureFragmentsToBundle',
    value: function () {
      var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(bundle, security) {
        var i, address, signatureFragments, j;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                i = 0;

              case 1:
                if (!(i < bundle.bundle.length)) {
                  _context4.next = 12;
                  break;
                }

                if (!(bundle.bundle[i].value < 0)) {
                  _context4.next = 9;
                  break;
                }

                address = bundle.bundle[i].address;
                _context4.next = 6;
                return this.signBundleResultToFragments(i);

              case 6:
                signatureFragments = _context4.sent;


                bundle.bundle[i].signatureMessageFragment = signatureFragments.shift();

                // if user chooses higher than 27-tryte security
                // for each security level, add an additional signature
                for (j = 1; j < security; j++) {
                  //  Because the signature is > 2187 trytes, we need to
                  //  find the subsequent transaction to add the remainder of the signature
                  //  Same address as well as value = 0 (as we already spent the input)
                  if (bundle.bundle[i + j].address === address && bundle.bundle[i + j].value === 0) {
                    bundle.bundle[i + j].signatureMessageFragment = signatureFragments.shift();
                  }
                }

              case 9:
                i++;
                _context4.next = 1;
                break;

              case 12:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function addSignatureFragmentsToBundle(_x10, _x11) {
        return _ref4.apply(this, arguments);
      }

      return addSignatureFragmentsToBundle;
    }()
  }, {
    key: 'signBundle',
    value: function () {
      var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(options) {
        var inputMapping, bundle, security, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, tx, index, result;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                inputMapping = options.inputMapping, bundle = options.bundle, security = options.security;
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context5.prev = 4;
                _iterator = bundle.bundle[Symbol.iterator]();

              case 6:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context5.next = 15;
                  break;
                }

                tx = _step.value;
                index = inputMapping[tx.address] ? inputMapping[tx.address] : 0;
                _context5.next = 11;
                return this.transaction(tx.address, index, tx.value, tx.obsoleteTag, tx.currentIndex, tx.lastIndex, tx.timestamp);

              case 11:
                result = _context5.sent;

              case 12:
                _iteratorNormalCompletion = true;
                _context5.next = 6;
                break;

              case 15:
                _context5.next = 21;
                break;

              case 17:
                _context5.prev = 17;
                _context5.t0 = _context5['catch'](4);
                _didIteratorError = true;
                _iteratorError = _context5.t0;

              case 21:
                _context5.prev = 21;
                _context5.prev = 22;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 24:
                _context5.prev = 24;

                if (!_didIteratorError) {
                  _context5.next = 27;
                  break;
                }

                throw _iteratorError;

              case 27:
                return _context5.finish(24);

              case 28:
                return _context5.finish(21);

              case 29:
                _context5.next = 31;
                return this.addSignatureFragmentsToBundle(bundle, security);

              case 31:
                return _context5.abrupt('return', bundle);

              case 32:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[4, 17, 21, 29], [22,, 24, 28]]);
      }));

      function signBundle(_x12) {
        return _ref5.apply(this, arguments);
      }

      return signBundle;
    }()
  }, {
    key: 'getPubKey',
    value: function () {
      var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(index) {
        var indexStruct, buf, proxy, _this;

        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                indexStruct = new _struct2.default().word64Sle('index');

                indexStruct.allocate();
                buf = indexStruct.buffer();
                proxy = indexStruct.fields;

                proxy.index = index;
                _this = this;
                return _context6.abrupt('return', new Promise(function (resolve, reject) {
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
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function getPubKey(_x13) {
        return _ref6.apply(this, arguments);
      }

      return getPubKey;
    }()
  }, {
    key: 'setSeedInput',
    value: function () {
      var _ref7 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(bip44Path) {
        var security = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;

        var pathStruct, seedStruct, buf, proxy, i, _this;

        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                if (!(bip44Path.length !== 5)) {
                  _context7.next = 2;
                  break;
                }

                throw new Error('setSeedInput: bip44Path must be a length of 5!');

              case 2:
                pathStruct = new _struct2.default().word64Sle('path');
                seedStruct = new _struct2.default().array('paths', 5, pathStruct).word64Sle('security');

                seedStruct.allocate();
                buf = seedStruct.buffer();
                proxy = seedStruct.fields;

                for (i in bip44Path) {
                  proxy.paths[i].path = bip44Path[i];
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

              case 11:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function setSeedInput(_x15) {
        return _ref7.apply(this, arguments);
      }

      return setSeedInput;
    }()
  }]);

  return IOTA;
}();

exports.default = IOTA;