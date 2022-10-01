export const CLA = 0x7b;
export const ADPUInstructions = {
  INS_NO_OPERATION: 0x00,

  INS_GET_APP_CONFIG: 0x10,
  INS_SET_ACCOUNT: 0x11,

  // data buffer instructions
  INS_GET_DATA_BUFFER_STATE: 0x80,
  INS_WRITE_DATA_BLOCK: 0x81,
  INS_READ_DATA_BLOCK: 0x82,
  INS_CLEAR_DATA_BUFFER: 0x83,

  INS_SHOW_FLOW: 0x90,
  INS_PREPARE_BLIND_SIGNING: 0x91,

  // iota specific crypto instructions
  INS_PREPARE_SIGNING: 0xa0,
  INS_GEN_ADDRESS: 0xa1,
  INS_SIGN: 0xa2,
  INS_USER_CONFIRM_ESSENCE: 0xa3,
  INS_SIGN_SINGLE: 0xa4,

  // commands for debug mode
  INS_DUMP_MEMORY: 0x66,
  INS_SET_NON_INTERACTIVE_MODE: 0x67,

  INS_RESET: 0xff,
};

export const APDUInstructionsBolos = {
  GET_APP_VERSION_B0: 0x01,
  APP_EXIT_B0: 0xa7,

  OPEN_APP_E0: 0xd8,
};

export const TIMEOUT_CMD_NON_USER_INTERACTION = 10000;
export const TIMEOUT_CMD_USER_INTERACTION = 150000;

export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const ED25519_SIGNATURE_LENGTH = 64;

export const Flows = {
  FlowMainMenu: 0,
  FlowGeneratingAddresses: 1,
  FlowGenericError: 2,
  FlowRejected: 3,
  FlowSignedSuccessfully: 4,
  FlowSigning: 5,
};

export const AppModes = {
  ModeIOTAChrysalis: 0x00,
  ModeIOTAChrysalisTestnet: 0x80,
  ModeIOTAStardust: 0x01,
  ModeIOTAStardustTestnet: 0x81,
  ModeShimmerClaiming: 0x02,
  ModeShimmerClaimingTestnet: 0x82,
  ModeShimmer: 0x03,
  ModeShimmerTestnet: 0x83,
};

// TODO: questionable structure
export class DataTypeEnum {
  static Empty = new DataTypeEnum(0);
  static GeneratedAddress = new DataTypeEnum(1);
  static ValidatedEssence = new DataTypeEnum(2);
  static UserConfirmedEssence = new DataTypeEnum(3);
  static Signatures = new DataTypeEnum(4);
  static Locked = new DataTypeEnum(5);

  static Unknown = new DataTypeEnum(255);

  type: number;

  constructor(type: number) {
    this.type = type;
  }

  get_type(i: number): DataTypeEnum {
    switch (i) {
      case 0:
        return DataTypeEnum.Empty;
      case 1:
        return DataTypeEnum.GeneratedAddress;
      case 2:
        return DataTypeEnum.ValidatedEssence;
      case 3:
        return DataTypeEnum.UserConfirmedEssence;
      case 4:
        return DataTypeEnum.Signatures;
      case 5:
        return DataTypeEnum.Locked;
      default:
        return DataTypeEnum.Unknown;
    }
  }
}
