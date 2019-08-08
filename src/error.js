function getStatusMessage(statusCode) {
  switch (statusCode) {
    // improve text of most common errors
    case 0x9000: // SW_OK
      return 'Success';
    case 0x6700: // SW_INCORRECT_LENGTH
      return 'Incorrect input length';
    case 0x6a80: // SW_COMMAND_INVALID_DATA
      return 'Incorrect data';
    case 0x6b00: // SW_INCORRECT_P1P2
      return 'Incorrect command parameter';
    case 0x6c00: // SW_INCORRECT_LENGTH_P3
      return 'Incorrect length specified in header';
    case 0x6d00: // SW_INS_NOT_SUPPORTED
      return 'Invalid INS command';
    case 0x6e00: // SW_CLA_NOT_SUPPORTED
      return 'Incorrect CLA (Wrong application opened)';
    case 0x6900: // SW_COMMAND_NOT_ALLOWED
      return 'Command not allowed (Command out of order)';
    case 0x6982: // SW_SECURITY_STATUS_NOT_SATISFIED
      return 'Security not satisfied (Device locked)';
    case 0x6985: // SW_CONDITIONS_OF_USE_NOT_SATISFIED
      return 'Condition of use not satisfied (Denied by the user)';
    case 0x6401: // SW_COMMAND_TIMEOUT
      return 'Security not satisfied (Timeout exceeded)';
    case 0x69a1: // SW_BUNDLE_ERROR + INSECURE HASH
      return 'Bundle error (Insecure hash)';
    case 0x69a2: // SW_BUNDLE_ERROR + NON-ZERO BALANCE
      return 'Bundle error (Non zero balance)';
    case 0x69a3: // SW_BUNDLE_ERROR + INVALID META TX
      return 'Bundle error (Invalid meta transaction)';
    case 0x69a4: // SW_BUNDLE_ERROR + INVALID ADDRESS INDEX
      return 'Bundle error (Invalid input address/index pair(s))';
    case 0x69a5: // SW_BUNDLE_ERROR + ADDRESS REUSED
      return 'Bundle error (Address reused)';

    // Legacy exceptions
    case 0x6984: // SW_COMMAND_INVALID_DATA
      return 'Invalid input data';
    case 0x6986: // SW_APP_NOT_INITIALIZED
      return 'App has not been initialized by user';
    case 0x6991: // SW_TX_INVALID_INDEX
      return 'Invalid transaction index';
    case 0x6992: // SW_TX_INVALID_ORDER
      return 'Invalid transaction order (Output, Inputs, Change)';
    case 0x6993: // SW_TX_INVALID_META
      return 'Invalid meta transaction';
    case 0x6994: // SW_TX_INVALID_OUTPUT
      return 'Invalid output transaction (Output must come first)';
  }

  // unexpected exception thrown
  if (0x6f00 <= statusCode && statusCode <= 0x6fff) {
    return 'Internal error, please report';
  }
}

/**
 * Provides meaningful responses to error status codes returned by IOTA Ledger app.
 * @param {Integer} statusCode - Error statusCodecode
 * @returns {String} String message corresponding to error code
 */
export function getErrorMessage(statusCode) {
  const smsg = getStatusMessage(statusCode);
  if (smsg) {
    const statusCodeStr = statusCode.toString(16);

    // set the message according to the status code
    return `Ledger device: ${smsg} (0x${statusCodeStr})`;
  }
}
