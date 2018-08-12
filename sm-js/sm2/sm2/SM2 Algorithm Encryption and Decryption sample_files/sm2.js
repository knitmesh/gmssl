function SM2Cipher(cipherMode) {
    this.ct = 1;
    this.p2 = null;
    this.sm3keybase = null;
    this.sm3c3 = null;
    this.key = new Array(32);
    this.keyOff = 0;
    if (typeof (cipherMode) != 'undefined') {
        this.cipherMode = cipherMode
    } else {
        this.cipherMode = SM2CipherMode.C1C3C2
    }
}
SM2Cipher.prototype = {
    Reset: function () {
        this.sm3keybase = new SM3Digest();
        this.sm3c3 = new SM3Digest();
        var xWords = this.byteConvert32Bytes(this.p2.getX().toBigInteger());
        var yWords = this.byteConvert32Bytes(this.p2.getY().toBigInteger());
        this.sm3keybase.BlockUpdate(xWords, 0, xWords.length);
        this.sm3c3.BlockUpdate(xWords, 0, xWords.length);
        this.sm3keybase.BlockUpdate(yWords, 0, yWords.length);
        this.ct = 1;
        this.NextKey()
    },
    NextKey: function () {
        var sm3keycur = new SM3Digest(this.sm3keybase);
        sm3keycur.Update((this.ct >> 24 & 0x00ff));
        sm3keycur.Update((this.ct >> 16 & 0x00ff));
        sm3keycur.Update((this.ct >> 8 & 0x00ff));
        sm3keycur.Update((this.ct & 0x00ff));
        sm3keycur.DoFinal(this.key, 0);
        this.keyOff = 0;
        this.ct++
    },
    InitEncipher: function (userKey) {
        var k = null;
        var c1 = null;
        var ec = new KJUR.crypto.ECDSA({
            "curve": "sm2"
        });
        var keypair = ec.generateKeyPairHex();
        k = new BigInteger(keypair.ecprvhex, 16);
        var pubkeyHex = keypair.ecpubhex;
        c1 = ECPointFp.decodeFromHex(ec.ecparams['curve'], pubkeyHex);
        this.p2 = userKey.multiply(k);
        this.Reset();
        return c1
    },
    EncryptBlock: function (data) {
        this.sm3c3.BlockUpdate(data, 0, data.length);
        for (var i = 0; i < data.length; i++) {
            if (this.keyOff == this.key.length) {
                this.NextKey()
            }
            data[i] ^= this.key[this.keyOff++]
        }
    },
    InitDecipher: function (userD, c1) {
        this.p2 = c1.multiply(userD);
        this.Reset()
    },
    DecryptBlock: function (data) {
        for (var i = 0; i < data.length; i++) {
            if (this.keyOff == this.key.length) {
                this.NextKey()
            }
            data[i] ^= this.key[this.keyOff++]
        }
        this.sm3c3.BlockUpdate(data, 0, data.length)
    },
    Dofinal: function (c3) {
        var yWords = this.byteConvert32Bytes(this.p2.getY().toBigInteger());
        this.sm3c3.BlockUpdate(yWords, 0, yWords.length);
        this.sm3c3.DoFinal(c3, 0);
        this.Reset()
    },
    Encrypt: function (pubKey, plaintext) {
        var data = new Array(plaintext.length);
        Array.Copy(plaintext, 0, data, 0, plaintext.length);
        var c1 = this.InitEncipher(pubKey);
        this.EncryptBlock(data);
        var c3 = new Array(32);
        this.Dofinal(c3);
        var hexString = this.bin2hex(c1.getEncoded(false))
            + this.bin2hex(data) + this.bin2hex(c3);
        if (this.cipherMode == SM2CipherMode.C1C3C2) {
            hexString = this.bin2hex(c1.getEncoded(false))
                + this.bin2hex(c3) + this.bin2hex(data)
        }
        return hexString
    },
    GetWords: function (hexStr) {
        var words = [];
        var hexStrLength = hexStr.length;
        for (var i = 0; i < hexStrLength; i += 2) {
            words[words.length] = parseInt(hexStr.substr(i, 2), 16)
        }
        return words
    },
    byteConvert32Bytes: function (n) {

        var tmpd = [];
        if (n == null) {
            return tmpd;
        }
        if (n.toByteArray().length == 33) {
            tmpd = new Array(32);
            Array.Copy(n.toByteArray(), 1, tmpd, 0, 32);
        }
        else if (n.toByteArray().length == 32) {
            tmpd = n.toByteArray();
        }
        else {
            tmpd = new Array(32);
            for (var i = 0; i < 32 - n.toByteArray().length; i++) {
                tmpd[i] = 0;
            }
            Array.Copy(n.toByteArray(), 0, tmpd, 32 - n.toByteArray().length, n.toByteArray().length);
        }
        for (var i = 0; i < 32; i++) {
            tmpd[i] &= 0xFF;
        }
        return tmpd
    },
    bin2hex: function (arr) {
        var base = "0123456789abcdef";
        var result = "";
        for (i = 0; i < arr.length; i++) {
            var c = arr[i] & 0xff;
            result += base.charAt(c >>> 4);
            result += base.charAt(c & 0xf);
        }
        return result;
    },
    str2Bytes: function (str) {
        var pos = 0;
        var len = str.length;
        if (len % 2 != 0) {
            return null;
        }
        var hexA = new Array();
        for (; pos < len; pos += 2) {
            var b1 = parseInt(str.charAt(pos), 16);
            var b2 = parseInt(str.charAt(pos + 1), 16);
            var v = ((b1 << 4) | b2);
            hexA.push(v);
        }
        return hexA;
    },
    GetHex: function (arr) {
        var words = [];
        var j = 0;
        for (var i = 0; i < arr.length * 2; i += 2) {
            words[i >>> 3] |= parseInt(arr[j]) << (24 - (i % 8) * 4);
            j++
        }
        var wordArray = new CryptoJS.lib.WordArray.init(words, arr.length);
        return wordArray
    },
    Decrypt: function (privateKey, ciphertext) {
        var hexString = ciphertext;
        var c1X = hexString.substr(0, 130);
        var encrypData = hexString.substr(c1X.length,
            hexString.length - c1X.length - 64);
        var c3 = hexString.substr(hexString.length - 64);
        if (this.cipherMode == SM2CipherMode.C1C3C2) {
            c3 = hexString.substr(c1X.length, 64);
            encrypData = hexString.substr(c1X.length + 64)
        }
        var data = this.str2Bytes(encrypData);
        var c1 = this.CreatePoint(c1X);
        this.InitDecipher(privateKey, c1);
        this.DecryptBlock(data);
        var c3_ = new Array(32);
        this.Dofinal(c3_);
        var isDecrypt = this.bin2hex(c3_).toString() == c3;
        if (isDecrypt) {
            var wordArray = CryptoJS.enc.Hex.parse(this.bin2hex(data));
            var decryptData = CryptoJS.enc.Utf8.stringify(wordArray);
            return decryptData
        } else {
            return ''
        }
    },
    CreatePoint: function (pubkeyHex) {
        var ec = new KJUR.crypto.ECDSA({
            "curve": "sm2"
        });
        var ecc_curve = ec.ecparams['curve'];
        var point = ECPointFp.decodeFromHex(ec.ecparams['curve'], pubkeyHex);
        return point
    }
};
window.SM2CipherMode = {
    C1C2C3: '0',
    C1C3C2: '1'
};