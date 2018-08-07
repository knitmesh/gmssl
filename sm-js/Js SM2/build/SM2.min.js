/**
 * Created by jing on 18-8-7.
 */
var CryptoJS = CryptoJS || (function (Math, undefined) {
        var C = {};
        var C_lib = C.lib = {};
        var Base = C_lib.Base = (function () {
            function F() {
            }

            return {
                extend: function (overrides) {
                    F.prototype = this;
                    var subtype = new F();
                    if (overrides) {
                        subtype.mixIn(overrides)
                    }
                    if (!subtype.hasOwnProperty("init")) {
                        subtype.init = function () {
                            subtype.$super.init.apply(this, arguments)
                        }
                    }
                    subtype.init.prototype = subtype;
                    subtype.$super = this;
                    return subtype
                }, create: function () {
                    var instance = this.extend();
                    instance.init.apply(instance, arguments);
                    return instance
                }, init: function () {
                }, mixIn: function (properties) {
                    for (var propertyName in properties) {
                        if (properties.hasOwnProperty(propertyName)) {
                            this[propertyName] = properties[propertyName]
                        }
                    }
                    if (properties.hasOwnProperty("toString")) {
                        this.toString = properties.toString
                    }
                }, clone: function () {
                    return this.init.prototype.extend(this)
                }
            }
        }());
        var WordArray = C_lib.WordArray = Base.extend({
            init: function (words, sigBytes) {
                words = this.words = words || [];
                if (sigBytes != undefined) {
                    this.sigBytes = sigBytes
                } else {
                    this.sigBytes = words.length * 4
                }
            }, toString: function (encoder) {
                return (encoder || Hex).stringify(this)
            }, concat: function (wordArray) {
                var thisWords = this.words;
                var thatWords = wordArray.words;
                var thisSigBytes = this.sigBytes;
                var thatSigBytes = wordArray.sigBytes;
                this.clamp();
                if (thisSigBytes % 4) {
                    for (var i = 0; i < thatSigBytes; i += 1) {
                        var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 255;
                        thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8)
                    }
                } else {
                    if (thatWords.length > 65535) {
                        for (var i = 0; i < thatSigBytes; i += 4) {
                            thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2]
                        }
                    } else {
                        thisWords.push.apply(thisWords, thatWords)
                    }
                }
                this.sigBytes += thatSigBytes;
                return this
            }, clamp: function () {
                var words = this.words;
                var sigBytes = this.sigBytes;
                words[sigBytes >>> 2] &= 4294967295 << (32 - (sigBytes % 4) * 8);
                words.length = Math.ceil(sigBytes / 4)
            }, clone: function () {
                var clone = Base.clone.call(this);
                clone.words = this.words.slice(0);
                return clone
            }, random: function (nBytes) {
                var words = [];
                for (var i = 0; i < nBytes; i += 4) {
                    words.push((Math.random() * 4294967296) | 0)
                }
                return new WordArray.init(words, nBytes)
            }
        });
        var C_enc = C.enc = {};
        var Hex = C_enc.Hex = {
            stringify: function (wordArray) {
                var words = wordArray.words;
                var sigBytes = wordArray.sigBytes;
                var hexChars = [];
                for (var i = 0; i < sigBytes; i += 1) {
                    var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 255;
                    hexChars.push((bite >>> 4).toString(16));
                    hexChars.push((bite & 15).toString(16))
                }
                return hexChars.join("")
            }, parse: function (hexStr) {
                var hexStrLength = hexStr.length;
                var words = [];
                for (var i = 0; i < hexStrLength; i += 2) {
                    words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4)
                }
                return new WordArray.init(words, hexStrLength / 2)
            }
        };
        var Latin1 = C_enc.Latin1 = {
            stringify: function (wordArray) {
                var words = wordArray.words;
                var sigBytes = wordArray.sigBytes;
                var latin1Chars = [];
                for (var i = 0; i < sigBytes; i += 1) {
                    var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 255;
                    latin1Chars.push(String.fromCharCode(bite))
                }
                return latin1Chars.join("")
            }, parse: function (latin1Str) {
                var latin1StrLength = latin1Str.length;
                var words = [];
                for (var i = 0; i < latin1StrLength; i += 1) {
                    words[i >>> 2] |= (latin1Str.charCodeAt(i) & 255) << (24 - (i % 4) * 8)
                }
                return new WordArray.init(words, latin1StrLength)
            }
        };
        var Utf8 = C_enc.Utf8 = {
            stringify: function (wordArray) {
                try {
                    return decodeURIComponent(escape(Latin1.stringify(wordArray)))
                } catch (e) {
                    throw new Error("Malformed UTF-8 data")
                }
            }, parse: function (utf8Str) {
                return Latin1.parse(unescape(encodeURIComponent(utf8Str)))
            }
        };
        var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
            reset: function () {
                this._data = new WordArray.init();
                this._nDataBytes = 0
            }, _append: function (data) {
                if (typeof data == "string") {
                    data = Utf8.parse(data)
                }
                this._data.concat(data);
                this._nDataBytes += data.sigBytes
            }, _process: function (doFlush) {
                var data = this._data;
                var dataWords = data.words;
                var dataSigBytes = data.sigBytes;
                var blockSize = this.blockSize;
                var blockSizeBytes = blockSize * 4;
                var nBlocksReady = dataSigBytes / blockSizeBytes;
                if (doFlush) {
                    nBlocksReady = Math.ceil(nBlocksReady)
                } else {
                    nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0)
                }
                var nWordsReady = nBlocksReady * blockSize;
                var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);
                if (nWordsReady) {
                    for (var offset = 0; offset < nWordsReady;
                         offset += blockSize) {
                        this._doProcessBlock(dataWords, offset)
                    }
                    var processedWords = dataWords.splice(0, nWordsReady);
                    data.sigBytes -= nBytesReady
                }
                return new WordArray.init(processedWords, nBytesReady)
            }, clone: function () {
                var clone = Base.clone.call(this);
                clone._data = this._data.clone();
                return clone
            }, _minBufferSize: 0
        });
        var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
            cfg: Base.extend(), init: function (cfg) {
                this.cfg = this.cfg.extend(cfg);
                this.reset()
            }, reset: function () {
                BufferedBlockAlgorithm.reset.call(this);
                this._doReset()
            }, update: function (messageUpdate) {
                this._append(messageUpdate);
                this._process();
                return this
            }, finalize: function (messageUpdate) {
                if (messageUpdate) {
                    this._append(messageUpdate)
                }
                var hash = this._doFinalize();
                return hash
            }, blockSize: 512 / 32, _createHelper: function (hasher) {
                return function (message, cfg) {
                    return new hasher.init(cfg).finalize(message)
                }
            }, _createHmacHelper: function (hasher) {
                return function (message, key) {
                    return new C_algo.HMAC.init(hasher, key).finalize(message)
                }
            }
        });
        var C_algo = C.algo = {};
        return C
    }(Math));
