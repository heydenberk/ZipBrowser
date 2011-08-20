(function() {
  var CSInflate, ZipError, ZipFileMember, zipHuftBuild, zipHuftList, zipHuftNode;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  window.CoffeeZip = (function() {
    function CoffeeZip(arrayBuffer, iterator) {
      this.arrayBuffer = arrayBuffer;
      this.iterator = iterator != null ? iterator : null;
    }
    CoffeeZip.prototype.constants = {
      binaryFileExtensions: ["png", "jpg", "jpeg", "jpe", "gif"],
      signatureBytes: [80, 75, 3, 4],
      trailingEOFSignature: "PK"
    };
    CoffeeZip.prototype.files = {};
    CoffeeZip.prototype.filePosition = 0;
    CoffeeZip.prototype.isSignatureValid = function() {
      var byteIndex, signatureBytes;
      signatureBytes = new Uint8Array(this.arrayBuffer, this.filePosition, 4);
      for (byteIndex = 0; byteIndex <= 3; byteIndex++) {
        if (signatureBytes[byteIndex] !== this.constants.signatureBytes[byteIndex]) {
          return false;
        }
      }
      return true;
    };
    CoffeeZip.prototype.readFile = function() {
      var zipFile;
      if (!this.isSignatureValid()) {
        if (this.filePosition === 0) {
          throw new ZipError("File is not proper zip format. Signature does not match.");
        }
        return;
      }
      zipFile = new ZipFileMember(this, this.filePosition + 4);
      zipFile.read();
      this.filePosition = zipFile.end;
      if (zipFile.usesTrailingDescriptor) {
        this.filePosition += 12;
      }
      if (this.iterator) {
        this.iterator(zipFile);
      } else {
        this.files[zipFile.filename] = zipFile.file;
      }
      return this.readFile();
    };
    CoffeeZip.prototype.zipError = function(error) {
      throw new Error("ZipError: " + error);
    };
    CoffeeZip.prototype.extract = function() {
      this.readFile();
      if (!this.iterator) {
        return this.files;
      }
    };
    return CoffeeZip;
  })();
  CSInflate = (function() {
    CSInflate.prototype.zipWSIZE = 32768;
    CSInflate.prototype.zipSTOREDBLOCK = 0;
    CSInflate.prototype.zipSTATICTREES = 1;
    CSInflate.prototype.zipDYNTREES = 2;
    CSInflate.prototype.zipLbits = 9;
    CSInflate.prototype.zipDbits = 6;
    CSInflate.prototype.zipINBUFEXTRA = 64;
    CSInflate.prototype.zipFixedTl = null;
    CSInflate.prototype.zipMaskBits = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535];
    CSInflate.prototype.zipCplens = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0];
    CSInflate.prototype.zipCplext = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99];
    CSInflate.prototype.zipCpdist = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
    CSInflate.prototype.zipCpdext = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    CSInflate.prototype.zipBorder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    CSInflate.prototype.zipSlide = new Array(65536);
    CSInflate.prototype.zipWp = 0;
    CSInflate.prototype.zipBitBuf = 0;
    CSInflate.prototype.zipBitLen = 0;
    CSInflate.prototype.zipMethod = -1;
    CSInflate.prototype.zipEof = false;
    CSInflate.prototype.zipCopyLeng = 0;
    CSInflate.prototype.zipCopyDist = 0;
    CSInflate.prototype.zipTl = null;
    function CSInflate(data, binary) {
      this.data = data;
      this.binary = binary != null ? binary : false;
    }
    CSInflate.prototype.inflate = function() {
      var i, j, out, outVal;
      this.inflateStart();
      this.inflatePos = 0;
      this.buffer = new Array(1024);
      out = [];
      while ((i = this.zipInflateInternal()) > 0) {
        outVal = "";
        for (j = 0; (0 <= i ? j < i : j > i); (0 <= i ? j += 1 : j -= 1)) {
          if (this.binary) {
            out.push(this.buffer[j]);
          } else {
            out.push(String.fromCharCode(this.buffer[j]));
          }
        }
      }
      delete this.data;
      if (this.binary) {
        return out;
      } else {
        return out.join("");
      }
    };
    /*
    		inflate (decompress) the codes in a deflated (compressed) block.
    		Return an error code or zero if it all goes ok.
    	*/
    CSInflate.prototype.zipInflateCodes = function(offset, size) {
      var e, n, t;
      if (size === 0) {
        return 0;
      }
      n = 0;
      while (true) {
        this.zipNeedBits(this.zipBl);
        t = this.zipTl.list[this.zipGetBits(this.zipBl)];
        e = t.e;
        while (e > 16) {
          if (e === 99) {
            return -1;
          }
          this.zipDumpBits(t.b);
          e -= 16;
          this.zipNeedBits(e);
          t = t.t[this.zipGetBits(e)];
          e = t.e;
        }
        this.zipDumpBits(t.b);
        if (e === 16) {
          this.zipWp &= this.zipWSIZE - 1;
          this.buffer[offset + n++] = this.zipSlide[this.zipWp++] = t.n;
          if (n === size) {
            return size;
          }
          continue;
        }
        if (e === 15) {
          break;
        }
        this.zipNeedBits(e);
        this.zipCopyLeng = t.n + this.zipGetBits(e);
        this.zipDumpBits(e);
        this.zipNeedBits(this.zipBd);
        t = this.zipTd.list[this.zipGetBits(this.zipBd)];
        e = t.e;
        while (e > 16) {
          if (e === 99) {
            return -1;
          }
          this.zipDumpBits(t.b);
          e -= 16;
          this.zipNeedBits(e);
          t = t.t[this.zipGetBits(e)];
          e = t.e;
        }
        this.zipDumpBits(t.b);
        this.zipNeedBits(e);
        this.zipCopyDist = this.zipWp - t.n - this.zipGetBits(e);
        this.zipDumpBits(e);
        while (this.zipCopyLeng > 0 && n < size) {
          this.zipCopyLeng--;
          this.zipCopyDist &= this.zipWSIZE - 1;
          this.zipWp &= this.zipWSIZE - 1;
          this.buffer[offset + n++] = this.zipSlide[this.zipWp++] = this.zipSlide[this.zipCopyDist++];
        }
        if (n === size) {
          return size;
        }
      }
      this.zipMethod = -1;
      return n;
    };
    CSInflate.prototype.zipInflateDynamic = function(offset, size) {
      var bitLengthCodes, distanceCodes, h, i, j, l, literalLengthCodes, literalLengths, n, t;
      literalLengths = (function() {
        var _results;
        _results = [];
        for (i = 0; i < 316; i++) {
          _results.push(0);
        }
        return _results;
      })();
      this.zipNeedBits(5);
      literalLengthCodes = 257 + this.zipGetBits(5);
      this.zipDumpBits(5);
      this.zipNeedBits(5);
      distanceCodes = 1 + this.zipGetBits(5);
      this.zipDumpBits(5);
      this.zipNeedBits(4);
      bitLengthCodes = 4 + this.zipGetBits(4);
      this.zipDumpBits(4);
      if (literalLengthCodes > 286 || distanceCodes > 30) {
        return -1;
      }
      for (j = 0; (0 <= bitLengthCodes ? j < bitLengthCodes : j > bitLengthCodes); (0 <= bitLengthCodes ? j += 1 : j -= 1)) {
        this.zipNeedBits(3);
        literalLengths[this.zipBorder[j]] = this.zipGetBits(3);
        this.zipDumpBits(3);
      }
      for (j = j; (j <= 19 ? j < 19 : j > 19); (j <= 19 ? j += 1 : j -= 1)) {
        literalLengths[this.zipBorder[j]] = 0;
      }
      this.zipBl = 7;
      h = new zipHuftBuild(literalLengths, 19, 19, null, null, this.zipBl);
      if (h.status !== 0) {
        return -1;
      }
      this.zipTl = h.root;
      this.zipBl = h.m;
      n = literalLengthCodes + distanceCodes;
      i = l = 0;
      while (i < n) {
        this.zipNeedBits(this.zipBl);
        t = this.zipTl.list[this.zipGetBits(this.zipBl)];
        j = t.b;
        this.zipDumpBits(j);
        j = t.n;
        if (j < 16) {
          literalLengths[i++] = l = j;
        } else if (j === 16) {
          this.zipNeedBits(2);
          j = 3 + this.zipGetBits(2);
          this.zipDumpBits(2);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            literalLengths[i++] = l;
          }
        } else if (j === 17) {
          this.zipNeedBits(3);
          j = 3 + this.zipGetBits(3);
          this.zipDumpBits(3);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            literalLengths[i++] = 0;
          }
          l = 0;
        } else {
          this.zipNeedBits(7);
          j = 11 + this.zipGetBits(7);
          this.zipDumpBits(7);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            literalLengths[i++] = 0;
          }
          l = 0;
        }
      }
      this.zipBl = this.zipLbits;
      h = new zipHuftBuild(literalLengths, literalLengthCodes, 257, this.zipCplens, this.zipCplext, this.zipBl);
      if (this.zipBl === 0) {
        h.status = 1;
      }
      if (h.status !== 0) {
        if (h.status === 1) {
          return -1;
        }
      }
      this.zipTl = h.root;
      this.zipBl = h.m;
      for (i = 0; (0 <= distanceCodes ? i < distanceCodes : i > distanceCodes); (0 <= distanceCodes ? i += 1 : i -= 1)) {
        literalLengths[i] = literalLengths[i + literalLengthCodes];
      }
      this.zipBd = this.zipDbits;
      h = new zipHuftBuild(literalLengths, distanceCodes, 0, this.zipCpdist, this.zipCpdext, this.zipBd);
      this.zipTd = h.root;
      this.zipBd = h.m;
      if (this.zipBd === 0 && literalLengthCodes > 257) {
        return -1;
      }
      if (h.status === 1) {
        null;
      }
      if (h.status !== 0) {
        return -1;
      }
      return this.zipInflateCodes(offset, size);
    };
    /*
    		Decompress an inflated type 1 (fixed Huffman codes) block.  We should
    		either replace this with a custom decoder, or at least precompute the
    		Huffman tables.
    	*/
    CSInflate.prototype.zipInflateFixed = function(offset, size) {
      var h, l, n, _ref;
      if (this.zipFixedTl === null) {
        l = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8];
        this.zipFixedBl = 7;
        h = new zipHuftBuild(l, 288, 257, this.zipCplens, this.zipCplext, this.zipFixedBl);
        if (h.status !== 0) {
          console.error("HufBuild error: " + h.status);
          return -1;
        }
        this.zipFixedTl = h.root;
        this.zipFixedBl = h.m;
        [].splice.apply(l, [0, 30].concat(_ref = (function() {
          var _results;
          _results = [];
          for (n = 0; n < 30; n++) {
            _results.push(5);
          }
          return _results;
        })())), _ref;
        this.zipFixedBd = 5;
        h = new zipHuftBuild(l, 30, 0, this.zipCpdist, this.zipCpdext, this.zipFixedBd);
        if (h.status > 1) {
          this.zipFixedTl = null;
          console.error("HufBuild error: " + h.status);
          return -1;
        }
        this.zipFixedTd = h.root;
        this.zipFixedBd = h.m;
        this.zipTl = this.zipFixedTl;
        this.zipTd = this.zipFixedTd;
        this.zipBl = this.zipFixedBl;
        this.zipBd = this.zipFixedBd;
        return this.zipInflateCodes(offset, size);
      }
    };
    CSInflate.prototype.zipInflateInternal = function() {
      var i, n, offset, size;
      offset = 0;
      size = this.buffer.length;
      n = 0;
      while (n < size) {
        if (this.zipEof && this.zipMethod === -1) {
          return n;
        }
        if (this.zipCopyLeng > 0) {
          if (this.zipMethod !== this.zipSTOREDBLOCK) {
            while (this.zipCopyLeng > 0 && n < size) {
              this.zipCopyLeng--;
              this.zipCopyDist &= this.zipWSIZE - 1;
              this.zipWp &= this.zipWSIZE - 1;
              this.buffer[offset + n++] = this.zipSlide[this.zipWp++] = this.zipSlide[this.zipCopyDist++];
            }
          } else {
            while (this.zipCopyLeng > 0 && n < size) {
              this.zipCopyLeng--;
              this.zipWp &= this.zipWSIZE - 1;
              this.zipNeedBits(8);
              this.buffer[offset + n++] = this.zipSlide[this.zipWp++] = this.zipGetBits(8);
              this.zipDumpBits(8);
            }
            if (this.zipCopyLeng === 0) {
              this.zipMethod = -1;
            }
          }
          if (n === size) {
            return n;
          }
        }
        if (this.zipMethod === -1) {
          if (this.zipEof) {
            break;
          }
          this.zipNeedBits(1);
          if (this.zipGetBits(1) !== 0) {
            this.zipEof = true;
          }
          this.zipDumpBits(1);
          this.zipNeedBits(2);
          this.zipMethod = this.zipGetBits(2);
          this.zipDumpBits(2);
          this.zipTl = null;
          this.zipCopyLeng = 0;
        }
        offset += n;
        size -= n;
        switch (this.zipMethod) {
          case this.zipSTOREDBLOCK:
            i = this.zipInflateStored(offset, size);
            break;
          case this.zipSTATICTREES:
            i = this.zipTl !== null ? this.zipInflateCodes(offset, size) : this.zipInflateFixed(offset, size);
            break;
          case this.zipDYNTREES:
            i = this.zipTl !== null ? this.zipInflateCodes(offset, size) : this.zipInflateDynamic(offset, size);
            break;
          default:
            i = -1;
        }
        if (i === -1) {
          if (this.zipEof) {
            return 0;
          }
          return -1;
        }
        n += i;
      }
      return n;
    };
    CSInflate.prototype.zipInflateStored = function(offset, size) {
      var n;
      n = this.zipBitLen & 7;
      this.zipDumpBits(n);
      this.zipNeedBits(16);
      n = this.zipGetBits(16);
      this.zipDumpBits(16);
      this.zipNeedBits(16);
      if (n !== ((~this.zipBitBuf) & 0xffff)) {
        return -1;
      }
      this.zipDumpBits(16);
      this.zipCopyLeng = n;
      n = 0;
      while (this.zipCopyLeng > 0 && n < size) {
        this.zipCopyLeng--;
        this.zipWp &= this.zipWSIZE - 1;
        this.zipNeedBits(8);
        this.buffer[offset + n++] = this.zipSlide[this.zipWp++] = this.zipGetBits(8);
        this.zipDumpBits(8);
      }
      if (this.zipCopyLeng === 0) {
        this.zipMethod = -1;
      }
      return n;
    };
    CSInflate.prototype.zipGetByte = function() {
      if (this.data.length === this.inflatePos) {
        return -1;
      } else {
        return this.data[this.inflatePos++] & 0xff;
      }
    };
    CSInflate.prototype.zipNeedBits = function(n) {
      var _results;
      _results = [];
      while (this.zipBitLen < n) {
        this.zipBitBuf |= this.zipGetByte() << this.zipBitLen;
        _results.push(this.zipBitLen += 8);
      }
      return _results;
    };
    CSInflate.prototype.zipGetBits = function(n) {
      return this.zipBitBuf & this.zipMaskBits[n];
    };
    CSInflate.prototype.zipDumpBits = function(n) {
      this.zipBitBuf >>= n;
      return this.zipBitLen -= n;
    };
    CSInflate.prototype.inflateStart = function() {
      var _ref;
      (_ref = this.zipSlide) != null ? _ref : this.zipSlide = new Array(2 * this.zipWSIZE);
      this.zipWp = 0;
      this.zipBitBuf = 0;
      this.zipBitLen = 0;
      this.zipMethod = -1;
      this.zipEof = false;
      this.zipCopyLeng = this.zipCopyDist = 0;
      return this.zipTl = null;
    };
    return CSInflate;
  })();
  zipHuftList = (function() {
    function zipHuftList() {}
    zipHuftList.prototype.list = null;
    zipHuftList.prototype.next = null;
    return zipHuftList;
  })();
  zipHuftNode = (function() {
    function zipHuftNode() {}
    zipHuftNode.prototype.e = 0;
    zipHuftNode.prototype.b = 0;
    zipHuftNode.prototype.n = 0;
    zipHuftNode.prototype.t = null;
    return zipHuftNode;
  })();
  /*
  	Given a list of code lengths and a maximum table size, make a set of
  	tables to decode that set of codes.	Return zero on success, one if
  	the given code set is incomplete (the tables are still built in this
  	case), two if the input is invalid (all zero length codes or an
  	oversubscribed set of lengths), and three if not enough memory.
  	The code with value 256 is special, and the tables are constructed
  	so that no bits beyond that code are fetched when that code is
  	decoded.
  */
  zipHuftBuild = (function() {
    zipHuftBuild.prototype.BMAX = 16;
    zipHuftBuild.prototype.m = 0;
    zipHuftBuild.prototype.N_MAX = 288;
    zipHuftBuild.prototype.root = null;
    zipHuftBuild.prototype.status = 0;
    zipHuftBuild.prototype.tableEntry = new zipHuftNode();
    zipHuftBuild.prototype.tail = null;
    function zipHuftBuild(codeLength, codes, simpleCodes, baseValues, extraBits, maximumLookup) {
      this.codeLength = codeLength;
      this.codes = codes;
      this.simpleCodes = simpleCodes;
      this.baseValues = baseValues;
      this.extraBits = extraBits;
      this.maximumLookup = maximumLookup;
      this.init();
    }
    zipHuftBuild.prototype.init = function() {
      var bMaxRange, bitOffsetPointer, codesCounter, counter, currentCodeBits, currentCodeCounter, currentCodePeriod, currentTable, currentTableEntries, dummyCodes, maxCodeLen, n, tableLevel, _ref, _ref2, _ref3, _ref4, _ref5;
      this.tail = null;
      this.bitLengthCounts = (function() {
        var _i, _j, _len, _ref, _ref2, _results, _results2;
        _ref2 = (bMaxRange = (function() {
          _results2 = [];
          for (var _j = 0, _ref = this.BMAX; 0 <= _ref ? _j <= _ref : _j >= _ref; 0 <= _ref ? _j += 1 : _j -= 1){ _results2.push(_j); }
          return _results2;
        }).call(this));
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          n = _ref2[_i];
          _results.push(0);
        }
        return _results;
      }).call(this);
      this.bitStack = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = bMaxRange.length; _i < _len; _i++) {
          n = bMaxRange[_i];
          _results.push(0);
        }
        return _results;
      })();
      this.nodeStack = (function() {
        var _ref, _results;
        _results = [];
        for (n = 0, _ref = this.BMAX; (0 <= _ref ? n < _ref : n > _ref); (0 <= _ref ? n += 1 : n -= 1)) {
          _results.push(null);
        }
        return _results;
      }).call(this);
      this.values = (function() {
        var _ref, _results;
        _results = [];
        for (n = 0, _ref = this.N_MAX; (0 <= _ref ? n < _ref : n > _ref); (0 <= _ref ? n += 1 : n -= 1)) {
          _results.push(0);
        }
        return _results;
      }).call(this);
      this.bitOffsets = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = bMaxRange.length; _i < _len; _i++) {
          n = bMaxRange[_i];
          _results.push(0);
        }
        return _results;
      })();
      this.EOBLength = this.codes > 256 ? this.codeLength[256] : this.BMAX;
      this.pointer = this.codeLength;
      this.pointerIndex = 0;
      currentCodeCounter = this.codes;
      for (currentCodeCounter = _ref = this.codes; (_ref <= 0 ? currentCodeCounter < 0 : currentCodeCounter > 0); (_ref <= 0 ? currentCodeCounter += 1 : currentCodeCounter -= 1)) {
        this.bitLengthCounts[this.pointer[this.pointerIndex]] += 1;
        this.pointerIndex += 1;
      }
      if (this.bitLengthCounts[0] === this.codes) {
        _ref2 = [null, 0, 0], this.root = _ref2[0], this.m = _ref2[1], this.status = _ref2[2];
        return;
      }
      for (counter = 1, _ref3 = this.BMAX; (1 <= _ref3 ? counter <= _ref3 : counter >= _ref3); (1 <= _ref3 ? counter += 1 : counter -= 1)) {
        if (this.bitLengthCounts[counter] !== 0) {
          break;
        }
      }
      currentCodeBits = counter;
      this.maximumLookup = Math.max(this.maximumLookup, counter);
      for (currentCodeCounter = _ref4 = this.BMAX; (_ref4 <= 0 ? currentCodeCounter < 0 : currentCodeCounter > 0); (_ref4 <= 0 ? currentCodeCounter += 1 : currentCodeCounter -= 1)) {
        if (this.bitLengthCounts[currentCodeCounter] !== 0) {
          break;
        }
      }
      maxCodeLen = currentCodeCounter;
      this.maximumLookup = Math.min(this.maximumLookup, currentCodeCounter);
      dummyCodes = 1 << counter;
      while (counter < currentCodeCounter) {
        if ((dummyCodes -= this.bitLengthCounts[counter]) < 0) {
          this.status = 2;
          this.m = this.maximumLookup;
          return;
        }
        counter += 1;
        dummyCodes <<= 1;
      }
      if ((dummyCodes -= this.bitLengthCounts[currentCodeCounter]) < 0) {
        this.status = 2;
        this.m = this.maximumLookup;
        return;
      }
      this.bitLengthCounts[currentCodeCounter] += dummyCodes;
      this.bitOffsets[1] = counter = 0;
      this.pointer = this.bitLengthCounts;
      this.pointerIndex = 1;
      bitOffsetPointer = 2;
      while (--currentCodeCounter > 0) {
        this.bitOffsets[bitOffsetPointer++] = (counter += this.pointer[this.pointerIndex++]);
      }
      this.pointer = this.codeLength;
      this.pointerIndex = 0;
      currentCodeCounter = 0;
      while (currentCodeCounter < this.codes) {
        if ((counter = this.pointer[this.pointerIndex++]) !== 0) {
          this.values[this.bitOffsets[counter]++] = currentCodeCounter;
        }
        currentCodeCounter++;
      }
      this.codes = this.bitOffsets[maxCodeLen];
      this.bitOffsets[0] = currentCodeCounter = 0;
      this.pointer = this.values;
      this.pointerIndex = 0;
      tableLevel = -1;
      dummyCodes = 0;
      this.bitStack[0] = 0;
      currentTable = null;
      currentTableEntries = 0;
      while (currentCodeBits <= maxCodeLen) {
        codesCounter = this.bitLengthCounts[currentCodeBits];
        while (codesCounter-- > 0) {
          while (currentCodeBits > dummyCodes + this.bitStack[1 + tableLevel]) {
            dummyCodes += this.bitStack[1 + tableLevel];
            tableLevel += 1;
            currentTableEntries = (currentTableEntries = maxCodeLen - dummyCodes) > this.maximumLookup ? this.maximumLookup : currentTableEntries;
            if ((currentCodePeriod = 1 << (counter = currentCodeBits - dummyCodes)) > codesCounter + 1) {
              currentCodePeriod -= codesCounter + 1;
              bitOffsetPointer = currentCodeBits;
              while (++counter < currentTableEntries) {
                if ((currentCodePeriod <<= 1) <= this.bitLengthCounts[++bitOffsetPointer]) {
                  break;
                }
                currentCodePeriod -= this.bitLengthCounts[bitOffsetPointer];
              }
            }
            if (dummyCodes + counter > this.EOBLength && dummyCodes < this.EOBLength) {
              counter = this.EOBLength - dummyCodes;
            }
            currentTableEntries = 1 << counter;
            this.bitStack[1 + tableLevel] = counter;
            currentTable = (function() {
              var _results;
              _results = [];
              for (n = 0; (0 <= currentTableEntries ? n < currentTableEntries : n > currentTableEntries); (0 <= currentTableEntries ? n += 1 : n -= 1)) {
                _results.push(new zipHuftNode());
              }
              return _results;
            })();
            if (this.tail === null) {
              this.tail = this.root = new zipHuftList();
            } else {
              this.tail = this.tail.next = new zipHuftList();
            }
            this.tail.next = null;
            this.tail.list = currentTable;
            this.nodeStack[tableLevel] = currentTable;
            /* connect to last table, if there is one */
            if (tableLevel > 0) {
              this.bitOffsets[tableLevel] = currentCodeCounter;
              this.tableEntry.b = this.bitStack[tableLevel];
              this.tableEntry.e = 16 + counter;
              this.tableEntry.t = currentTable;
              counter = (currentCodeCounter & ((1 << dummyCodes) - 1)) >> (dummyCodes - this.bitStack[tableLevel]);
              this.nodeStack[tableLevel - 1][counter].e = this.tableEntry.e;
              this.nodeStack[tableLevel - 1][counter].b = this.tableEntry.b;
              this.nodeStack[tableLevel - 1][counter].n = this.tableEntry.n;
              this.nodeStack[tableLevel - 1][counter].t = this.tableEntry.t;
            }
          }
          this.tableEntry.b = currentCodeBits - dummyCodes;
          if (this.pointerIndex >= this.codes) {
            this.tableEntry.e = 99;
          } else if (this.pointer[this.pointerIndex] < this.simpleCodes) {
            this.tableEntry.e = this.pointer[this.pointerIndex] < 256 ? 16 : 15;
            this.tableEntry.n = this.pointer[this.pointerIndex++];
          } else {
            this.tableEntry.e = this.extraBits[this.pointer[this.pointerIndex] - this.simpleCodes];
            this.tableEntry.n = this.baseValues[this.pointer[this.pointerIndex++] - this.simpleCodes];
          }
          currentCodePeriod = 1 << (currentCodeBits - dummyCodes);
          for (counter = _ref5 = currentCodeCounter >> dummyCodes; (_ref5 <= currentTableEntries ? counter < currentTableEntries : counter > currentTableEntries); counter += currentCodePeriod) {
            currentTable[counter].e = this.tableEntry.e;
            currentTable[counter].b = this.tableEntry.b;
            currentTable[counter].n = this.tableEntry.n;
            currentTable[counter].t = this.tableEntry.t;
          }
          counter = 1 << (currentCodeBits - 1);
          while ((currentCodeCounter & counter) !== 0) {
            currentCodeCounter ^= counter;
            counter >>= 1;
          }
          currentCodeCounter ^= counter;
          while ((currentCodeCounter & ((1 << dummyCodes) - 1)) !== this.bitOffsets[tableLevel]) {
            dummyCodes -= this.bitStack[tableLevel];
            tableLevel--;
          }
        }
        currentCodeBits += 1;
      }
      /* return actual size of base table */
      this.m = this.bitStack[1];
      return this.status = dummyCodes !== 0 && maxCodeLen !== 1 ? 1 : 0;
    };
    return zipHuftBuild;
  })();
  ZipError = (function() {
    function ZipError(error) {
      throw new Error(error);
    }
    return ZipError;
  })();
  ZipFileMember = (function() {
    function ZipFileMember(zip, start) {
      this.zip = zip;
      this.start = start;
    }
    ZipFileMember.prototype.bytesAsNumber = function(bytes) {
      var byte, number, _i, _len, _ref;
      number = 0;
      _ref = Array.prototype.slice.call(bytes).reverse();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        byte = _ref[_i];
        number = (number << 8) + byte;
      }
      return number;
    };
    ZipFileMember.prototype.bytesAsUTF8String = function(bytes) {
      var byte;
      return decodeURIComponent(((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = bytes.length; _i < _len; _i++) {
          byte = bytes[_i];
          _results.push("%" + (byte.toString(16)));
        }
        return _results;
      })()).join(""));
    };
    ZipFileMember.prototype.bytesAsString = function(bytes) {
      var byte;
      return ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = bytes.length; _i < _len; _i++) {
          byte = bytes[_i];
          _results.push(String.fromCharCode(byte));
        }
        return _results;
      })()).join("");
    };
    ZipFileMember.prototype.file = "";
    ZipFileMember.prototype.inflatedBytes = function(bytes) {
      return new CSInflate(bytes, true).inflate();
    };
    ZipFileMember.prototype.inflatedBytesAsString = function(bytes) {
      return new CSInflate(bytes).inflate();
    };
    ZipFileMember.prototype.process = function() {
      var extraFieldStart, fileNameStart, key, value, _ref;
      _ref = this.header;
      for (key in _ref) {
        value = _ref[key];
        this[key] = this.bytesAsNumber(value);
      }
      delete this.header;
      this.isEncrypted = (this.bitFlag & 0x01) === 0x01;
      this.isUTF8 = (this.bitFlag & 0x0800) === 0x0800;
      this.usesTrailingDescriptor = (this.bitFlag & 0x0008) === 0x0008;
      this.filename = this.bytesAsString(new Uint8Array(this.zip.arrayBuffer, (fileNameStart = this.start + 26), this.fileNameLength));
      this.extraField = this.bytesAsString(new Uint8Array(this.zip.arrayBuffer, (extraFieldStart = fileNameStart + this.fileNameLength), this.extraFieldLength));
      this.fileStart = extraFieldStart + this.extraFieldLength;
      return this.readFile();
    };
    ZipFileMember.prototype.readFile = function() {
      var bytes, extension, filenameParts;
      if (this.usesTrailingDescriptor) {
        this.findCompressedSize();
      }
      bytes = new Uint8Array(this.zip.arrayBuffer, this.fileStart, this.compressedSize);
      extension = (filenameParts = this.filename.split("."))[filenameParts.length - 1];
      if (__indexOf.call(this.zip.constants.binaryFileExtensions, extension) >= 0) {
        this.file = this.inflatedBytes(bytes);
        this.type = "binary";
      } else {
        if (this.compressedSize > 0) {
          this.file = (this.uncompressedSize === this.compressedSize ? this.bytesAsString : this.inflatedBytesAsString)(bytes);
        } else {
          this.type = "folder";
        }
      }
      return this.end = this.fileStart + this.compressedSize;
    };
    ZipFileMember.prototype.readHeader = function() {
      return this.header = {
        minimumVersion: new Uint8Array(this.zip.arrayBuffer, this.start, 2),
        bitFlag: new Uint8Array(this.zip.arrayBuffer, this.start + 2, 2),
        compressionMethod: new Uint8Array(this.zip.arrayBuffer, this.start + 4, 2),
        modificationTime: new Uint8Array(this.zip.arrayBuffer, this.start + 6, 2),
        modificationDate: new Uint8Array(this.zip.arrayBuffer, this.start + 8, 2),
        crc32: new Uint8Array(this.zip.arrayBuffer, this.start + 10, 2),
        compressedSize: new Uint8Array(this.zip.arrayBuffer, this.start + 14, 4),
        uncompressedSize: new Uint8Array(this.zip.arrayBuffer, this.start + 18, 4),
        fileNameLength: new Uint8Array(this.zip.arrayBuffer, this.start + 22, 2),
        extraFieldLength: new Uint8Array(this.zip.arrayBuffer, this.start + 24, 2)
      };
    };
    ZipFileMember.prototype.findCompressedSize = function() {
      var byte, position, possibleEOFBytes, _results;
      position = this.fileStart;
      _results = [];
      while (true) {
        try {
          byte = new Uint8Array(this.zip.arrayBuffer, position, 1)[0];
        } catch (e) {
          break;
        }
        if (byte === 80) {
          possibleEOFBytes = new Uint8Array(this.zip.arrayBuffer, position, 4);
          if (this.bytesAsString(possibleEOFBytes) === this.zip.constants.trailingEOFSignature) {
            this.compressedSize = position - this.fileStart;
            break;
          }
        }
        _results.push(position += 1);
      }
      return _results;
    };
    ZipFileMember.prototype.read = function() {
      this.readHeader();
      return this.process();
    };
    ZipFileMember.prototype.type = "text";
    return ZipFileMember;
  })();
}).call(this);
