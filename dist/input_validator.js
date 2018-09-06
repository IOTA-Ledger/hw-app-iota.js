'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _isInteger = require('babel-runtime/core-js/number/is-integer');

var _isInteger2 = _interopRequireDefault(_isInteger);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.isArray = isArray;
exports.isSecurity = isSecurity;
exports.isIndex = isIndex;
exports.isTransfersArray = isTransfersArray;
exports.isInputsArray = isInputsArray;
exports.isRemainderObject = isRemainderObject;

var _inputValidator = require('iota.lib.js/lib/utils/inputValidator');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _isObject(object) {
  var isNull = object === null;

  return !isNull && (typeof object === 'undefined' ? 'undefined' : (0, _typeof3.default)(object)) === 'object';
}

function isArray(array) {
  return array instanceof Array;
}

function isSecurity(security) {
  return (0, _isInteger2.default)(security) && security >= 1 && security <= 3;
}

function isIndex(index) {
  return (0, _isInteger2.default)(index) && index >= 0;
}

function isTransfersArray(transfers) {
  if (!isArray(transfers)) {
    return false;
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(transfers), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var transfer = _step.value;

      if (!(0, _inputValidator.isAddress)(transfer.address)) {
        return false;
      }
      if (!(0, _isInteger2.default)(transfer.value) || transfer.value < 0) {
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
  if (!isArray(inputs)) {
    return false;
  }

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = (0, _getIterator3.default)(inputs), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var input = _step2.value;

      if (!(0, _inputValidator.isAddress)(input.address)) {
        return false;
      }
      if (!(0, _isInteger2.default)(input.balance) || input.balance < 0) {
        return false;
      }
      if (!isIndex(input.keyIndex)) {
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

function isRemainderObject(remainder) {
  if (!_isObject(remainder)) {
    return false;
  }
  if (!(0, _inputValidator.isAddress)(remainder.address)) {
    return false;
  }
  if (!isIndex(remainder.keyIndex)) {
    return false;
  }

  return true;
}