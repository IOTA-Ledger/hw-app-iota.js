"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isArray = isArray;
exports.isSecurity = isSecurity;
exports.isIndex = isIndex;
exports.isTransfersArray = isTransfersArray;
exports.isInputsArray = isInputsArray;
exports.isRemainderObject = isRemainderObject;

var _inputValidator = require("iota.lib.js/lib/utils/inputValidator");

function _isObject(object) {
  const isNull = object === null;
  return !isNull && typeof object === 'object';
}

function isArray(array) {
  return array instanceof Array;
}

function isSecurity(security) {
  return Number.isInteger(security) && security >= 1 && security <= 3;
}

function isIndex(index) {
  return Number.isInteger(index) && index >= 0;
}

function isTransfersArray(transfers) {
  if (!isArray(transfers)) {
    return false;
  }

  for (let transfer of transfers) {
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

  return true;
}

function isInputsArray(inputs) {
  if (!isArray(inputs)) {
    return false;
  }

  for (let input of inputs) {
    if (!(0, _inputValidator.isAddress)(input.address)) {
      return false;
    }

    if (!Number.isInteger(input.balance) || input.balance < 0) {
      return false;
    }

    if (!isIndex(input.keyIndex)) {
      return false;
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