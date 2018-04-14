const Struct = require('struct');
const Commands = {
  INS_SET_SEED: 0x01,
  INS_PUBKEY: 0x02,
  INS_TX: 0x03,
  INS_SIGN: 0x04,
  INS_DISP_ADDR: 0x05
};

class IOTA {
  constructor(transport) {
    this.transport = transport;
    transport.decorateAppAPIMethods(
      this,
      ["setSeedInput"],
      "w0w"
    );
  }

  async sign(index) {
    var signStruct = new Struct()
      .word64Sle("index");
    signStruct.allocate();
    var buf = signStruct.buffer();
    var proxy = signStruct.fields;
    proxy.index = index;

    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport.send(0x80, Commands.INS_SIGN, 0, 0, buf).then(response => {
        var signOutputStruct = new Struct()
          .chars("signature", 243)
          .word8Sle("fragmentsRemaining");
        signOutputStruct.allocate();
        buf = signOutputStruct.buffer()
        proxy = signOutputStruct.fields;
        signOutputStruct._setBuff(response)
        resolve({ signature: proxy.signature, fragmentsRemaining: proxy.fragmentsRemaining });
      })
      .catch(e => {
        reject(e);
      });
    });
  }

  async transaction(address, address_idx, value, tag, tx_idx, tx_len, tx_time) {
    console.log('transaction', address, address_idx, value, tag, tx_idx, tx_len, tx_time);
    var txStruct = new Struct()
      .chars("address", 81)
      .word64Sle("address_idx")
      .word64Sle("value")
      .chars("tag", 27)
      .word64Sle("tx_idx")
      .word64Sle("tx_len")
      .word64Sle("tx_time");
    txStruct.allocate();
    var buf = txStruct.buffer();
    var proxy = txStruct.fields;

    proxy.address = address;
    proxy.address_idx = address_idx;
    proxy.value = value;
    proxy.tag = tag;
    proxy.tx_idx = tx_idx;
    proxy.tx_len = tx_len;
    proxy.tx_time = tx_time;

    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport.send(0x80, Commands.INS_TX, 0, 0, buf).then(response => {
        var txOutputStruct = new Struct()
          .word8Sle("finalized")
          .chars("bundleHash", 81);
        txOutputStruct.allocate();
        buf = txOutputStruct.buffer()
        proxy = txOutputStruct.fields;
        txOutputStruct._setBuff(response)
        resolve({ bundleHash: proxy.bundleHash, finalized: proxy.finalized });
      })
      .catch(e => {
        reject(e);
      });
    });
  }

  async signBundleResultToFragments() {
    var signatureFragmentStr = "";
    var signatureLength = 2187;
    var signatureFragments = [];

    while (true) {
      var result = await this.sign(1);
      signatureFragmentStr += result.signature;
      if (!result.fragmentsRemaining) {
        break;
      }
    }
    // Should never get any decimals
    // round is just there to make sure amountOfFragments is an integer.
    var amountOfFragments = Math.round(signatureFragmentStr.length / signatureLength);
    // Pad remainder of fragment
    for (var i = 0; i < amountOfFragments; i++) {
      signatureFragments.push(signatureFragmentStr.substring(i * signatureLength, (i + 1) * signatureLength))
    }

    return signatureFragments;
  }

  async addSignatureFragmentsToBundle(bundle, security, address, signatureFragments) {
    for (var i = 0; i < bundle.bundle.length; i++) {
      if (bundle.bundle[i].value < 0) {
        bundle.bundle[i].signatureMessageFragment = signatureFragments.shift();

        // if user chooses higher than 27-tryte security
        // for each security level, add an additional signature
        for (var j = 1; j < security; j++) {

          //  Because the signature is > 2187 trytes, we need to
          //  find the subsequent transaction to add the remainder of the signature
          //  Same address as well as value = 0 (as we already spent the input)
          if (bundle.bundle[i + j].address === address && bundle.bundle[i + j].value === 0) {
            bundle.bundle[i + j].signatureMessageFragment = signatureFragments.shift()
          }
        }
      }
    }
  }

  async signBundle(options) {
    var { inputMapping, bundle, security } = options;
    var address;
    for(var tx of bundle.bundle) {
      var index = 0;
      if(tx.value < 0) {
        index = inputMapping[tx.address];
        address = tx.address;
      }

      var result = await this.transaction(tx.address, index, tx.value, tx.obsoleteTag, tx.currentIndex, tx.lastIndex, tx.timestamp);
    }
    var signatureFragments = await this.signBundleResultToFragments();
    this.addSignatureFragmentsToBundle(bundle, security, address, signatureFragments);
    return bundle;
  }

  async getPubKey(index) {
    var indexStruct = new Struct()
      .word64Sle("index")
    indexStruct.allocate();
    var buf = indexStruct.buffer();
    var proxy = indexStruct.fields;
    proxy.index = index;
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport.send(0x80, Commands.INS_PUBKEY, 0, 0, buf).then(response => {
        var addressStruct = new Struct()
          .chars("address", 81);
        addressStruct.allocate();
        buf = addressStruct.buffer()
        proxy = addressStruct.fields;
        addressStruct._setBuff(response)
        resolve(proxy.address);
      })
      .catch(e => {
        reject(e);
      });
    });
  }

  async setSeedInput(bip44Path, security = 2) {
    if(bip44Path.length !== 5) {
      throw new Error("setSeedInput: bip44Path must be a length of 5!");
    }

    var pathStruct = new Struct()
      .word64Sle("path");
    var seedStruct = new Struct()
      .array("paths", 5, pathStruct)
      .word64Sle("security");
    seedStruct.allocate();
    var buf = seedStruct.buffer();
    var proxy = seedStruct.fields;
    for(var i in bip44Path) {
      proxy.paths[i].path = bip44Path[i];
    }
    proxy.security = security

    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.transport.send(0x80, Commands.INS_SET_SEED, 0, 0, buf).then(response => {
        resolve(response);
      })
      .catch(e => {
        reject(e);
      });
    });
  }
}
