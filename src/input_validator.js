import { isAddress, isTrytes } from 'iota.lib.js/lib/utils/inputValidator';

function _isObject(object) {
  const isNull = object === null;

  return !isNull && typeof object === 'object';
}

export function isPathArray(pathArray) {
  if (!_isObject(pathArray)) {
    return false;
  }

  return pathArray.length >= 2 && pathArray.length <= 5;
}

export function isArray(array) {
  return array instanceof Array;
}

export function isSecurity(security) {
  return Number.isInteger(security) && security >= 1 && security <= 3;
}

export function isIndex(index) {
  return Number.isInteger(index) && index >= 0;
}

export function isTransfersArray(transfers) {
  if (!isArray(transfers)) {
    return false;
  }

  for (let transfer of transfers) {
    if (!isAddress(transfer.address)) {
      return false;
    }
    if (!Number.isInteger(transfer.value) || transfer.value < 0) {
      return false;
    }
    if (!isTrytes(transfer.tag, '0,27')) {
      return false;
    }
  }

  return true;
}

export function isInputsArray(inputs) {
  if (!isArray(inputs)) {
    return false;
  }

  for (let input of inputs) {
    if (!isAddress(input.address)) {
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

export function isRemainderObject(remainder) {
  if (!_isObject(remainder)) {
    return false;
  }
  if (!isAddress(remainder.address)) {
    return false;
  }
  if (!isIndex(remainder.keyIndex)) {
    return false;
  }

  return true;
}

export function validSeedObject(seedObj) {
  if (!_isObject(seedObj)) {
    return false;
  }
  if (!'pathArray' in seedObj || !'security' in seedObj) {
    return false;
  }
  if (!this.isPathArray(seedObj.pathArray)) {
    return false;
  }
  if (!this.isSecurity(seedObj.security)) {
    return false;
  }

  return true;
}