var dbits;
var canary = 244837814094590;
var j_lm = ((canary & 16777215) == 15715070);
function BigInteger(a, b, c) {
    if (a != null) {
        if ("number" == typeof a) {
            this.fromNumber(a, b, c)
        } else {
            if (b == null && "string" != typeof a) {
                this.fromString(a, 256)
            } else {
                this.fromString(a, b)
            }
        }
    }
}
function nbi() {
    return new BigInteger(null)
}
function am1(i, x, w, j, c, n) {
    while (--n >= 0) {
        var v = x * this[i++] + w[j] + c;
        c = Math.floor(v / 67108864);
        w[j++] = v & 67108863
    }
    return c
}
function am2(i, x, w, j, c, n) {
    var xl = x & 32767, xh = x >> 15;
    while (--n >= 0) {
        var l = this[i] & 32767;
        var h = this[i++] >> 15;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
        c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
        w[j++] = l & 1073741823
    }
    return c
}
function am3(i, x, w, j, c, n) {
    var xl = x & 16383, xh = x >> 14;
    while (--n >= 0) {
        var l = this[i] & 16383;
        var h = this[i++] >> 14;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 16383) << 14) + w[j] + c;
        c = (l >> 28) + (m >> 14) + xh * h;
        w[j++] = l & 268435455
    }
    return c
}
if (j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30
} else {
    if (j_lm && (navigator.appName != "Netscape")) {
        BigInteger.prototype.am = am1;
        dbits = 26
    } else {
        BigInteger.prototype.am = am3;
        dbits = 28
    }
}
BigInteger.prototype.DB = dbits;
BigInteger.prototype.DM = ((1 << dbits) - 1);
BigInteger.prototype.DV = (1 << dbits);
var BI_FP = 52;
BigInteger.prototype.FV = Math.pow(2, BI_FP);
BigInteger.prototype.F1 = BI_FP - dbits;
BigInteger.prototype.F2 = 2 * dbits - BI_FP;
var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
var BI_RC = [];
var rr, vv;
rr = "0".charCodeAt(0);
for (vv = 0; vv <= 9; vv += 1) {
    BI_RC[rr++] = vv
}
rr = "a".charCodeAt(0);
for (vv = 10; vv < 36; vv += 1) {
    BI_RC[rr++] = vv
}
rr = "A".charCodeAt(0);
for (vv = 10; vv < 36; vv += 1) {
    BI_RC[rr++] = vv
}
function int2char(n) {
    return BI_RM.charAt(n)
}
function intAt(s, i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c == null) ? -1 : c
}
function bnpCopyTo(r) {
    for (var i = this.t - 1; i >= 0; i -= 1) {
        r[i] = this[i]
    }
    r.t = this.t;
    r.s = this.s
}
function bnpFromInt(x) {
    this.t = 1;
    this.s = (x < 0) ? -1 : 0;
    if (x > 0) {
        this[0] = x
    } else {
        if (x < -1) {
            this[0] = x + this.DV
        } else {
            this.t = 0
        }
    }
}
function nbv(i) {
    var r = nbi();
    r.fromInt(i);
    return r
}
function bnpFromString(s, b) {
    var k;
    if (b == 16) {
        k = 4
    } else {
        if (b == 8) {
            k = 3
        } else {
            if (b == 256) {
                k = 8
            } else {
                if (b == 2) {
                    k = 1
                } else {
                    if (b == 32) {
                        k = 5
                    } else {
                        if (b == 4) {
                            k = 2
                        } else {
                            this.fromRadix(s, b);
                            return
                        }
                    }
                }
            }
        }
    }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while (--i >= 0) {
        var x = (k == 8) ? s[i] & 255 : intAt(s, i);
        if (x < 0) {
            if (s.charAt(i) == "-") {
                mi = true
            }
            continue
        }
        mi = false;
        if (sh == 0) {
            this[this.t++] = x
        } else {
            if (sh + k > this.DB) {
                this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
                this[this.t++] = (x >> (this.DB - sh))
            } else {
                this[this.t - 1] |= x << sh
            }
        }
        sh += k;
        if (sh >= this.DB) {
            sh -= this.DB
        }
    }
    if (k == 8 && (s[0] & 128) != 0) {
        this.s = -1;
        if (sh > 0) {
            this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh
        }
    }
    this.clamp();
    if (mi) {
        BigInteger.ZERO.subTo(this, this)
    }
}
function bnpClamp() {
    var c = this.s & this.DM;
    while (this.t > 0 && this[this.t - 1] == c) {
        --this.t
    }
}
function bnToString(b) {
    if (this.s < 0) {
        return "-" + this.negate().toString(b)
    }
    var k;
    if (b == 16) {
        k = 4
    } else {
        if (b == 8) {
            k = 3
        } else {
            if (b == 2) {
                k = 1
            } else {
                if (b == 32) {
                    k = 5
                } else {
                    if (b == 4) {
                        k = 2
                    } else {
                        return this.toRadix(b)
                    }
                }
            }
        }
    }
    var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
    var p = this.DB - (i * this.DB) % k;
    if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) > 0) {
            m = true;
            r = int2char(d)
        }
        while (i >= 0) {
            if (p < k) {
                d = (this[i] & ((1 << p) - 1)) << (k - p);
                d |= this[i -= 1] >> (p += this.DB - k)
            } else {
                d = (this[i] >> (p -= k)) & km;
                if (p <= 0) {
                    p += this.DB;
                    i -= 1
                }
            }
            if (d > 0) {
                m = true
            }
            if (m) {
                r += int2char(d)
            }
        }
    }
    return m ? r : "0"
}
function bnNegate() {
    var r = nbi();
    BigInteger.ZERO.subTo(this, r);
    return r
}
function bnAbs() {
    return (this.s < 0) ? this.negate() : this
}
function bnCompareTo(a) {
    var r = this.s - a.s;
    if (r != 0) {
        return r
    }
    var i = this.t;
    r = i - a.t;
    if (r != 0) {
        return (this.s < 0) ? -r : r
    }
    while (--i >= 0) {
        if ((r = this[i] - a[i]) != 0) {
            return r
        }
    }
    return 0
}
function nbits(x) {
    var r = 1, t;
    if ((t = x >>> 16) != 0) {
        x = t;
        r += 16
    }
    if ((t = x >> 8) != 0) {
        x = t;
        r += 8
    }
    if ((t = x >> 4) != 0) {
        x = t;
        r += 4
    }
    if ((t = x >> 2) != 0) {
        x = t;
        r += 2
    }
    if ((t = x >> 1) != 0) {
        x = t;
        r += 1
    }
    return r
}
function bnBitLength() {
    if (this.t <= 0) {
        return 0
    }
    return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM))
}
function bnpDLShiftTo(n, r) {
    var i;
    for (i = this.t - 1; i >= 0; i -= 1) {
        r[i + n] = this[i]
    }
    for (i = n - 1; i >= 0; i -= 1) {
        r[i] = 0
    }
    r.t = this.t + n;
    r.s = this.s
}
function bnpDRShiftTo(n, r) {
    for (var i = n; i < this.t; i += 1) {
        r[i - n] = this[i]
    }
    r.t = Math.max(this.t - n, 0);
    r.s = this.s
}
function bnpLShiftTo(n, r) {
    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << cbs) - 1;
    var ds = Math.floor(n / this.DB), c = (this.s << bs) & this.DM, i;
    for (i = this.t - 1; i >= 0; i -= 1) {
        r[i + ds + 1] = (this[i] >> cbs) | c;
        c = (this[i] & bm) << bs
    }
    for (i = ds - 1; i >= 0; i -= 1) {
        r[i] = 0
    }
    r[ds] = c;
    r.t = this.t + ds + 1;
    r.s = this.s;
    r.clamp()
}
function bnpRShiftTo(n, r) {
    r.s = this.s;
    var ds = Math.floor(n / this.DB);
    if (ds >= this.t) {
        r.t = 0;
        return
    }
    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << bs) - 1;
    r[0] = this[ds] >> bs;
    for (var i = ds + 1; i < this.t; i += 1) {
        r[i - ds - 1] |= (this[i] & bm) << cbs;
        r[i - ds] = this[i] >> bs
    }
    if (bs > 0) {
        r[this.t - ds - 1] |= (this.s & bm) << cbs
    }
    r.t = this.t - ds;
    r.clamp()
}
function bnpSubTo(a, r) {
    var i = 0, c = 0, m = Math.min(a.t, this.t);
    while (i < m) {
        c += this[i] - a[i];
        r[i++] = c & this.DM;
        c >>= this.DB
    }
    if (a.t < this.t) {
        c -= a.s;
        while (i < this.t) {
            c += this[i];
            r[i++] = c & this.DM;
            c >>= this.DB
        }
        c += this.s
    } else {
        c += this.s;
        while (i < a.t) {
            c -= a[i];
            r[i++] = c & this.DM;
            c >>= this.DB
        }
        c -= a.s
    }
    r.s = (c < 0) ? -1 : 0;
    if (c < -1) {
        r[i++] = this.DV + c
    } else {
        if (c > 0) {
            r[i++] = c
        }
    }
    r.t = i;
    r.clamp()
}
function bnpMultiplyTo(a, r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i + y.t;
    while (--i >= 0) {
        r[i] = 0
    }
    for (i = 0; i < y.t; i += 1) {
        r[i + x.t] = x.am(0, y[i], r, i, 0, x.t)
    }
    r.s = 0;
    r.clamp();
    if (this.s != a.s) {
        BigInteger.ZERO.subTo(r, r)
    }
}
function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2 * x.t;
    while (--i >= 0) {
        r[i] = 0
    }
    for (i = 0; i < x.t - 1; i += 1) {
        var c = x.am(i, x[i], r, 2 * i, 0, 1);
        if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
            r[i + x.t] -= x.DV;
            r[i + x.t + 1] = 1
        }
    }
    if (r.t > 0) {
        r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1)
    }
    r.s = 0;
    r.clamp()
}
function bnpDivRemTo(m, q, r) {
    var pm = m.abs();
    if (pm.t <= 0) {
        return
    }
    var pt = this.abs();
    if (pt.t < pm.t) {
        if (q != null) {
            q.fromInt(0)
        }
        if (r != null) {
            this.copyTo(r)
        }
        return
    }
    if (r == null) {
        r = nbi()
    }
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB - nbits(pm[pm.t - 1]);
    if (nsh > 0) {
        pm.lShiftTo(nsh, y);
        pt.lShiftTo(nsh, r)
    } else {
        pm.copyTo(y);
        pt.copyTo(r)
    }
    var ys = y.t;
    var y0 = y[ys - 1];
    if (y0 == 0) {
        return
    }
    var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
    var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
    var i = r.t, j = i - ys, t = (q == null) ? nbi() : q;
    y.dlShiftTo(j, t);
    if (r.compareTo(t) >= 0) {
        r[r.t++] = 1;
        r.subTo(t, r)
    }
    BigInteger.ONE.dlShiftTo(ys, t);
    t.subTo(y, y);
    while (y.t < ys) {
        y[y.t++] = 0
    }
    while (--j >= 0) {
        var qd = (r[i -= 1] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
        if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
            y.dlShiftTo(j, t);
            r.subTo(t, r);
            while (r[i] < --qd) {
                r.subTo(t, r)
            }
        }
    }
    if (q != null) {
        r.drShiftTo(ys, q);
        if (ts != ms) {
            BigInteger.ZERO.subTo(q, q)
        }
    }
    r.t = ys;
    r.clamp();
    if (nsh > 0) {
        r.rShiftTo(nsh, r)
    }
    if (ts < 0) {
        BigInteger.ZERO.subTo(r, r)
    }
}
function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a, null, r);
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) {
        a.subTo(r, r)
    }
    return r
}
function Classic(m) {
    this.m = m
}
function cConvert(x) {
    if (x.s < 0 || x.compareTo(this.m) >= 0) {
        return x.mod(this.m)
    } else {
        return x
    }
}
function cRevert(x) {
    return x
}
function cReduce(x) {
    x.divRemTo(this.m, null, x)
}
function cMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r)
}
function cSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r)
}
Classic.prototype.convert = cConvert;
Classic.prototype.revert = cRevert;
Classic.prototype.reduce = cReduce;
Classic.prototype.mulTo = cMulTo;
Classic.prototype.sqrTo = cSqrTo;
function bnpInvDigit() {
    if (this.t < 1) {
        return 0
    }
    var x = this[0];
    if ((x & 1) == 0) {
        return 0
    }
    var y = x & 3;
    y = (y * (2 - (x & 15) * y)) & 15;
    y = (y * (2 - (x & 255) * y)) & 255;
    y = (y * (2 - (((x & 65535) * y) & 65535))) & 65535;
    y = (y * (2 - x * y % this.DV)) % this.DV;
    return (y > 0) ? this.DV - y : -y
}
function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp & 32767;
    this.mph = this.mp >> 15;
    this.um = (1 << (m.DB - 15)) - 1;
    this.mt2 = 2 * m.t
}
function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t, r);
    r.divRemTo(this.m, null, r);
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) {
        this.m.subTo(r, r)
    }
    return r
}
function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r
}
function montReduce(x) {
    while (x.t <= this.mt2) {
        x[x.t++] = 0
    }
    for (var i = 0; i < this.m.t; i += 1) {
        var j = x[i] & 32767;
        var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
        j = i + this.m.t;
        x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
        while (x[j] >= x.DV) {
            x[j] -= x.DV;
            x[j += 1] += 1
        }
    }
    x.clamp();
    x.drShiftTo(this.m.t, x);
    if (x.compareTo(this.m) >= 0) {
        x.subTo(this.m, x)
    }
}
function montSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r)
}
function montMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r)
}
Montgomery.prototype.convert = montConvert;
Montgomery.prototype.revert = montRevert;
Montgomery.prototype.reduce = montReduce;
Montgomery.prototype.mulTo = montMulTo;
Montgomery.prototype.sqrTo = montSqrTo;
function bnpIsEven() {
    return ((this.t > 0) ? (this[0] & 1) : this.s) == 0
}
function bnpExp(e, z) {
    if (e > 4294967295 || e < 1) {
        return BigInteger.ONE
    }
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
    g.copyTo(r);
    while (--i >= 0) {
        z.sqrTo(r, r2);
        if ((e & (1 << i)) > 0) {
            z.mulTo(r2, g, r)
        } else {
            var t = r;
            r = r2;
            r2 = t
        }
    }
    return z.revert(r)
}
function bnModPowInt(e, m) {
    var z;
    if (e < 256 || m.isEven()) {
        z = new Classic(m)
    } else {
        z = new Montgomery(m)
    }
    return this.exp(e, z)
}
BigInteger.prototype.copyTo = bnpCopyTo;
BigInteger.prototype.fromInt = bnpFromInt;
BigInteger.prototype.fromString = bnpFromString;
BigInteger.prototype.clamp = bnpClamp;
BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
BigInteger.prototype.drShiftTo = bnpDRShiftTo;
BigInteger.prototype.lShiftTo = bnpLShiftTo;
BigInteger.prototype.rShiftTo = bnpRShiftTo;
BigInteger.prototype.subTo = bnpSubTo;
BigInteger.prototype.multiplyTo = bnpMultiplyTo;
BigInteger.prototype.squareTo = bnpSquareTo;
BigInteger.prototype.divRemTo = bnpDivRemTo;
BigInteger.prototype.invDigit = bnpInvDigit;
BigInteger.prototype.isEven = bnpIsEven;
BigInteger.prototype.exp = bnpExp;
BigInteger.prototype.toString = bnToString;
BigInteger.prototype.negate = bnNegate;
BigInteger.prototype.abs = bnAbs;
BigInteger.prototype.compareTo = bnCompareTo;
BigInteger.prototype.bitLength = bnBitLength;
BigInteger.prototype.mod = bnMod;
BigInteger.prototype.modPowInt = bnModPowInt;
BigInteger.ZERO = nbv(0);
BigInteger.ONE = nbv(1);
function bnClone() {
    var r = nbi();
    this.copyTo(r);
    return r
}
function bnIntValue() {
    if (this.s < 0) {
        if (this.t == 1) {
            return this[0] - this.DV
        } else {
            if (this.t == 0) {
                return -1
            }
        }
    } else {
        if (this.t == 1) {
            return this[0]
        } else {
            if (this.t == 0) {
                return 0
            }
        }
    }
    return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0]
}
function bnByteValue() {
    return (this.t == 0) ? this.s : (this[0] << 24) >> 24
}
function bnShortValue() {
    return (this.t == 0) ? this.s : (this[0] << 16) >> 16
}
function bnpChunkSize(r) {
    return Math.floor(Math.LN2 * this.DB / Math.log(r))
}
function bnSigNum() {
    if (this.s < 0) {
        return -1
    } else {
        if (this.t <= 0 || (this.t == 1 && this[0] <= 0)) {
            return 0
        } else {
            return 1
        }
    }
}
function bnpToRadix(b) {
    if (b == null) {
        b = 10
    }
    if (this.signum() == 0 || b < 2 || b > 36) {
        return "0"
    }
    var cs = this.chunkSize(b);
    var a = Math.pow(b, cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d, y, z);
    while (y.signum() > 0) {
        r = (a + z.intValue()).toString(b).substr(1) + r;
        y.divRemTo(d, y, z)
    }
    return z.intValue().toString(b) + r
}
function bnpFromRadix(s, b) {
    this.fromInt(0);
    if (b == null) {
        b = 10
    }
    var cs = this.chunkSize(b);
    var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
    for (var i = 0; i < s.length; i += 1) {
        var x = intAt(s, i);
        if (x < 0) {
            if (s.charAt(i) == "-" && this.signum() == 0) {
                mi = true
            }
            continue
        }
        w = b * w + x;
        if (++j >= cs) {
            this.dMultiply(d);
            this.dAddOffset(w, 0);
            j = 0;
            w = 0
        }
    }
    if (j > 0) {
        this.dMultiply(Math.pow(b, j));
        this.dAddOffset(w, 0)
    }
    if (mi) {
        BigInteger.ZERO.subTo(this, this)
    }
}
function bnpFromNumber(a, b, c) {
    if ("number" == typeof b) {
        if (a < 2) {
            this.fromInt(1)
        } else {
            this.fromNumber(a, c);
            if (!this.testBit(a - 1)) {
                this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this)
            }
            if (this.isEven()) {
                this.dAddOffset(1, 0)
            }
            while (!this.isProbablePrime(b)) {
                this.dAddOffset(2, 0);
                if (this.bitLength() > a) {
                    this.subTo(BigInteger.ONE.shiftLeft(a - 1), this)
                }
            }
        }
    } else {
        var x = [], t = a & 7;
        x.length = (a >> 3) + 1;
        b.nextBytes(x);
        if (t > 0) {
            x[0] &= ((1 << t) - 1)
        } else {
            x[0] = 0
        }
        this.fromString(x, 256)
    }
}
function bnToByteArray() {
    var i = this.t, r = [];
    r[0] = this.s;
    var p = this.DB - (i * this.DB) % 8, d, k = 0;
    if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p) {
            r[k++] = d | (this.s << (this.DB - p))
        }
        while (i >= 0) {
            if (p < 8) {
                d = (this[i] & ((1 << p) - 1)) << (8 - p);
                d |= this[i -= 1] >> (p += this.DB - 8)
            } else {
                d = (this[i] >> (p -= 8)) & 255;
                if (p <= 0) {
                    p += this.DB;
                    i -= 1
                }
            }
            if ((d & 128) != 0) {
                d |= -256
            }
            if (k == 0 && (this.s & 128) != (d & 128)) {
                ++k
            }
            if (k > 0 || d != this.s) {
                r[k++] = d
            }
        }
    }
    return r
}
function bnEquals(a) {
    return (this.compareTo(a) == 0)
}
function bnMin(a) {
    return (this.compareTo(a) < 0) ? this : a
}
function bnMax(a) {
    return (this.compareTo(a) > 0) ? this : a
}
function bnpBitwiseTo(a, op, r) {
    var i, f, m = Math.min(a.t, this.t);
    for (i = 0; i < m; i += 1) {
        r[i] = op(this[i], a[i])
    }
    if (a.t < this.t) {
        f = a.s & this.DM;
        for (i = m; i < this.t; i += 1) {
            r[i] = op(this[i], f)
        }
        r.t = this.t
    } else {
        f = this.s & this.DM;
        for (i = m; i < a.t; i += 1) {
            r[i] = op(f, a[i])
        }
        r.t = a.t
    }
    r.s = op(this.s, a.s);
    r.clamp()
}
function op_and(x, y) {
    return x & y
}
function bnAnd(a) {
    var r = nbi();
    this.bitwiseTo(a, op_and, r);
    return r
}
function op_or(x, y) {
    return x | y
}
function bnOr(a) {
    var r = nbi();
    this.bitwiseTo(a, op_or, r);
    return r
}
function op_xor(x, y) {
    return x ^ y
}
function bnXor(a) {
    var r = nbi();
    this.bitwiseTo(a, op_xor, r);
    return r
}
function op_andnot(x, y) {
    return x & ~y
}
function bnAndNot(a) {
    var r = nbi();
    this.bitwiseTo(a, op_andnot, r);
    return r
}
function bnNot() {
    var r = nbi();
    for (var i = 0; i < this.t; i += 1) {
        r[i] = this.DM & ~this[i]
    }
    r.t = this.t;
    r.s = ~this.s;
    return r
}
function bnShiftLeft(n) {
    var r = nbi();
    if (n < 0) {
        this.rShiftTo(-n, r)
    } else {
        this.lShiftTo(n, r)
    }
    return r
}
function bnShiftRight(n) {
    var r = nbi();
    if (n < 0) {
        this.lShiftTo(-n, r)
    } else {
        this.rShiftTo(n, r)
    }
    return r
}
function lbit(x) {
    if (x == 0) {
        return -1
    }
    var r = 0;
    if ((x & 65535) == 0) {
        x >>= 16;
        r += 16
    }
    if ((x & 255) == 0) {
        x >>= 8;
        r += 8
    }
    if ((x & 15) == 0) {
        x >>= 4;
        r += 4
    }
    if ((x & 3) == 0) {
        x >>= 2;
        r += 2
    }
    if ((x & 1) == 0) {
        ++r
    }
    return r
}
function bnGetLowestSetBit() {
    for (var i = 0; i < this.t; i += 1) {
        if (this[i] != 0) {
            return i * this.DB + lbit(this[i])
        }
    }
    if (this.s < 0) {
        return this.t * this.DB
    }
    return -1
}
function cbit(x) {
    var r = 0;
    while (x != 0) {
        x &= x - 1;
        r += 1
    }
    return r
}
function bnBitCount() {
    var r = 0, x = this.s & this.DM;
    for (var i = 0; i < this.t; i += 1) {
        r += cbit(this[i] ^ x)
    }
    return r
}
function bnTestBit(n) {
    var j = Math.floor(n / this.DB);
    if (j >= this.t) {
        return (this.s != 0)
    }
    return ((this[j] & (1 << (n % this.DB))) != 0)
}
function bnpChangeBit(n, op) {
    var r = BigInteger.ONE.shiftLeft(n);
    this.bitwiseTo(r, op, r);
    return r
}
function bnSetBit(n) {
    return this.changeBit(n, op_or)
}
function bnClearBit(n) {
    return this.changeBit(n, op_andnot)
}
function bnFlipBit(n) {
    return this.changeBit(n, op_xor)
}
function bnpAddTo(a, r) {
    var i = 0, c = 0, m = Math.min(a.t, this.t);
    while (i < m) {
        c += this[i] + a[i];
        r[i++] = c & this.DM;
        c >>= this.DB
    }
    if (a.t < this.t) {
        c += a.s;
        while (i < this.t) {
            c += this[i];
            r[i++] = c & this.DM;
            c >>= this.DB
        }
        c += this.s
    } else {
        c += this.s;
        while (i < a.t) {
            c += a[i];
            r[i++] = c & this.DM;
            c >>= this.DB
        }
        c += a.s
    }
    r.s = (c < 0) ? -1 : 0;
    if (c > 0) {
        r[i++] = c
    } else {
        if (c < -1) {
            r[i++] = this.DV + c
        }
    }
    r.t = i;
    r.clamp()
}
function bnAdd(a) {
    var r = nbi();
    this.addTo(a, r);
    return r
}
function bnSubtract(a) {
    var r = nbi();
    this.subTo(a, r);
    return r
}
function bnMultiply(a) {
    var r = nbi();
    this.multiplyTo(a, r);
    return r
}
function bnSquare() {
    var r = nbi();
    this.squareTo(r);
    return r
}
function bnDivide(a) {
    var r = nbi();
    this.divRemTo(a, r, null);
    return r
}
function bnRemainder(a) {
    var r = nbi();
    this.divRemTo(a, null, r);
    return r
}
function bnDivideAndRemainder(a) {
    var q = nbi(), r = nbi();
    this.divRemTo(a, q, r);
    return [q, r]
}
function bnpDMultiply(n) {
    this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
    ++this.t;
    this.clamp()
}
function bnpDAddOffset(n, w) {
    if (n == 0) {
        return
    }
    while (this.t <= w) {
        this[this.t++] = 0
    }
    this[w] += n;
    while (this[w] >= this.DV) {
        this[w] -= this.DV;
        if (++w >= this.t) {
            this[this.t++] = 0
        }
        ++this[w]
    }
}
function NullExp() {
}
function nNop(x) {
    return x
}
function nMulTo(x, y, r) {
    x.multiplyTo(y, r)
}
function nSqrTo(x, r) {
    x.squareTo(r)
}
NullExp.prototype.convert = nNop;
NullExp.prototype.revert = nNop;
NullExp.prototype.mulTo = nMulTo;
NullExp.prototype.sqrTo = nSqrTo;
function bnPow(e) {
    return this.exp(e, new NullExp())
}
function bnpMultiplyLowerTo(a, n, r) {
    var i = Math.min(this.t + a.t, n);
    r.s = 0;
    r.t = i;
    while (i > 0) {
        r[i -= 1] = 0
    }
    var j;
    for (j = r.t - this.t;
         i < j; i += 1) {
        r[i + this.t] = this.am(0, a[i], r, i, 0, this.t)
    }
    for (j = Math.min(a.t, n); i < j; i += 1) {
        this.am(0, a[i], r, i, 0, n - i)
    }
    r.clamp()
}
function bnpMultiplyUpperTo(a, n, r) {
    n -= 1;
    var i = r.t = this.t + a.t - n;
    r.s = 0;
    while (--i >= 0) {
        r[i] = 0
    }
    for (i = Math.max(n - this.t, 0); i < a.t; i += 1) {
        r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n)
    }
    r.clamp();
    r.drShiftTo(1, r)
}
function Barrett(m) {
    this.r2 = nbi();
    this.q3 = nbi();
    BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
    this.mu = this.r2.divide(m);
    this.m = m
}
function barrettConvert(x) {
    if (x.s < 0 || x.t > 2 * this.m.t) {
        return x.mod(this.m)
    } else {
        if (x.compareTo(this.m) < 0) {
            return x
        } else {
            var r = nbi();
            x.copyTo(r);
            this.reduce(r);
            return r
        }
    }
}
function barrettRevert(x) {
    return x
}
function barrettReduce(x) {
    x.drShiftTo(this.m.t - 1, this.r2);
    if (x.t > this.m.t + 1) {
        x.t = this.m.t + 1;
        x.clamp()
    }
    this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
    this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
    while (x.compareTo(this.r2) < 0) {
        x.dAddOffset(1, this.m.t + 1)
    }
    x.subTo(this.r2, x);
    while (x.compareTo(this.m) >= 0) {
        x.subTo(this.m, x)
    }
}
function barrettSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r)
}
function barrettMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r)
}
Barrett.prototype.convert = barrettConvert;
Barrett.prototype.revert = barrettRevert;
Barrett.prototype.reduce = barrettReduce;
Barrett.prototype.mulTo = barrettMulTo;
Barrett.prototype.sqrTo = barrettSqrTo;
function bnModPow(e, m) {
    var i = e.bitLength(), k, r = nbv(1), z;
    if (i <= 0) {
        return r
    } else {
        if (i < 18) {
            k = 1
        } else {
            if (i < 48) {
                k = 3
            } else {
                if (i < 144) {
                    k = 4
                } else {
                    if (i < 768) {
                        k = 5
                    } else {
                        k = 6
                    }
                }
            }
        }
    }
    if (i < 8) {
        z = new Classic(m)
    } else {
        if (m.isEven()) {
            z = new Barrett(m)
        } else {
            z = new Montgomery(m)
        }
    }
    var g = [], n = 3, k1 = k - 1, km = (1 << k) - 1;
    g[1] = z.convert(this);
    if (k > 1) {
        var g2 = nbi();
        z.sqrTo(g[1], g2);
        while (n <= km) {
            g[n] = nbi();
            z.mulTo(g2, g[n - 2], g[n]);
            n += 2
        }
    }
    var j = e.t - 1, w, is1 = true, r2 = nbi(), t;
    i = nbits(e[j]) - 1;
    while (j >= 0) {
        if (i >= k1) {
            w = (e[j] >> (i - k1)) & km
        } else {
            w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
            if (j > 0) {
                w |= e[j - 1] >> (this.DB + i - k1)
            }
        }
        n = k;
        while ((w & 1) == 0) {
            w >>= 1;
            n -= 1
        }
        if ((i -= n) < 0) {
            i += this.DB;
            j -= 1
        }
        if (is1) {
            g[w].copyTo(r);
            is1 = false
        } else {
            while (n > 1) {
                z.sqrTo(r, r2);
                z.sqrTo(r2, r);
                n -= 2
            }
            if (n > 0) {
                z.sqrTo(r, r2)
            } else {
                t = r;
                r = r2;
                r2 = t
            }
            z.mulTo(r2, g[w], r)
        }
        while (j >= 0 && (e[j] & (1 << i)) == 0) {
            z.sqrTo(r, r2);
            t = r;
            r = r2;
            r2 = t;
            if (--i < 0) {
                i = this.DB - 1;
                j -= 1
            }
        }
    }
    return z.revert(r)
}
function bnGCD(a) {
    var x = (this.s < 0) ? this.negate() : this.clone();
    var y = (a.s < 0) ? a.negate() : a.clone();
    if (x.compareTo(y) < 0) {
        var t = x;
        x = y;
        y = t
    }
    var i = x.getLowestSetBit(), g = y.getLowestSetBit();
    if (g < 0) {
        return x
    }
    if (i < g) {
        g = i
    }
    if (g > 0) {
        x.rShiftTo(g, x);
        y.rShiftTo(g, y)
    }
    while (x.signum() > 0) {
        if ((i = x.getLowestSetBit()) > 0) {
            x.rShiftTo(i, x)
        }
        if ((i = y.getLowestSetBit()) > 0) {
            y.rShiftTo(i, y)
        }
        if (x.compareTo(y) >= 0) {
            x.subTo(y, x);
            x.rShiftTo(1, x)
        } else {
            y.subTo(x, y);
            y.rShiftTo(1, y)
        }
    }
    if (g > 0) {
        y.lShiftTo(g, y)
    }
    return y
}
function bnpModInt(n) {
    if (n <= 0) {
        return 0
    }
    var d = this.DV % n, r = (this.s < 0) ? n - 1 : 0;
    if (this.t > 0) {
        if (d == 0) {
            r = this[0] % n
        } else {
            for (var i = this.t - 1; i >= 0; i -= 1) {
                r = (d * r + this[i]) % n
            }
        }
    }
    return r
}
function bnModInverse(m) {
    var ac = m.isEven();
    if ((this.isEven() && ac) || m.signum() == 0) {
        return BigInteger.ZERO
    }
    var u = m.clone(), v = this.clone();
    var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
    while (u.signum() != 0) {
        while (u.isEven()) {
            u.rShiftTo(1, u);
            if (ac) {
                if (!a.isEven() || !b.isEven()) {
                    a.addTo(this, a);
                    b.subTo(m, b)
                }
                a.rShiftTo(1, a)
            } else {
                if (!b.isEven()) {
                    b.subTo(m, b)
                }
            }
            b.rShiftTo(1, b)
        }
        while (v.isEven()) {
            v.rShiftTo(1, v);
            if (ac) {
                if (!c.isEven() || !d.isEven()) {
                    c.addTo(this, c);
                    d.subTo(m, d)
                }
                c.rShiftTo(1, c)
            } else {
                if (!d.isEven()) {
                    d.subTo(m, d)
                }
            }
            d.rShiftTo(1, d)
        }
        if (u.compareTo(v) >= 0) {
            u.subTo(v, u);
            if (ac) {
                a.subTo(c, a)
            }
            b.subTo(d, b)
        } else {
            v.subTo(u, v);
            if (ac) {
                c.subTo(a, c)
            }
            d.subTo(b, d)
        }
    }
    if (v.compareTo(BigInteger.ONE) != 0) {
        return BigInteger.ZERO
    }
    if (d.compareTo(m) >= 0) {
        return d.subtract(m)
    }
    if (d.signum() < 0) {
        d.addTo(m, d)
    } else {
        return d
    }
    if (d.signum() < 0) {
        return d.add(m)
    } else {
        return d
    }
}
var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];
function bnIsProbablePrime(t) {
    var i, x = this.abs();
    if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
        for (i = 0; i < lowprimes.length; i += 1) {
            if (x[0] == lowprimes[i]) {
                return true
            }
        }
        return false
    }
    if (x.isEven()) {
        return false
    }
    i = 1;
    while (i < lowprimes.length) {
        var m = lowprimes[i], j = i + 1;
        while (j < lowprimes.length && m < lplim) {
            m *= lowprimes[j++]
        }
        m = x.modInt(m);
        while (i < j) {
            if (m % lowprimes[i++] == 0) {
                return false
            }
        }
    }
    return x.millerRabin(t)
}
function bnpMillerRabin(t) {
    var n1 = this.subtract(BigInteger.ONE);
    var k = n1.getLowestSetBit();
    if (k <= 0) {
        return false
    }
    var r = n1.shiftRight(k);
    t = (t + 1) >> 1;
    if (t > lowprimes.length) {
        t = lowprimes.length
    }
    var a = nbi();
    for (var i = 0; i < t; i += 1) {
        a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
        var y = a.modPow(r, this);
        if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
            var j = 1;
            while (j++ < k && y.compareTo(n1) != 0) {
                y = y.modPowInt(2, this);
                if (y.compareTo(BigInteger.ONE) == 0) {
                    return false
                }
            }
            if (y.compareTo(n1) != 0) {
                return false
            }
        }
    }
    return true
}
BigInteger.prototype.chunkSize = bnpChunkSize;
BigInteger.prototype.toRadix = bnpToRadix;
BigInteger.prototype.fromRadix = bnpFromRadix;
BigInteger.prototype.fromNumber = bnpFromNumber;
BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
BigInteger.prototype.changeBit = bnpChangeBit;
BigInteger.prototype.addTo = bnpAddTo;
BigInteger.prototype.dMultiply = bnpDMultiply;
BigInteger.prototype.dAddOffset = bnpDAddOffset;
BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
BigInteger.prototype.modInt = bnpModInt;
BigInteger.prototype.millerRabin = bnpMillerRabin;
BigInteger.prototype.clone = bnClone;
BigInteger.prototype.intValue = bnIntValue;
BigInteger.prototype.byteValue = bnByteValue;
BigInteger.prototype.shortValue = bnShortValue;
BigInteger.prototype.signum = bnSigNum;
BigInteger.prototype.toByteArray = bnToByteArray;
BigInteger.prototype.equals = bnEquals;
BigInteger.prototype.min = bnMin;
BigInteger.prototype.max = bnMax;
BigInteger.prototype.and = bnAnd;
BigInteger.prototype.or = bnOr;
BigInteger.prototype.xor = bnXor;
BigInteger.prototype.andNot = bnAndNot;
BigInteger.prototype.not = bnNot;
BigInteger.prototype.shiftLeft = bnShiftLeft;
BigInteger.prototype.shiftRight = bnShiftRight;
BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
BigInteger.prototype.bitCount = bnBitCount;
BigInteger.prototype.testBit = bnTestBit;
BigInteger.prototype.setBit = bnSetBit;
BigInteger.prototype.clearBit = bnClearBit;
BigInteger.prototype.flipBit = bnFlipBit;
BigInteger.prototype.add = bnAdd;
BigInteger.prototype.subtract = bnSubtract;
BigInteger.prototype.multiply = bnMultiply;
BigInteger.prototype.divide = bnDivide;
BigInteger.prototype.remainder = bnRemainder;
BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
BigInteger.prototype.modPow = bnModPow;
BigInteger.prototype.modInverse = bnModInverse;
BigInteger.prototype.pow = bnPow;
BigInteger.prototype.gcd = bnGCD;
BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
BigInteger.prototype.square = bnSquare;
function Arcfour() {
    this.i = 0;
    this.j = 0;
    this.S = []
}
function ARC4init(key) {
    var i, j, t;
    for (i = 0; i < 256; i += 1) {
        this.S[i] = i
    }
    j = 0;
    for (i = 0; i < 256; i += 1) {
        j = (j + this.S[i] + key[i % key.length]) & 255;
        t = this.S[i];
        this.S[i] = this.S[j];
        this.S[j] = t
    }
    this.i = 0;
    this.j = 0
}
function ARC4next() {
    var t;
    this.i = (this.i + 1) & 255;
    this.j = (this.j + this.S[this.i]) & 255;
    t = this.S[this.i];
    this.S[this.i] = this.S[this.j];
    this.S[this.j] = t;
    return this.S[(t + this.S[this.i]) & 255]
}
Arcfour.prototype.init = ARC4init;
Arcfour.prototype.next = ARC4next;
function prng_newstate() {
    return new Arcfour()
}
var rng_psize = 256;
var rng_state;
var rng_pool;
var rng_pptr;
function rng_seed_int(x) {
    rng_pool[rng_pptr++] ^= x & 255;
    rng_pool[rng_pptr++] ^= (x >> 8) & 255;
    rng_pool[rng_pptr++] ^= (x >> 16) & 255;
    rng_pool[rng_pptr++] ^= (x >> 24) & 255;
    if (rng_pptr >= rng_psize) {
        rng_pptr -= rng_psize
    }
}
function rng_seed_time() {
    rng_seed_int(new Date().getTime())
}
if (rng_pool == null) {
    rng_pool = [];
    rng_pptr = 0;
    var t;
    if (window.crypto && window.crypto.getRandomValues) {
        var ua = new Uint8Array(32);
        window.crypto.getRandomValues(ua);
        for (t = 0; t < 32; t += 1) {
            rng_pool[rng_pptr++] = ua[t]
        }
    }
    if (navigator.appName == "Netscape" && navigator.appVersion < "5" && window.crypto) {
        var z = window.crypto.random(32);
        for (t = 0; t < z.length; t += 1) {
            rng_pool[rng_pptr++] = z.charCodeAt(t) & 255
        }
    }
    while (rng_pptr < rng_psize) {
        t = Math.floor(65536 * Math.random());
        rng_pool[rng_pptr++] = t >>> 8;
        rng_pool[rng_pptr++] = t & 255
    }
    rng_pptr = 0;
    rng_seed_time()
}
function rng_get_byte() {
    if (rng_state == null) {
        rng_seed_time();
        rng_state = prng_newstate();
        rng_state.init(rng_pool);
        for (rng_pptr = 0; rng_pptr < rng_pool.length; rng_pptr += 1) {
            rng_pool[rng_pptr] = 0
        }
        rng_pptr = 0
    }
    return rng_state.next()
}
function rng_get_bytes(ba) {
    var i;
    for (i = 0; i < ba.length; i += 1) {
        ba[i] = rng_get_byte()
    }
}
function SecureRandom() {
}
SecureRandom.prototype.nextBytes = rng_get_bytes;
function ECFieldElementFp(q, x) {
    this.x = x;
    this.q = q
}
function feFpEquals(other) {
    if (other == this) {
        return true
    }
    return (this.q.equals(other.q) && this.x.equals(other.x))
}
function feFpToBigInteger() {
    return this.x
}
function feFpNegate() {
    return new ECFieldElementFp(this.q, this.x.negate().mod(this.q))
}
function feFpAdd(b) {
    return new ECFieldElementFp(this.q, this.x.add(b.toBigInteger()).mod(this.q))
}
function feFpSubtract(b) {
    return new ECFieldElementFp(this.q, this.x.subtract(b.toBigInteger()).mod(this.q))
}
function feFpMultiply(b) {
    return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger()).mod(this.q))
}
function feFpSquare() {
    return new ECFieldElementFp(this.q, this.x.square().mod(this.q))
}
function feFpDivide(b) {
    return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger().modInverse(this.q)).mod(this.q))
}
ECFieldElementFp.prototype.equals = feFpEquals;
ECFieldElementFp.prototype.toBigInteger = feFpToBigInteger;
ECFieldElementFp.prototype.negate = feFpNegate;
ECFieldElementFp.prototype.add = feFpAdd;
ECFieldElementFp.prototype.subtract = feFpSubtract;
ECFieldElementFp.prototype.multiply = feFpMultiply;
ECFieldElementFp.prototype.square = feFpSquare;
ECFieldElementFp.prototype.divide = feFpDivide;
function ECPointFp(curve, x, y, z) {
    this.curve = curve;
    this.x = x;
    this.y = y;
    if (z == null) {
        this.z = BigInteger.ONE
    } else {
        this.z = z
    }
    this.zinv = null
}
function pointFpGetX() {
    if (this.zinv == null) {
        this.zinv = this.z.modInverse(this.curve.q)
    }
    return this.curve.fromBigInteger(this.x.toBigInteger().multiply(this.zinv).mod(this.curve.q))
}
function pointFpGetY() {
    if (this.zinv == null) {
        this.zinv = this.z.modInverse(this.curve.q)
    }
    return this.curve.fromBigInteger(this.y.toBigInteger().multiply(this.zinv).mod(this.curve.q))
}
function pointFpEquals(other) {
    if (other == this) {
        return true
    }
    if (this.isInfinity()) {
        return other.isInfinity()
    }
    if (other.isInfinity()) {
        return this.isInfinity()
    }
    var u, v;
    u = other.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(other.z)).mod(this.curve.q);
    if (!u.equals(BigInteger.ZERO)) {
        return false
    }
    v = other.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(other.z)).mod(this.curve.q);
    return v.equals(BigInteger.ZERO)
}
function pointFpIsInfinity() {
    if ((this.x == null) && (this.y == null)) {
        return true
    }
    return this.z.equals(BigInteger.ZERO) && !this.y.toBigInteger().equals(BigInteger.ZERO)
}
function pointFpNegate() {
    return new ECPointFp(this.curve, this.x, this.y.negate(), this.z)
}
function pointFpAdd(b) {
    if (this.isInfinity()) {
        return b
    }
    if (b.isInfinity()) {
        return this
    }
    var u = b.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(b.z)).mod(this.curve.q);
    var v = b.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(b.z)).mod(this.curve.q);
    if (BigInteger.ZERO.equals(v)) {
        if (BigInteger.ZERO.equals(u)) {
            return this.twice()
        }
        return this.curve.getInfinity()
    }
    var THREE = new BigInteger("3");
    var x1 = this.x.toBigInteger();
    var y1 = this.y.toBigInteger();
    var x2 = b.x.toBigInteger();
    var y2 = b.y.toBigInteger();
    var v2 = v.square();
    var v3 = v2.multiply(v);
    var x1v2 = x1.multiply(v2);
    var zu2 = u.square().multiply(this.z);
    var x3 = zu2.subtract(x1v2.shiftLeft(1)).multiply(b.z).subtract(v3).multiply(v).mod(this.curve.q);
    var y3 = x1v2.multiply(THREE).multiply(u).subtract(y1.multiply(v3)).subtract(zu2.multiply(u)).multiply(b.z).add(u.multiply(v3)).mod(this.curve.q);
    var z3 = v3.multiply(this.z).multiply(b.z).mod(this.curve.q);
    return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3)
}
function pointFpTwice() {
    if (this.isInfinity()) {
        return this
    }
    if (this.y.toBigInteger().signum() == 0) {
        return this.curve.getInfinity()
    }
    var THREE = new BigInteger("3");
    var x1 = this.x.toBigInteger();
    var y1 = this.y.toBigInteger();
    var y1z1 = y1.multiply(this.z);
    var y1sqz1 = y1z1.multiply(y1).mod(this.curve.q);
    var a = this.curve.a.toBigInteger();
    var w = x1.square().multiply(THREE);
    if (!BigInteger.ZERO.equals(a)) {
        w = w.add(this.z.square().multiply(a))
    }
    w = w.mod(this.curve.q);
    var x3 = w.square().subtract(x1.shiftLeft(3).multiply(y1sqz1)).shiftLeft(1).multiply(y1z1).mod(this.curve.q);
    var y3 = w.multiply(THREE).multiply(x1).subtract(y1sqz1.shiftLeft(1)).shiftLeft(2).multiply(y1sqz1).subtract(w.square().multiply(w)).mod(this.curve.q);
    var z3 = y1z1.square().multiply(y1z1).shiftLeft(3).mod(this.curve.q);
    return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3)
}
function pointFpMultiply(k) {
    if (this.isInfinity()) {
        return this
    }
    if (k.signum() == 0) {
        return this.curve.getInfinity()
    }
    var e = k;
    var h = e.multiply(new BigInteger("3"));
    var neg = this.negate();
    var R = this;
    var i;
    for (i = h.bitLength() - 2; i > 0; i -= 1) {
        R = R.twice();
        var hBit = h.testBit(i);
        var eBit = e.testBit(i);
        if (hBit != eBit) {
            R = R.add(hBit ? this : neg)
        }
    }
    return R
}
function pointFpMultiplyTwo(j, x, k) {
    var i;
    if (j.bitLength() > k.bitLength()) {
        i = j.bitLength() - 1
    } else {
        i = k.bitLength() - 1
    }
    var R = this.curve.getInfinity();
    var both = this.add(x);
    while (i >= 0) {
        R = R.twice();
        if (j.testBit(i)) {
            if (k.testBit(i)) {
                R = R.add(both)
            } else {
                R = R.add(this)
            }
        } else {
            if (k.testBit(i)) {
                R = R.add(x)
            }
        }
        i -= 1
    }
    return R
}
ECPointFp.prototype.getX = pointFpGetX;
ECPointFp.prototype.getY = pointFpGetY;
ECPointFp.prototype.equals = pointFpEquals;
ECPointFp.prototype.isInfinity = pointFpIsInfinity;
ECPointFp.prototype.negate = pointFpNegate;
ECPointFp.prototype.add = pointFpAdd;
ECPointFp.prototype.twice = pointFpTwice;
ECPointFp.prototype.multiply = pointFpMultiply;
ECPointFp.prototype.multiplyTwo = pointFpMultiplyTwo;
function ECCurveFp(q, a, b) {
    this.q = q;
    this.a = this.fromBigInteger(a);
    this.b = this.fromBigInteger(b);
    this.infinity = new ECPointFp(this, null, null)
}
function curveFpGetQ() {
    return this.q
}
function curveFpGetA() {
    return this.a
}
function curveFpGetB() {
    return this.b
}
function curveFpEquals(other) {
    if (other == this) {
        return true
    }
    return (this.q.equals(other.q) && this.a.equals(other.a) && this.b.equals(other.b))
}
function curveFpGetInfinity() {
    return this.infinity
}
function curveFpFromBigInteger(x) {
    return new ECFieldElementFp(this.q, x)
}
function curveFpDecodePointHex(s) {
    switch (parseInt(s.substr(0, 2), 16)) {
        case 0:
            return this.infinity;
        case 2:
        case 3:
            return null;
        case 4:
        case 6:
        case 7:
            var len = (s.length - 2) / 2;
            var xHex = s.substr(2, len);
            var yHex = s.substr(len + 2, len);
            return new ECPointFp(this, this.fromBigInteger(new BigInteger(xHex, 16)), this.fromBigInteger(new BigInteger(yHex, 16)));
        default:
            return null
    }
}
ECCurveFp.prototype.getQ = curveFpGetQ;
ECCurveFp.prototype.getA = curveFpGetA;
ECCurveFp.prototype.getB = curveFpGetB;
ECCurveFp.prototype.equals = curveFpEquals;
ECCurveFp.prototype.getInfinity = curveFpGetInfinity;
ECCurveFp.prototype.fromBigInteger = curveFpFromBigInteger;
ECCurveFp.prototype.decodePointHex = curveFpDecodePointHex;
ECFieldElementFp.prototype.getByteLength = function () {
    return Math.floor((this.toBigInteger().bitLength() + 7) / 8)
};
ECPointFp.prototype.getEncoded = function (compressed) {
    var integerToBytes = function (i, len) {
        var bytes = i.toByteArrayUnsigned();
        if (len < bytes.length) {
            bytes = bytes.slice(bytes.length - len)
        } else {
            while (len > bytes.length) {
                bytes.unshift(0)
            }
        }
        return bytes
    };
    var x = this.getX().toBigInteger();
    var y = this.getY().toBigInteger();
    var enc = integerToBytes(x, 32);
    if (compressed) {
        if (y.isEven()) {
            enc.unshift(2)
        } else {
            enc.unshift(3)
        }
    } else {
        enc.unshift(4);
        enc = enc.concat(integerToBytes(y, 32))
    }
    return enc
};
ECPointFp.decodeFrom = function (curve, enc) {
    var type = enc[0];
    var dataLen = enc.length - 1;
    var xBa = enc.slice(1, 1 + dataLen / 2);
    var yBa = enc.slice(1 + dataLen / 2, 1 + dataLen);
    xBa.unshift(0);
    yBa.unshift(0);
    var x = new BigInteger(xBa);
    var y = new BigInteger(yBa);
    return new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))
};
ECPointFp.decodeFromHex = function (curve, encHex) {
    var type = encHex.substr(0, 2);
    var dataLen = encHex.length - 2;
    var xHex = encHex.substr(2, dataLen / 2);
    var yHex = encHex.substr(2 + dataLen / 2, dataLen / 2);
    var x = new BigInteger(xHex, 16);
    var y = new BigInteger(yHex, 16);
    return new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))
};
ECPointFp.prototype.add2D = function (b) {
    if (this.isInfinity()) {
        return b
    }
    if (b.isInfinity()) {
        return this
    }
    if (this.x.equals(b.x)) {
        if (this.y.equals(b.y)) {
            return this.twice()
        }
        return this.curve.getInfinity()
    }
    var x_x = b.x.subtract(this.x);
    var y_y = b.y.subtract(this.y);
    var gamma = y_y.divide(x_x);
    var x3 = gamma.square().subtract(this.x).subtract(b.x);
    var y3 = gamma.multiply(this.x.subtract(x3)).subtract(this.y);
    return new ECPointFp(this.curve, x3, y3)
};
ECPointFp.prototype.twice2D = function () {
    if (this.isInfinity()) {
        return this
    }
    if (this.y.toBigInteger().signum() == 0) {
        return this.curve.getInfinity()
    }
    var TWO = this.curve.fromBigInteger(BigInteger.valueOf(2));
    var THREE = this.curve.fromBigInteger(BigInteger.valueOf(3));
    var gamma = this.x.square().multiply(THREE).add(this.curve.a).divide(this.y.multiply(TWO));
    var x3 = gamma.square().subtract(this.x.multiply(TWO));
    var y3 = gamma.multiply(this.x.subtract(x3)).subtract(this.y);
    return new ECPointFp(this.curve, x3, y3)
};
ECPointFp.prototype.multiply2D = function (k) {
    if (this.isInfinity()) {
        return this
    }
    if (k.signum() == 0) {
        return this.curve.getInfinity()
    }
    var e = k;
    var h = e.multiply(new BigInteger("3"));
    var neg = this.negate();
    var R = this;
    var i;
    for (i = h.bitLength() - 2; i > 0; i -= 1) {
        R = R.twice();
        var hBit = h.testBit(i);
        var eBit = e.testBit(i);
        if (hBit != eBit) {
            R = R.add2D(hBit ? this : neg)
        }
    }
    return R
};
ECPointFp.prototype.isOnCurve = function () {
    var x = this.getX().toBigInteger();
    var y = this.getY().toBigInteger();
    var a = this.curve.getA().toBigInteger();
    var b = this.curve.getB().toBigInteger();
    var n = this.curve.getQ();
    var lhs = y.multiply(y).mod(n);
    var rhs = x.multiply(x).multiply(x).add(a.multiply(x)).add(b).mod(n);
    return lhs.equals(rhs)
};
ECPointFp.prototype.toString = function () {
    return "(" + this.getX().toBigInteger().toString() + "," + this.getY().toBigInteger().toString() + ")"
};
ECPointFp.prototype.validate = function () {
    var n = this.curve.getQ();
    if (this.isInfinity()) {
        throw new Error("Point is at infinity.")
    }
    var x = this.getX().toBigInteger();
    var y = this.getY().toBigInteger();
    if (x.compareTo(BigInteger.ONE) < 0 || x.compareTo(n.subtract(BigInteger.ONE)) > 0) {
        throw new Error("x coordinate out of bounds")
    }
    if (y.compareTo(BigInteger.ONE) < 0 || y.compareTo(n.subtract(BigInteger.ONE)) > 0) {
        throw new Error("y coordinate out of bounds")
    }
    if (!this.isOnCurve()) {
        throw new Error("Point is not on the curve.")
    }
    if (this.multiply(n).isInfinity()) {
        throw new Error("Point is not a scalar multiple of G.")
    }
    return true
};
if (typeof KJUR == "undefined" || !KJUR) {
    KJUR = {}
}
if (typeof KJUR.crypto == "undefined" || !KJUR.crypto) {
    KJUR.crypto = {}
}
KJUR.crypto.ECDSA = function (params) {
    var curveName = "secp256r1";
    var ecparams = null;
    var prvKeyHex = null;
    var pubKeyHex = null;
    var rng = new SecureRandom();
    var P_OVER_FOUR = null;
    this.type = "EC";
    function implShamirsTrick(P, k, Q, l) {
        var m = Math.max(k.bitLength(), l.bitLength());
        var Z = P.add2D(Q);
        var R = P.curve.getInfinity();
        for (var i = m - 1; i >= 0; i -= 1) {
            R = R.twice2D();
            R.z = BigInteger.ONE;
            if (k.testBit(i)) {
                if (l.testBit(i)) {
                    R = R.add2D(Z)
                } else {
                    R = R.add2D(P)
                }
            } else {
                if (l.testBit(i)) {
                    R = R.add2D(Q)
                }
            }
        }
        return R
    }

    this.getBigRandom = function (limit) {
        return new BigInteger(limit.bitLength(), rng).mod(limit.subtract(BigInteger.ONE)).add(BigInteger.ONE)
    };
    this.setNamedCurve = function (curveName) {
        this.ecparams = KJUR.crypto.ECParameterDB.getByName(curveName);
        this.prvKeyHex = null;
        this.pubKeyHex = null;
        this.curveName = curveName
    };
    this.setPrivateKeyHex = function (prvKeyHex) {
        this.isPrivate = true;
        this.prvKeyHex = prvKeyHex
    };
    this.setPublicKeyHex = function (pubKeyHex) {
        this.isPublic = true;
        this.pubKeyHex = pubKeyHex
    };
    this.getPublicKeyXYHex = function () {
        var h = this.pubKeyHex;
        if (h.substr(0, 2) !== "04") {
            throw"this method supports uncompressed format(04) only"
        }
        var charlen = this.ecparams.keylen / 4;
        if (h.length !== 2 + charlen * 2) {
            throw"malformed public key hex length"
        }
        var result = {};
        result.x = h.substr(2, charlen);
        result.y = h.substr(2 + charlen);
        return result
    };
    this.getShortNISTPCurveName = function () {
        var s = this.curveName;
        if (s === "secp256r1" || s === "NIST P-256" || s === "P-256" || s === "prime256v1") {
            return "P-256"
        }
        if (s === "secp384r1" || s === "NIST P-384" || s === "P-384") {
            return "P-384"
        }
        return null
    };
    this.generateKeyPairHex = function () {
        var biN = this.ecparams["n"];
        var biPrv = this.getBigRandom(biN);
        var epPub = this.ecparams["G"].multiply(biPrv);
        var biX = epPub.getX().toBigInteger();
        var biY = epPub.getY().toBigInteger();
        var charlen = this.ecparams["keylen"] / 4;
        var hPrv = ("0000000000" + biPrv.toString(16)).slice(-charlen);
        var hX = ("0000000000" + biX.toString(16)).slice(-charlen);
        var hY = ("0000000000" + biY.toString(16)).slice(-charlen);
        var hPub = "04" + hX + hY;
        this.setPrivateKeyHex(hPrv);
        this.setPublicKeyHex(hPub);
        return {"ecprvhex": hPrv, "ecpubhex": hPub}
    };
    this.signWithMessageHash = function (hashHex) {
        return this.signHex(hashHex, this.prvKeyHex)
    };
    this.signHex = function (hashHex, privHex) {
        var d = new BigInteger(privHex, 16);
        var n = this.ecparams["n"];
        var e = new BigInteger(hashHex, 16);
        do {
            var k = this.getBigRandom(n);
            var G = this.ecparams["G"];
            var Q = G.multiply(k);
            var r = Q.getX().toBigInteger().mod(n)
        } while (r.compareTo(BigInteger.ZERO) <= 0);
        var s = k.modInverse(n).multiply(e.add(d.multiply(r))).mod(n);
        return KJUR.crypto.ECDSA.biRSSigToASN1Sig(r, s)
    };
    this.sign = function (hash, priv) {
        var d = priv;
        var n = this.ecparams["n"];
        var e = BigInteger.fromByteArrayUnsigned(hash);
        do {
            var k = this.getBigRandom(n);
            var G = this.ecparams["G"];
            var Q = G.multiply(k);
            var r = Q.getX().toBigInteger().mod(n)
        } while (r.compareTo(BigInteger.ZERO) <= 0);
        var s = k.modInverse(n).multiply(e.add(d.multiply(r))).mod(n);
        return this.serializeSig(r, s)
    };
    this.verifyWithMessageHash = function (hashHex, sigHex) {
        return this.verifyHex(hashHex, sigHex, this.pubKeyHex)
    };
    this.verifyHex = function (hashHex, sigHex, pubkeyHex) {
        var r, s;
        var obj = KJUR.crypto.ECDSA.parseSigHex(sigHex);
        r = obj.r;
        s = obj.s;
        var Q;
        Q = ECPointFp.decodeFromHex(this.ecparams["curve"], pubkeyHex);
        var e = new BigInteger(hashHex, 16);
        return this.verifyRaw(e, r, s, Q)
    };
    this.verify = function (hash, sig, pubkey) {
        var r, s;
        if (Bitcoin.Util.isArray(sig)) {
            var obj = this.parseSig(sig);
            r = obj.r;
            s = obj.s
        } else {
            if ("object" === typeof sig && sig.r && sig.s) {
                r = sig.r;
                s = sig.s
            } else {
                throw"Invalid value for signature"
            }
        }
        var Q;
        if (pubkey instanceof ECPointFp) {
            Q = pubkey
        } else {
            if (Bitcoin.Util.isArray(pubkey)) {
                Q = ECPointFp.decodeFrom(this.ecparams["curve"], pubkey)
            } else {
                throw"Invalid format for pubkey value, must be byte array or ECPointFp"
            }
        }
        var e = BigInteger.fromByteArrayUnsigned(hash);
        return this.verifyRaw(e, r, s, Q)
    };
    this.verifyRaw = function (e, r, s, Q) {
        var n = this.ecparams["n"];
        var G = this.ecparams["G"];
        if (r.compareTo(BigInteger.ONE) < 0 || r.compareTo(n) >= 0) {
            return false
        }
        if (s.compareTo(BigInteger.ONE) < 0 || s.compareTo(n) >= 0) {
            return false
        }
        var c = s.modInverse(n);
        var u1 = e.multiply(c).mod(n);
        var u2 = r.multiply(c).mod(n);
        var point = G.multiply(u1).add(Q.multiply(u2));
        var v = point.getX().toBigInteger().mod(n);
        return v.equals(r)
    };
    this.serializeSig = function (r, s) {
        var rBa = r.toByteArraySigned();
        var sBa = s.toByteArraySigned();
        var sequence = [];
        sequence.push(2);
        sequence.push(rBa.length);
        sequence = sequence.concat(rBa);
        sequence.push(2);
        sequence.push(sBa.length);
        sequence = sequence.concat(sBa);
        sequence.unshift(sequence.length);
        sequence.unshift(48);
        return sequence
    };
    this.parseSig = function (sig) {
        var cursor;
        if (sig[0] != 48) {
            throw new Error("Signature not a valid DERSequence")
        }
        cursor = 2;
        if (sig[cursor] != 2) {
            throw new Error("First element in signature must be a DERInteger")
        }
        var rBa = sig.slice(cursor + 2, cursor + 2 + sig[cursor + 1]);
        cursor += 2 + sig[cursor + 1];
        if (sig[cursor] != 2) {
            throw new Error("Second element in signature must be a DERInteger")
        }
        var sBa = sig.slice(cursor + 2, cursor + 2 + sig[cursor + 1]);
        cursor += 2 + sig[cursor + 1];
        var r = BigInteger.fromByteArrayUnsigned(rBa);
        var s = BigInteger.fromByteArrayUnsigned(sBa);
        return {r: r, s: s}
    };
    this.parseSigCompact = function (sig) {
        if (sig.length !== 65) {
            throw"Signature has the wrong length"
        }
        var i = sig[0] - 27;
        if (i < 0 || i > 7) {
            throw"Invalid signature type"
        }
        var n = this.ecparams["n"];
        var r = BigInteger.fromByteArrayUnsigned(sig.slice(1, 33)).mod(n);
        var s = BigInteger.fromByteArrayUnsigned(sig.slice(33, 65)).mod(n);
        return {r: r, s: s, i: i}
    };
    if (params !== undefined) {
        if (params["curve"] !== undefined) {
            this.curveName = params["curve"]
        }
    }
    if (this.curveName === undefined) {
        this.curveName = curveName
    }
    this.setNamedCurve(this.curveName);
    if (params !== undefined) {
        if (params["prv"] !== undefined) {
            this.setPrivateKeyHex(params["prv"])
        }
        if (params["pub"] !== undefined) {
            this.setPublicKeyHex(params["pub"])
        }
    }
};
KJUR.crypto.ECDSA.parseSigHex = function (sigHex) {
    var p = KJUR.crypto.ECDSA.parseSigHexInHexRS(sigHex);
    var biR = new BigInteger(p.r, 16);
    var biS = new BigInteger(p.s, 16);
    return {"r": biR, "s": biS}
};
KJUR.crypto.ECDSA.parseSigHexInHexRS = function (sigHex) {
    if (sigHex.substr(0, 2) != "30") {
        throw"signature is not a ASN.1 sequence"
    }
    var a = ASN1HEX.getPosArrayOfChildren_AtObj(sigHex, 0);
    if (a.length != 2) {
        throw"number of signature ASN.1 sequence elements seem wrong"
    }
    var iTLV1 = a[0];
    var iTLV2 = a[1];
    if (sigHex.substr(iTLV1, 2) != "02") {
        throw"1st item of sequene of signature is not ASN.1 integer"
    }
    if (sigHex.substr(iTLV2, 2) != "02") {
        throw"2nd item of sequene of signature is not ASN.1 integer"
    }
    var hR = ASN1HEX.getHexOfV_AtObj(sigHex, iTLV1);
    var hS = ASN1HEX.getHexOfV_AtObj(sigHex, iTLV2);
    return {"r": hR, "s": hS}
};
KJUR.crypto.ECDSA.asn1SigToConcatSig = function (asn1Sig) {
    var pSig = KJUR.crypto.ECDSA.parseSigHexInHexRS(asn1Sig);
    var hR = pSig.r;
    var hS = pSig.s;
    if (hR.substr(0, 2) == "00" && (((hR.length / 2) * 8) % (16 * 8)) == 8) {
        hR = hR.substr(2)
    }
    if (hS.substr(0, 2) == "00" && (((hS.length / 2) * 8) % (16 * 8)) == 8) {
        hS = hS.substr(2)
    }
    if ((((hR.length / 2) * 8) % (16 * 8)) != 0) {
        throw"unknown ECDSA sig r length error"
    }
    if ((((hS.length / 2) * 8) % (16 * 8)) != 0) {
        throw"unknown ECDSA sig s length error"
    }
    return hR + hS
};
KJUR.crypto.ECDSA.concatSigToASN1Sig = function (concatSig) {
    if ((((concatSig.length / 2) * 8) % (16 * 8)) != 0) {
        throw"unknown ECDSA concatinated r-s sig  length error"
    }
    var hR = concatSig.substr(0, concatSig.length / 2);
    var hS = concatSig.substr(concatSig.length / 2);
    return KJUR.crypto.ECDSA.hexRSSigToASN1Sig(hR, hS)
};
KJUR.crypto.ECDSA.hexRSSigToASN1Sig = function (hR, hS) {
    var biR = new BigInteger(hR, 16);
    var biS = new BigInteger(hS, 16);
    return KJUR.crypto.ECDSA.biRSSigToASN1Sig(biR, biS)
};
KJUR.crypto.ECDSA.biRSSigToASN1Sig = function (biR, biS) {
    var derR = new KJUR.asn1.DERInteger({"bigint": biR});
    var derS = new KJUR.asn1.DERInteger({"bigint": biS});
    var derSeq = new KJUR.asn1.DERSequence({"array": [derR, derS]});
    return derSeq.getEncodedHex()
};
(function () {
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var Hasher = C_lib.Hasher;
    var C_algo = C.algo;
    var W = [];
    var SM3 = C_algo.SM3 = Hasher.extend({
        _doReset: function () {
            this._hash = new WordArray.init([1937774191, 1226093241, 388252375, 3666478592, 2842636476, 372324522, 3817729613, 2969243214])
        }, _doProcessBlock: function (M, offset) {
            var H = this._hash.words;
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d = H[3];
            var e = H[4];
            for (var i = 0; i < 80; i += 1) {
                if (i < 16) {
                    W[i] = M[offset + i] | 0
                } else {
                    var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
                    W[i] = (n << 1) | (n >>> 31)
                }
                var t = ((a << 5) | (a >>> 27)) + e + W[i];
                if (i < 20) {
                    t += ((b & c) | (~b & d)) + 1518500249
                } else {
                    if (i < 40) {
                        t += (b ^ c ^ d) + 1859775393
                    } else {
                        if (i < 60) {
                            t += ((b & c) | (b & d) | (c & d)) - 1894007588
                        } else {
                            t += (b ^ c ^ d) - 899497514
                        }
                    }
                }
                e = d;
                d = c;
                c = (b << 30) | (b >>> 2);
                b = a;
                a = t
            }
            H[0] = (H[0] + a) | 0;
            H[1] = (H[1] + b) | 0;
            H[2] = (H[2] + c) | 0;
            H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0
        }, _doFinalize: function () {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << (24 - nBitsLeft % 32);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 4294967296);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;
            this._process();
            return this._hash
        }, clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();
            return clone
        }
    });
    C.SM3 = Hasher._createHelper(SM3);
    C.HmacSM3 = Hasher._createHmacHelper(SM3)
}());
function SM3Digest() {
    this.BYTE_LENGTH = 64;
    this.xBuf = [];
    this.xBufOff = 0;
    this.byteCount = 0;
    this.DIGEST_LENGTH = 32;
    this.v0 = [1937774191, 1226093241, 388252375, -628488704, -1452330820, 372324522, -477237683, -1325724082];
    this.v = [, , , , , , ,];
    this.v_ = [, , , , , , ,];
    this.X0 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.X = [68];
    this.xOff = 0;
    this.T_00_15 = 2043430169;
    this.T_16_63 = 2055708042;
    if (arguments.length > 0) {
        this.InitDigest(arguments[0])
    } else {
        this.Init()
    }
}
SM3Digest.prototype = {
    Init: function () {
        this.xBuf = [, , ,];
        this.Reset()
    }, InitDigest: function (t) {
        this.xBuf = [t.xBuf.length];
        Array.Copy(t.xBuf, 0, this.xBuf, 0, t.xBuf.length);
        this.xBufOff = t.xBufOff;
        this.byteCount = t.byteCount;
        Array.Copy(t.X, 0, this.X, 0, t.X.length);
        this.xOff = t.xOff;
        Array.Copy(t.v, 0, this.v, 0, t.v.length)
    }, GetDigestSize: function () {
        return this.DIGEST_LENGTH
    }, Reset: function () {
        this.byteCount = 0;
        this.xBufOff = 0;
        Array.Clear(this.xBuf, 0, this.xBuf.length);
        Array.Copy(this.v0, 0, this.v, 0, this.v0.length);
        this.xOff = 0;
        Array.Copy(this.X0, 0, this.X, 0, this.X0.length)
    }, GetByteLength: function () {
        return this.BYTE_LENGTH
    }, ProcessBlock: function () {
        var i;
        var ww = this.X;
        var ww_ = [64];
        for (i = 16; i < 68; i += 1) {
            ww[i] = this.P1(ww[i - 16] ^ ww[i - 9] ^ (roateLeft(ww[i - 3], 15))) ^ (roateLeft(ww[i - 13], 7)) ^ ww[i - 6]
        }
        for (i = 0; i < 64; i += 1) {
            ww_[i] = ww[i] ^ ww[i + 4]
        }
        var vv = this.v;
        var vv_ = this.v_;
        Array.Copy(vv, 0, vv_, 0, this.v0.length);
        var SS1, SS2, TT1, TT2, aaa;
        for (i = 0; i < 16; i += 1) {
            aaa = roateLeft(vv_[0], 12);
            SS1 = aaa + vv_[4] + roateLeft(this.T_00_15, i);
            SS1 = roateLeft(SS1, 7);
            SS2 = SS1 ^ aaa;
            TT1 = this.FF_00_15(vv_[0], vv_[1], vv_[2]) + vv_[3] + SS2 + ww_[i];
            TT2 = this.GG_00_15(vv_[4], vv_[5], vv_[6]) + vv_[7] + SS1 + ww[i];
            vv_[3] = vv_[2];
            vv_[2] = roateLeft(vv_[1], 9);
            vv_[1] = vv_[0];
            vv_[0] = TT1;
            vv_[7] = vv_[6];
            vv_[6] = roateLeft(vv_[5], 19);
            vv_[5] = vv_[4];
            vv_[4] = this.P0(TT2)
        }
        for (i = 16; i < 64; i += 1) {
            aaa = roateLeft(vv_[0], 12);
            SS1 = aaa + vv_[4] + roateLeft(this.T_16_63, i);
            SS1 = roateLeft(SS1, 7);
            SS2 = SS1 ^ aaa;
            TT1 = this.FF_16_63(vv_[0], vv_[1], vv_[2]) + vv_[3] + SS2 + ww_[i];
            TT2 = this.GG_16_63(vv_[4], vv_[5], vv_[6]) + vv_[7] + SS1 + ww[i];
            vv_[3] = vv_[2];
            vv_[2] = roateLeft(vv_[1], 9);
            vv_[1] = vv_[0];
            vv_[0] = TT1;
            vv_[7] = vv_[6];
            vv_[6] = roateLeft(vv_[5], 19);
            vv_[5] = vv_[4];
            vv_[4] = this.P0(TT2)
        }
        for (i = 0; i < 8; i += 1) {
            vv[i] ^= (vv_[i])
        }
        this.xOff = 0;
        Array.Copy(this.X0, 0, this.X, 0, this.X0.length)
    }, ProcessWord: function (in_Renamed, inOff) {
        var n = in_Renamed[inOff] << 24;
        n |= (in_Renamed[inOff += 1] & 255) << 16;
        n |= (in_Renamed[inOff += 1] & 255) << 8;
        n |= (in_Renamed[inOff += 1] & 255);
        this.X[this.xOff] = n;
        if (++this.xOff == 16) {
            this.ProcessBlock()
        }
    }, ProcessLength: function (bitLength) {
        if (this.xOff > 14) {
            this.ProcessBlock()
        }
        this.X[14] = (this.URShiftLong(bitLength, 32));
        this.X[15] = (bitLength & (4294967295))
    }, IntToBigEndian: function (n, bs, off) {
        bs[off] = (n >>> 24 & 255);
        bs[off += 1] = (n >>> 16 & 255);
        bs[off += 1] = (n >>> 8 & 255);
        bs[off += 1] = (n & 255)
    }, DoFinal: function (out_Renamed, outOff) {
        this.Finish();
        for (var i = 0; i < 8; i += 1) {
            this.IntToBigEndian(this.v[i], out_Renamed, outOff + i * 4)
        }
        this.Reset();
        return this.DIGEST_LENGTH
    }, Update: function (input) {
        this.xBuf[this.xBufOff++] = input;
        if (this.xBufOff == this.xBuf.length) {
            this.ProcessWord(this.xBuf, 0);
            this.xBufOff = 0
        }
        this.byteCount++
    }, BlockUpdate: function (input, inOff, length) {
        while ((this.xBufOff != 0) && (length > 0)) {
            this.Update(input[inOff]);
            inOff += 1;
            length -= 1
        }
        while (length > this.xBuf.length) {
            this.ProcessWord(input, inOff);
            inOff += this.xBuf.length;
            length -= this.xBuf.length;
            this.byteCount += this.xBuf.length
        }
        while (length > 0) {
            this.Update(input[inOff]);
            inOff += 1;
            length -= 1
        }
    }, Finish: function () {
        var bitLength = (this.byteCount << 3);
        this.Update((128));
        while (this.xBufOff != 0) {
            this.Update((0))
        }
        this.ProcessLength(bitLength);
        this.ProcessBlock()
    }, ROTATE: function (x, n) {
        return (x << n) | (this.URShift(x, (32 - n)))
    }, P0: function (X) {
        return ((X) ^ roateLeft((X), 9) ^ roateLeft((X), 17))
    }, P1: function (X) {
        return ((X) ^ roateLeft((X), 15) ^ roateLeft((X), 23))
    }, FF_00_15: function (X, Y, Z) {
        return (X ^ Y ^ Z)
    }, FF_16_63: function (X, Y, Z) {
        return ((X & Y) | (X & Z) | (Y & Z))
    }, GG_00_15: function (X, Y, Z) {
        return (X ^ Y ^ Z)
    }, GG_16_63: function (X, Y, Z) {
        return ((X & Y) | (~X & Z))
    }, URShift: function (number, bits) {
        console.error(number);
        if (number > Int32.maxValue || number < Int32.minValue) {
            console.error(number);
            number = IntegerParse(number)
        }
        if (number >= 0) {
            return number >> bits
        } else {
            return (number >> bits) + (2 << ~bits)
        }
    }, URShiftLong: function (number, bits) {
        var returnV;
        var big = new BigInteger();
        big.fromInt(number);
        if (big.signum() >= 0) {
            returnV = big.shiftRight(bits).intValue()
        } else {
            var bigAdd = new BigInteger();
            bigAdd.fromInt(2);
            var shiftLeftBits = ~bits;
            var shiftLeftNumber = "";
            if (shiftLeftBits < 0) {
                var shiftRightBits = 64 + shiftLeftBits;
                for (var i = 0; i < shiftRightBits; i += 1) {
                    shiftLeftNumber += "0"
                }
                var shiftLeftNumberBigAdd = new BigInteger();
                shiftLeftNumberBigAdd.fromInt(number >> bits);
                var shiftLeftNumberBig = new BigInteger("10" + shiftLeftNumber, 2);
                shiftLeftNumber = shiftLeftNumberBig.toRadix(10);
                var r = shiftLeftNumberBig.add(shiftLeftNumberBigAdd);
                returnV = r.toRadix(10)
            } else {
                shiftLeftNumber = bigAdd.shiftLeft((~bits)).intValue();
                returnV = (number >> bits) + shiftLeftNumber
            }
        }
        return returnV
    }, GetZ: function (g, pubKeyHex) {
        var userId = CryptoJS.enc.Utf8.parse("1234567812345679");
        var len = userId.words.length * 4 * 8;
        this.Update((len >> 8 & 255));
        this.Update((len & 255));
        var userIdWords = this.GetWords(userId.toString());
        this.BlockUpdate(userIdWords, 0, userIdWords.length);
        var aWords = this.GetWords(g.curve.a.toBigInteger().toRadix(16));
        var bWords = this.GetWords(g.curve.b.toBigInteger().toRadix(16));
        var gxWords = this.GetWords(g.getX().toBigInteger().toRadix(16));
        var gyWords = this.GetWords(g.getY().toBigInteger().toRadix(16));
        var pxWords = this.GetWords(pubKeyHex.substr(0, 64));
        var pyWords = this.GetWords(pubKeyHex.substr(64, 64));
        this.BlockUpdate(aWords, 0, aWords.length);
        this.BlockUpdate(bWords, 0, bWords.length);
        this.BlockUpdate(gxWords, 0, gxWords.length);
        this.BlockUpdate(gyWords, 0, gyWords.length);
        this.BlockUpdate(pxWords, 0, pxWords.length);
        this.BlockUpdate(pyWords, 0, pyWords.length);
        var md = [this.GetDigestSize()];
        this.DoFinal(md, 0);
        return md
    }, GetWords: function (hexStr) {
        var words = [];
        var hexStrLength = hexStr.length;
        for (var i = 0; i < hexStrLength; i += 2) {
            words[words.length] = parseInt(hexStr.substr(i, 2), 16)
        }
        return words
    }, GetHex: function (arr) {
        var words = [];
        var j = 0;
        for (var i = 0; i < arr.length * 2; i += 2) {
            words[i >>> 3] |= parseInt(arr[j]) << (24 - (i % 8) * 4);
            j += 1
        }
        var wordArray = new CryptoJS.lib.WordArray.init(words, arr.length);
        return wordArray
    }
};
Array.Clear = function (destinationArray, destinationIndex, length) {
    for (elm in destinationArray) {
        destinationArray[elm] = null
    }
};
Array.Copy = function (sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
    var cloneArray = sourceArray.slice(sourceIndex, sourceIndex + length);
    for (var i = 0; i < cloneArray.length; i += 1) {
        destinationArray[destinationIndex] = cloneArray[i];
        destinationIndex += 1
    }
};
function roateLeft(n, distance) {
    return (n << distance) | (n >>> -distance)
}
window.Int32 = {
    minValue: -parseInt("10000000000000000000000000000000", 2),
    maxValue: parseInt("1111111111111111111111111111111", 2),
    parse: function (n) {
        if (n < this.minValue) {
            var bigInteger = new Number(-n);
            var bigIntegerRadix = bigInteger.toString(2);
            var subBigIntegerRadix = bigIntegerRadix.substr(bigIntegerRadix.length - 31, 31);
            var reBigIntegerRadix = "";
            for (var i = 0; i < subBigIntegerRadix.length; i += 1) {
                var subBigIntegerRadixItem = subBigIntegerRadix.substr(i, 1);
                reBigIntegerRadix += subBigIntegerRadixItem == "0" ? "1" : "0"
            }
            var result = parseInt(reBigIntegerRadix, 2);
            return (result + 1)
        } else {
            if (n > this.maxValue) {
                var bigInteger = Number(n);
                var bigIntegerRadix = bigInteger.toString(2);
                var subBigIntegerRadix = bigIntegerRadix.substr(bigIntegerRadix.length - 31, 31);
                var reBigIntegerRadix = "";
                for (var i = 0; i < subBigIntegerRadix.length; i += 1) {
                    var subBigIntegerRadixItem = subBigIntegerRadix.substr(i, 1);
                    reBigIntegerRadix += subBigIntegerRadixItem == "0" ? "1" : "0"
                }
                var result = parseInt(reBigIntegerRadix, 2);
                return -(result + 1)
            } else {
                return n
            }
        }
    },
    parseByte: function (n) {
        if (n > 255) {
            var result = 255 & n;
            return result
        }
        if (n < -256) {
            var result = 255 & n;
            result = 255 ^ result;
            return (result + 1)
        } else {
            return n
        }
    }
};
function IntegerParse(n) {
    if (n > 2147483647 || n < -2147483648) {
        var result = 4294967295 & n;
        if (result > 2147483647) {
            result = 2147483647 & n;
            result = 2147483647 ^ result;
            return -(result + 1)
        }
        return result
    } else {
        return n
    }
}
KJUR.crypto.SM3withSM2 = function (params) {
    var curveName = "sm2";
    var ecparams = null;
    var prvKeyHex = null;
    var pubKeyHex = null;
    var rng = new SecureRandom();
    var P_OVER_FOUR = null;
    this.type = "SM2";
    function implShamirsTrick(P, k, Q, l) {
        var m = Math.max(k.bitLength(), l.bitLength());
        var Z = P.add2D(Q);
        var R = P.curve.getInfinity();
        for (var i = m - 1; i >= 0; --i) {
            R = R.twice2D();
            R.z = BigInteger.ONE;
            if (k.testBit(i)) {
                if (l.testBit(i)) {
                    R = R.add2D(Z)
                } else {
                    R = R.add2D(P)
                }
            } else {
                if (l.testBit(i)) {
                    R = R.add2D(Q)
                }
            }
        }
        return R
    }

    this.getBigRandom = function (limit) {
        return new BigInteger(limit.bitLength(), rng).mod(limit.subtract(BigInteger.ONE)).add(BigInteger.ONE)
    };
    this.setNamedCurve = function (curveName) {
        this.ecparams = KJUR.crypto.ECParameterDB.getByName(curveName);
        this.prvKeyHex = null;
        this.pubKeyHex = null;
        this.curveName = curveName
    };
    this.setPrivateKeyHex = function (prvKeyHex) {
        this.isPrivate = true;
        this.prvKeyHex = prvKeyHex
    };
    this.setPublicKeyHex = function (pubKeyHex) {
        this.isPublic = true;
        this.pubKeyHex = pubKeyHex
    };
    this.generateKeyPairHex = function () {
        var biN = this.ecparams["n"];
        var biPrv = this.getBigRandom(biN);
        var epPub = this.ecparams["G"].multiply(biPrv);
        var biX = epPub.getX().toBigInteger();
        var biY = epPub.getY().toBigInteger();
        var charlen = this.ecparams["keylen"] / 4;
        var hPrv = ("0000000000" + biPrv.toString(16)).slice(-charlen);
        var hX = ("0000000000" + biX.toString(16)).slice(-charlen);
        var hY = ("0000000000" + biY.toString(16)).slice(-charlen);
        var hPub = "04" + hX + hY;
        this.setPrivateKeyHex(hPrv);
        this.setPublicKeyHex(hPub);
        return {"ecprvhex": hPrv, "ecpubhex": hPub}
    };
    this.signWithMessageHash = function (hashHex) {
        return this.signHex(hashHex, this.prvKeyHex)
    };
    this.signHex = function (hashHex, privHex) {
        var d = new BigInteger(privHex, 16);
        var n = this.ecparams["n"];
        var e = new BigInteger(hashHex, 16);
        var k = null;
        var kp = null;
        var r = null;
        var s = null;
        var userD = d;
        do {
            do {
                var keypair = this.generateKeyPairHex();
                k = new BigInteger(keypair.ecprvhex, 16);
                var pubkeyHex = keypair.ecpubhex;
                kp = ECPointFp.decodeFromHex(this.ecparams["curve"], pubkeyHex);
                r = e.add(kp.getX().toBigInteger());
                r = r.mod(n)
            } while (r.equals(BigInteger.ZERO) || r.add(k).equals(n));
            var da_1 = userD.add(BigInteger.ONE);
            da_1 = da_1.modInverse(n);
            s = r.multiply(userD);
            s = k.subtract(s).mod(n);
            s = da_1.multiply(s).mod(n)
        } while (s.equals(BigInteger.ZERO));
        return KJUR.crypto.ECDSA.biRSSigToASN1Sig(r, s)
    };
    this.sign = function (hash, priv) {
        var d = priv;
        var n = this.ecparams["n"];
        var e = BigInteger.fromByteArrayUnsigned(hash);
        do {
            var k = this.getBigRandom(n);
            var G = this.ecparams["G"];
            var Q = G.multiply(k);
            var r = Q.getX().toBigInteger().mod(n)
        } while (r.compareTo(BigInteger.ZERO) <= 0);
        var s = k.modInverse(n).multiply(e.add(d.multiply(r))).mod(n);
        return this.serializeSig(r, s)
    };
    this.verifyWithMessageHash = function (hashHex, sigHex) {
        return this.verifyHex(hashHex, sigHex, this.pubKeyHex)
    };
    this.verifyHex = function (hashHex, sigHex, pubkeyHex) {
        var r, s;
        var obj = KJUR.crypto.ECDSA.parseSigHex(sigHex);
        r = obj.r;
        s = obj.s;
        var Q;
        Q = ECPointFp.decodeFromHex(this.ecparams["curve"], pubkeyHex);
        var e = new BigInteger(hashHex, 16);
        return this.verifyRaw(e, r, s, Q)
    };
    this.verify = function (hash, sig, pubkey) {
        var r, s;
        if (Bitcoin.Util.isArray(sig)) {
            var obj = this.parseSig(sig);
            r = obj.r;
            s = obj.s
        } else {
            if ("object" === typeof sig && sig.r && sig.s) {
                r = sig.r;
                s = sig.s
            } else {
                throw"Invalid value for signature"
            }
        }
        var Q;
        if (pubkey instanceof ECPointFp) {
            Q = pubkey
        } else {
            if (Bitcoin.Util.isArray(pubkey)) {
                Q = ECPointFp.decodeFrom(this.ecparams["curve"], pubkey)
            } else {
                throw"Invalid format for pubkey value, must be byte array or ECPointFp"
            }
        }
        var e = BigInteger.fromByteArrayUnsigned(hash);
        return this.verifyRaw(e, r, s, Q)
    };
    this.verifyRaw = function (e, r, s, Q) {
        var n = this.ecparams["n"];
        var G = this.ecparams["G"];
        var t = r.add(s).mod(n);
        if (t.equals(BigInteger.ZERO)) {
            return false
        }
        var x1y1 = G.multiply(s);
        x1y1 = x1y1.add(Q.multiply(t));
        var R = e.add(x1y1.getX().toBigInteger()).mod(n);
        return r.equals(R)
    };
    this.serializeSig = function (r, s) {
        var rBa = r.toByteArraySigned();
        var sBa = s.toByteArraySigned();
        var sequence = [];
        sequence.push(2);
        sequence.push(rBa.length);
        sequence = sequence.concat(rBa);
        sequence.push(2);
        sequence.push(sBa.length);
        sequence = sequence.concat(sBa);
        sequence.unshift(sequence.length);
        sequence.unshift(48);
        return sequence
    };
    this.parseSig = function (sig) {
        var cursor;
        if (sig[0] != 48) {
            throw new Error("Signature not a valid DERSequence")
        }
        cursor = 2;
        if (sig[cursor] != 2) {
            throw new Error("First element in signature must be a DERInteger")
        }
        var rBa = sig.slice(cursor + 2, cursor + 2 + sig[cursor + 1]);
        cursor += 2 + sig[cursor + 1];
        if (sig[cursor] != 2) {
            throw new Error("Second element in signature must be a DERInteger")
        }
        var sBa = sig.slice(cursor + 2, cursor + 2 + sig[cursor + 1]);
        cursor += 2 + sig[cursor + 1];
        var r = BigInteger.fromByteArrayUnsigned(rBa);
        var s = BigInteger.fromByteArrayUnsigned(sBa);
        return {r: r, s: s}
    };
    this.parseSigCompact = function (sig) {
        if (sig.length !== 65) {
            throw"Signature has the wrong length"
        }
        var i = sig[0] - 27;
        if (i < 0 || i > 7) {
            throw"Invalid signature type"
        }
        var n = this.ecparams["n"];
        var r = BigInteger.fromByteArrayUnsigned(sig.slice(1, 33)).mod(n);
        var s = BigInteger.fromByteArrayUnsigned(sig.slice(33, 65)).mod(n);
        return {r: r, s: s, i: i}
    };
    if (params !== undefined) {
        if (params["curve"] !== undefined) {
            this.curveName = params["curve"]
        }
    }
    if (this.curveName === undefined) {
        this.curveName = curveName
    }
    this.setNamedCurve(this.curveName);
    if (params !== undefined) {
        if (params["prv"] !== undefined) {
            this.setPrivateKeyHex(params["prv"])
        }
        if (params["pub"] !== undefined) {
            this.setPublicKeyHex(params["pub"])
        }
    }
};
KJUR.crypto.ECParameterDB = new function () {
    var db = {};
    var aliasDB = {};

    function hex2bi(hex) {
        return new BigInteger(hex, 16)
    }

    this.getByName = function (nameOrAlias) {
        var name = nameOrAlias;
        if (typeof aliasDB[name] != "undefined") {
            name = aliasDB[nameOrAlias]
        }
        if (typeof db[name] != "undefined") {
            return db[name]
        }
        throw"unregistered EC curve name: " + name
    };
    this.regist = function (name, keylen, pHex, aHex, bHex, nHex, hHex, gxHex, gyHex, aliasList, oid, info) {
        db[name] = {};
        var p = hex2bi(pHex);
        var a = hex2bi(aHex);
        var b = hex2bi(bHex);
        var n = hex2bi(nHex);
        var h = hex2bi(hHex);
        var curve = new ECCurveFp(p, a, b);
        var G = curve.decodePointHex("04" + gxHex + gyHex);
        db[name]["name"] = name;
        db[name]["keylen"] = keylen;
        db[name]["curve"] = curve;
        db[name]["G"] = G;
        db[name]["n"] = n;
        db[name]["h"] = h;
        db[name]["oid"] = oid;
        db[name]["info"] = info;
        for (var i = 0; i < aliasList.length; i += 1) {
            aliasDB[aliasList[i]] = name
        }
    }
};
KJUR.crypto.ECParameterDB.regist("secp128r1", 128, "FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF", "FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFC", "E87579C11079F43DD824993C2CEE5ED3", "FFFFFFFE0000000075A30D1B9038A115", "1", "161FF7528B899B2D0C28607CA52C5B86", "CF5AC8395BAFEB13C02DA292DDED7A83", [], "", "secp128r1 : SECG curve over a 128 bit prime field");
KJUR.crypto.ECParameterDB.regist("secp160k1", 160, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73", "0", "7", "0100000000000000000001B8FA16DFAB9ACA16B6B3", "1", "3B4C382CE37AA192A4019E763036F4F5DD4D7EBB", "938CF935318FDCED6BC28286531733C3F03C4FEE", [], "", "secp160k1 : SECG curve over a 160 bit prime field");
KJUR.crypto.ECParameterDB.regist("secp160r1", 160, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFC", "1C97BEFC54BD7A8B65ACF89F81D4D4ADC565FA45", "0100000000000000000001F4C8F927AED3CA752257", "1", "4A96B5688EF573284664698968C38BB913CBFC82", "23A628553168947D59DCC912042351377AC5FB32", [], "", "secp160r1 : SECG curve over a 160 bit prime field");
KJUR.crypto.ECParameterDB.regist("secp192k1", 192, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFEE37", "0", "3", "FFFFFFFFFFFFFFFFFFFFFFFE26F2FC170F69466A74DEFD8D", "1", "DB4FF10EC057E9AE26B07D0280B7F4341DA5D1B1EAE06C7D", "9B2F2F6D9C5628A7844163D015BE86344082AA88D95E2F9D", []);
KJUR.crypto.ECParameterDB.regist("secp192r1", 192, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFC", "64210519E59C80E70FA7E9AB72243049FEB8DEECC146B9B1", "FFFFFFFFFFFFFFFFFFFFFFFF99DEF836146BC9B1B4D22831", "1", "188DA80EB03090F67CBF20EB43A18800F4FF0AFD82FF1012", "07192B95FFC8DA78631011ED6B24CDD573F977A11E794811", []);
KJUR.crypto.ECParameterDB.regist("secp224r1", 224, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000001", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFE", "B4050A850C04B3ABF54132565044B0B7D7BFD8BA270B39432355FFB4", "FFFFFFFFFFFFFFFFFFFFFFFFFFFF16A2E0B8F03E13DD29455C5C2A3D", "1", "B70E0CBD6BB4BF7F321390B94A03C1D356C21122343280D6115C1D21", "BD376388B5F723FB4C22DFE6CD4375A05A07476444D5819985007E34", []);
KJUR.crypto.ECParameterDB.regist("secp256k1", 256, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F", "0", "7", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", "1", "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", "483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", []);
KJUR.crypto.ECParameterDB.regist("secp256r1", 256, "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF", "FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC", "5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B", "FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551", "1", "6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296", "4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5", ["NIST P-256", "P-256", "prime256v1"]);
KJUR.crypto.ECParameterDB.regist("secp384r1", 384, "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFC", "B3312FA7E23EE7E4988E056BE3F82D19181D9C6EFE8141120314088F5013875AC656398D8A2ED19D2A85C8EDD3EC2AEF", "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF581A0DB248B0A77AECEC196ACCC52973", "1", "AA87CA22BE8B05378EB1C71EF320AD746E1D3B628BA79B9859F741E082542A385502F25DBF55296C3A545E3872760AB7", "3617de4a96262c6f5d9e98bf9292dc29f8f41dbd289a147ce9da3113b5f0b8c00a60b1ce1d7e819d7a431d7c90ea0e5f", ["NIST P-384", "P-384"]);
KJUR.crypto.ECParameterDB.regist("secp521r1", 521, "1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", "1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC", "051953EB9618E1C9A1F929A21A0B68540EEA2DA725B99B315F3B8B489918EF109E156193951EC7E937B1652C0BD3BB1BF073573DF883D2C34F1EF451FD46B503F00", "1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409", "1", "C6858E06B70404E9CD9E3ECB662395B4429C648139053FB521F828AF606B4D3DBAA14B5E77EFE75928FE1DC127A2FFA8DE3348B3C1856A429BF97E7E31C2E5BD66", "011839296a789a3bc0045c8a5fb42c7d1bd998f54449579b446817afbd17273e662c97ee72995ef42640c550b9013fad0761353c7086a272c24088be94769fd16650", ["NIST P-521", "P-521"]);
KJUR.crypto.ECParameterDB.regist("sm2", 256, "FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF", "FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC", "28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93", "FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123", "1", "32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7", "BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0", ["sm2", "SM2"]);
function SM2Cipher(cipherMode) {
    this.ct = 1;
    this.p2 = null;
    this.sm3keybase = null;
    this.sm3c3 = null;
    this.key = new Array(32);
    this.keyOff = 0;
    if (typeof(cipherMode) != "undefined") {
        this.cipherMode = cipherMode
    } else {
        this.cipherMode = SM2CipherMode.C1C3C2
    }
}
SM2Cipher.prototype = {
    getHexString: function (h) {
        if ((h.length & 1) == 0) {
            return h
        } else {
            return "0" + h
        }
    }, hex2Byte: function (n) {
        if (n > 127 || n < -128) {
            var result = 255 & n;
            if (result > 127) {
                result = 127 & n;
                result = 127 ^ result;
                return -(result + 1)
            }
            return result
        } else {
            return n
        }
    }, Reset: function () {
        this.sm3keybase = new SM3Digest();
        this.sm3c3 = new SM3Digest();
        var xWords = this.GetWords(this.p2.getX().toBigInteger().toRadix(16));
        var yWords = this.GetWords(this.p2.getY().toBigInteger().toRadix(16));
        this.sm3c3.BlockUpdate(xWords, 0, xWords.length);
        this.sm3keybase.BlockUpdate(xWords, 0, xWords.length);
        this.sm3keybase.BlockUpdate(yWords, 0, yWords.length);
        this.ct = 1;
        this.NextKey()
    }, NextKey: function () {
        var sm3keycur = new SM3Digest(this.sm3keybase);
        sm3keycur.Update(this.ct >> 24 & 255);
        sm3keycur.Update(this.ct >> 16 & 255);
        sm3keycur.Update(this.ct >> 8 & 255);
        sm3keycur.Update(this.ct & 255);
        sm3keycur.DoFinal(this.key, 0);
        this.keyOff = 0;
        this.ct++
    }, InitEncipher: function (userKey) {
        var k = null;
        var c1 = null;
        var ec = new KJUR.crypto.ECDSA({"curve": "sm2"});
        var keypair = ec.generateKeyPairHex();
        k = new BigInteger(keypair.ecprvhex, 16);
        var pubkeyHex = keypair.ecpubhex;
        c1 = ECPointFp.decodeFromHex(ec.ecparams["curve"], pubkeyHex);
        this.p2 = userKey.multiply(k);
        this.Reset();
        return c1
    }, EncryptBlock: function (data) {
        this.sm3c3.BlockUpdate(data, 0, data.length);
        for (var i = 0; i < data.length; i++) {
            if (this.keyOff == this.key.length) {
                this.NextKey()
            }
            data[i] ^= this.key[this.keyOff++]
        }
    }, InitDecipher: function (userD, c1) {
        this.p2 = c1.multiply(userD);
        this.Reset()
    }, DecryptBlock: function (data) {
        for (var i = 0; i < data.length; i++) {
            if (this.keyOff == this.key.length) {
                this.NextKey()
            }
            data[i] ^= this.key[this.keyOff++]
        }
        this.sm3c3.BlockUpdate(data, 0, data.length)
    }, Dofinal: function (c3) {
        var yWords = this.GetWords(this.p2.getY().toBigInteger().toRadix(16));
        this.sm3c3.BlockUpdate(yWords, 0, yWords.length);
        this.sm3c3.DoFinal(c3, 0);
        this.Reset()
    }, Encrypt: function (pubKey, plaintext) {
        var data = new Array(plaintext.length);
        Array.Copy(plaintext, 0, data, 0, plaintext.length);
        var c1 = this.InitEncipher(pubKey);
        this.EncryptBlock(data);
        var c3 = new Array(32);
        this.Dofinal(c3);
        var hexString;
        switch (this.cipherMode) {
            case SM2CipherMode.C1C3C2:
                hexString = this.getHexString(c1.getX().toBigInteger().toRadix(16)) + this.getHexString(c1.getY().toBigInteger().toRadix(16)) + this.GetHex(c3).toString() + this.GetHex(data).toString();
                break;
            case SM2CipherMode.C1C2C3:
                hexString = c1.getX().toBigInteger().toRadix(16) + c1.getY().toBigInteger().toRadix(16) + this.GetHex(data).toString() + this.GetHex(c3).toString();
                break;
            default:
                throw new Error("[SM2:Decrypt]invalid type cipherMode(" + this.cipherMode + ")")
        }
        return hexString
    }, GetWords: function (hexStr) {
        var words = [];
        var hexStrLength = hexStr.length;
        for (var i = 0; i < hexStrLength; i += 2) {
            words[words.length] = parseInt(hexStr.substr(i, 2), 16)
        }
        return words
    }, GetHex: function (arr) {
        var words = new Array(32);
        var j = 0;
        for (var i = 0; i < arr.length * 2; i += 2) {
            words[i >>> 3] |= parseInt(arr[j]) << (24 - (i % 8) * 4);
            j++
        }
        var wordArray = new CryptoJS.lib.WordArray.init(words, arr.length);
        return wordArray
    }, Decrypt: function (privateKey, ciphertext) {
        var hexString = ciphertext;
        var c1X = hexString.substr(0, 64);
        var c1Y = hexString.substr(0 + c1X.length, 64);
        var encrypted;
        var c3;
        switch (this.cipherMode) {
            case SM2CipherMode.C1C3C2:
                c3 = hexString.substr(c1X.length + c1Y.length, 64);
                encrypData = hexString.substr(c1X.length + c1Y.length + 64);
                break;
            case SM2CipherMode.C1C2C3:
                encrypData = hexString.substr(c1X.length + c1Y.length, hexString.length - c1X.length - c1Y.length - 64);
                c3 = hexString.substr(hexString.length - 64);
                break;
            default:
                throw new Error("[SM2:Decrypt]invalid type cipherMode(" + this.cipherMode + ")")
        }
        var data = this.GetWords(encrypData);
        var c1 = this.CreatePoint(c1X, c1Y);
        this.InitDecipher(privateKey, c1);
        this.DecryptBlock(data);
        var c3_ = new Array(32);
        this.Dofinal(c3_);
        var isDecrypt = this.GetHex(c3_).toString() == c3;
        if (isDecrypt) {
            var wordArray = this.GetHex(data);
            var decryptData = CryptoJS.enc.Utf8.stringify(wordArray);
            return decryptData
        } else {
            throw new Error("[SM2:Decrypt] C3 is not match!");
            return ""
        }
    }, CreatePoint: function (x, y) {
        var ec = new KJUR.crypto.ECDSA({"curve": "sm2"});
        var ecc_curve = ec.ecparams["curve"];
        var pubkeyHex = "04" + x + y;
        var point = ECPointFp.decodeFromHex(ec.ecparams["curve"], pubkeyHex);
        return point
    }
};
window.SM2CipherMode = {C1C2C3: 0, C1C3C2: 1};
function sm2Encrypt(data, publickey, cipherMode) {
    cipherMode = cipherMode == 0 ? cipherMode : 1;
    var msgData = CryptoJS.enc.Utf8.parse(data);
    var pubkeyHex = publickey;
    if (pubkeyHex.length > 64 * 2) {
        pubkeyHex = pubkeyHex.substr(pubkeyHex.length - 64 * 2)
    }
    var xHex = pubkeyHex.substr(0, 64);
    var yHex = pubkeyHex.substr(64);
    var cipher = new SM2Cipher(cipherMode);
    var userKey = cipher.CreatePoint(xHex, yHex);
    msgData = cipher.GetWords(msgData.toString());
    var encryptData = cipher.Encrypt(userKey, msgData);
    return "04" + encryptData
}
function sm2Decrypt(encrypted, privateKey, cipherMode) {
    cipherMode = cipherMode == 0 ? cipherMode : 1;
    encrypted = encrypted.substr(2);
    var privKey = new BigInteger(privateKey, 16);
    var cipher = new SM2Cipher(cipherMode);
    var decryptData = cipher.Decrypt(privKey, encrypted);
    return decryptData
};
