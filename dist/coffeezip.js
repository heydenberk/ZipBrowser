(function() {
  var CSInflate, HuftBuild, HuftList, HuftNode, ZipError, ZipFileMember;
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
    CoffeeZip.prototype.extract = function() {
      this.readFile();
      if (!this.iterator) {
        return this.files;
      }
    };
    return CoffeeZip;
  })();
  ZipError = (function() {
    function ZipError(error) {
      throw new Error(error);
    }
    return ZipError;
  })();
  ZipFileMember = (function() {
    var type;
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
        number = (number << 8) + (byte < 0 ? byte + 256 : byte);
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
          position += 1;
        }
      }
      return _results;
    };
    ZipFileMember.prototype.read = function() {
      this.readHeader();
      return this.process();
    };
    type = "text";
    return ZipFileMember;
  })();
  CSInflate = (function() {
    CSInflate.prototype.constants = {
      border: [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
      bufferLength: Math.pow(2, 10),
      distanceLookupBits: 6,
      literalLookupBits: 9,
      methods: {
        0: "storedBlock",
        1: "staticTrees",
        2: "dynamicTrees"
      },
      windowSize: Math.pow(2, 15)
    };
    CSInflate.prototype.bitBuffer = 0;
    CSInflate.prototype.bitLength = 0;
    CSInflate.prototype.buffer = [];
    CSInflate.prototype.copyDistance = 0;
    CSInflate.prototype.copyLength = 0;
    CSInflate.prototype.endOfFile = false;
    CSInflate.prototype.fixedLengthTable = null;
    CSInflate.prototype.inflatePosition = 0;
    CSInflate.prototype.lengthTable = null;
    CSInflate.prototype.method = -1;
    CSInflate.prototype.slide = [];
    CSInflate.prototype.slidePosition = 0;
    function CSInflate(data, binary) {
      this.data = data;
      this.binary = binary != null ? binary : false;
    }
    CSInflate.prototype.inflate = function() {
      var i, inflated, j;
      inflated = this.binary ? [] : "";
      while ((i = this.inflateInternal()) > 0) {
        for (j = 0; (0 <= i ? j < i : j > i); (0 <= i ? j += 1 : j -= 1)) {
          if (this.binary) {
            inflated.push(this.buffer[j]);
          } else {
            inflated += String.fromCharCode(this.buffer[j]);
          }
        }
      }
      return inflated;
    };
    /*
    		inflate (decompress) the codes in a deflated (compressed) block.
    		Return an error code or zero if it all goes ok.
    	*/
    CSInflate.prototype.inflateCodes = function(offset, size) {
      var e, n, t;
      if (size === 0) {
        return 0;
      }
      n = 0;
      while (true) {
        this.needBits(this.literalBits);
        t = this.lengthTable.list[this.getBits(this.literalBits)];
        e = t.e;
        while (e > 16) {
          if (e === 99) {
            return -1;
          }
          this.dumpBits(t.b);
          e -= 16;
          this.needBits(e);
          t = t.t[this.getBits(e)];
          e = t.e;
        }
        this.dumpBits(t.b);
        if (e === 16) {
          this.slidePosition &= this.constants.windowSize - 1;
          this.buffer[offset + n++] = this.slide[this.slidePosition++] = t.n;
          if (n === size) {
            return size;
          }
          continue;
        }
        if (e === 15) {
          break;
        }
        this.needBits(e);
        this.copyLength = t.n + this.getBits(e);
        this.dumpBits(e);
        this.needBits(this.distanceBits);
        t = this.distanceTable.list[this.getBits(this.distanceBits)];
        e = t.e;
        while (e > 16) {
          if (e === 99) {
            return -1;
          }
          this.dumpBits(t.b);
          e -= 16;
          this.needBits(e);
          t = t.t[this.getBits(e)];
          e = t.e;
        }
        this.dumpBits(t.b);
        this.needBits(e);
        this.copyDistance = this.slidePosition - t.n - this.getBits(e);
        this.dumpBits(e);
        while (this.copyLength > 0 && n < size) {
          this.copyLength--;
          this.copyDistance &= this.constants.windowSize - 1;
          this.slidePosition &= this.constants.windowSize - 1;
          this.buffer[offset + n++] = this.slide[this.slidePosition++] = this.slide[this.copyDistance++];
        }
        if (n === size) {
          return size;
        }
      }
      this.method = -1;
      return n;
    };
    CSInflate.prototype.inflateDynamic = function(offset, size) {
      var bitLengthCodes, distanceCodes, h, i, j, l, literalLengthCodes, literalLengths, n, t;
      literalLengths = (function() {
        var _results;
        _results = [];
        for (i = 0; i < 316; i++) {
          _results.push(0);
        }
        return _results;
      })();
      this.needBits(5);
      literalLengthCodes = 257 + this.getBits(5);
      this.dumpBits(5);
      this.needBits(5);
      distanceCodes = 1 + this.getBits(5);
      this.dumpBits(5);
      this.needBits(4);
      bitLengthCodes = 4 + this.getBits(4);
      this.dumpBits(4);
      if (literalLengthCodes > 286 || distanceCodes > 30) {
        return -1;
      }
      for (j = 0; (0 <= bitLengthCodes ? j < bitLengthCodes : j > bitLengthCodes); (0 <= bitLengthCodes ? j += 1 : j -= 1)) {
        this.needBits(3);
        literalLengths[this.constants.border[j]] = this.getBits(3);
        this.dumpBits(3);
      }
      for (j = j; (j <= 19 ? j < 19 : j > 19); (j <= 19 ? j += 1 : j -= 1)) {
        literalLengths[this.constants.border[j]] = 0;
      }
      this.literalBits = 7;
      h = new HuftBuild(literalLengths, 19, 19, null, this.literalBits);
      if (h.status !== 0) {
        return -1;
      }
      this.lengthTable = h.root;
      this.literalBits = h.m;
      n = literalLengthCodes + distanceCodes;
      i = l = 0;
      while (i < n) {
        this.needBits(this.literalBits);
        t = this.lengthTable.list[this.getBits(this.literalBits)];
        j = t.b;
        this.dumpBits(j);
        j = t.n;
        if (j < 16) {
          literalLengths[i++] = l = j;
        } else if (j === 16) {
          this.needBits(2);
          j = 3 + this.getBits(2);
          this.dumpBits(2);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            literalLengths[i++] = l;
          }
        } else if (j === 17) {
          this.needBits(3);
          j = 3 + this.getBits(3);
          this.dumpBits(3);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            literalLengths[i++] = 0;
          }
          l = 0;
        } else {
          this.needBits(7);
          j = 11 + this.getBits(7);
          this.dumpBits(7);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            literalLengths[i++] = 0;
          }
          l = 0;
        }
      }
      this.literalBits = this.constants.literalLookupBits;
      h = new HuftBuild(literalLengths, literalLengthCodes, 257, "literal", this.literalBits);
      if (this.literalBits === 0) {
        h.status = 1;
      }
      if (h.status !== 0) {
        if (h.status === 1) {
          return -1;
        }
      }
      this.lengthTable = h.root;
      this.literalBits = h.m;
      for (i = 0; (0 <= distanceCodes ? i < distanceCodes : i > distanceCodes); (0 <= distanceCodes ? i += 1 : i -= 1)) {
        literalLengths[i] = literalLengths[i + literalLengthCodes];
      }
      this.distanceBits = this.constants.distanceLookupBits;
      h = new HuftBuild(literalLengths, distanceCodes, 0, "distance", this.distanceBits);
      this.distanceTable = h.root;
      this.distanceBits = h.m;
      if (this.distanceBits === 0 && literalLengthCodes > 257) {
        return -1;
      }
      if (h.status === 1) {
        null;
      }
      if (h.status !== 0) {
        return -1;
      }
      return this.inflateCodes(offset, size);
    };
    /*
    		Decompress an inflated type 1 (fixed Huffman codes) block.  We should
    		either replace this with a custom decoder, or at least precompute the
    		Huffman tables.
    	*/
    CSInflate.prototype.inflateFixed = function(offset, size) {
      var h, l, n, _ref;
      if (this.fixedLengthTable === null) {
        l = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8];
        this.fixedLiteralBits = 7;
        h = new HuftBuild(l, 288, 257, "literal", this.fixedLiteralBits);
        if (h.status !== 0) {
          console.error("HufBuild error: " + h.status);
          return -1;
        }
        this.fixedLengthTable = h.root;
        this.fixedLiteralBits = h.m;
        [].splice.apply(l, [0, 30].concat(_ref = (function() {
          var _results;
          _results = [];
          for (n = 0; n < 30; n++) {
            _results.push(5);
          }
          return _results;
        })())), _ref;
        this.fixedDistanceBits = 5;
        h = new HuftBuild(l, 30, 0, "distance", this.fixedDistanceBits);
        if (h.status > 1) {
          this.fixedLengthTable = null;
          console.error("HufBuild error: " + h.status);
          return -1;
        }
        this.fixedDistanceTable = h.root;
        this.fixedDistanceBits = h.m;
        this.lengthTable = this.fixedLengthTable;
        this.distanceTable = this.fixedDistanceTable;
        this.literalBits = this.fixedLiteralBits;
        this.distanceBits = this.fixedDistanceBits;
        return this.inflateCodes(offset, size);
      }
    };
    CSInflate.prototype.inflateInternal = function() {
      var i, n, offset, size;
      offset = 0;
      size = this.constants.bufferLength;
      n = 0;
      while (n < size) {
        if (this.endOfFile && this.method === -1) {
          return n;
        }
        if (this.copyLength > 0) {
          if (this.constants.methods[this.method] !== "storedBlock") {
            while (this.copyLength > 0 && n < size) {
              this.copyLength--;
              this.copyDistance &= this.constants.windowSize - 1;
              this.slidePosition &= this.constants.windowSize - 1;
              this.buffer[offset + n++] = this.slide[this.slidePosition++] = this.slide[this.copyDistance++];
            }
          } else {
            while (this.copyLength > 0 && n < size) {
              this.copyLength--;
              this.slidePosition &= this.constants.windowSize - 1;
              this.needBits(8);
              this.buffer[offset + n++] = this.slide[this.slidePosition++] = this.getBits(8);
              this.dumpBits(8);
            }
            if (this.copyLength === 0) {
              this.method = -1;
            }
          }
          if (n === size) {
            return n;
          }
        }
        if (this.method === -1) {
          if (this.endOfFile) {
            break;
          }
          this.needBits(1);
          if (this.getBits(1) !== 0) {
            this.endOfFile = true;
          }
          this.dumpBits(1);
          this.needBits(2);
          this.method = this.getBits(2);
          this.dumpBits(2);
          this.lengthTable = null;
          this.copyLength = 0;
        }
        offset += n;
        size -= n;
        switch (this.constants.methods[this.method]) {
          case "storedBlock":
            i = this.inflateStored(offset, size);
            break;
          case "staticTrees":
            i = this.lengthTable !== null ? this.inflateCodes(offset, size) : this.inflateFixed(offset, size);
            break;
          case "dynamicTrees":
            i = this.lengthTable !== null ? this.inflateCodes(offset, size) : this.inflateDynamic(offset, size);
            break;
          default:
            i = -1;
        }
        if (i === -1) {
          if (this.endOfFile) {
            return 0;
          }
          return -1;
        }
        n += i;
      }
      return n;
    };
    CSInflate.prototype.inflateStored = function(offset, size) {
      var n;
      n = this.bitLength & 7;
      this.dumpBits(n);
      this.needBits(16);
      n = this.getBits(16);
      this.dumpBits(16);
      this.needBits(16);
      if (n !== ((~this.bitBuffer) & 0xffff)) {
        return -1;
      }
      this.dumpBits(16);
      this.copyLength = n;
      n = 0;
      while (this.copyLength > 0 && n < size) {
        this.copyLength--;
        this.slidePosition &= this.constants.windowSize - 1;
        this.needBits(8);
        this.buffer[offset + n++] = this.slide[this.slidePosition++] = this.getBits(8);
        this.dumpBits(8);
      }
      if (this.copyLength === 0) {
        this.method = -1;
      }
      return n;
    };
    CSInflate.prototype.getByte = function() {
      if (this.data.length === this.inflatePosition) {
        return -1;
      } else {
        return this.data[this.inflatePosition++] & 0xff;
      }
    };
    CSInflate.prototype.needBits = function(n) {
      var _results;
      _results = [];
      while (this.bitLength < n) {
        this.bitBuffer |= this.getByte() << this.bitLength;
        _results.push(this.bitLength += 8);
      }
      return _results;
    };
    CSInflate.prototype.getBits = function(n) {
      return this.bitBuffer & (Math.pow(2, n) - 1);
    };
    CSInflate.prototype.dumpBits = function(n) {
      this.bitBuffer >>= n;
      return this.bitLength -= n;
    };
    return CSInflate;
  })();
  HuftList = (function() {
    function HuftList() {}
    HuftList.prototype.list = null;
    HuftList.prototype.next = null;
    return HuftList;
  })();
  HuftNode = (function() {
    function HuftNode() {}
    HuftNode.prototype.e = 0;
    HuftNode.prototype.b = 0;
    HuftNode.prototype.n = 0;
    HuftNode.prototype.t = null;
    return HuftNode;
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
  HuftBuild = (function() {
    HuftBuild.prototype.constants = {
      copyLengths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0],
      distanceCodeCopyOffsets: [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
      distanceCodeExtraBits: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13],
      extraBits: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99]
    };
    HuftBuild.prototype.BMAX = 16;
    HuftBuild.prototype.m = 0;
    HuftBuild.prototype.N_MAX = 288;
    HuftBuild.prototype.root = null;
    HuftBuild.prototype.status = 0;
    HuftBuild.prototype.baseValues = null;
    HuftBuild.prototype.extraBits = null;
    HuftBuild.prototype.tableEntry = new HuftNode();
    HuftBuild.prototype.tail = null;
    function HuftBuild(codeLength, codes, simpleCodes, distanceOrLiteral, maximumLookup) {
      this.codeLength = codeLength;
      this.codes = codes;
      this.simpleCodes = simpleCodes;
      this.distanceOrLiteral = distanceOrLiteral;
      this.maximumLookup = maximumLookup;
      this.init();
    }
    HuftBuild.prototype.init = function() {
      var bMaxRange, bitOffsetPointer, codesCounter, counter, currentCodeBits, currentCodeCounter, currentCodePeriod, currentTable, currentTableEntries, dummyCodes, maxCodeLen, n, tableLevel, _ref, _ref2, _ref3, _ref4, _ref5;
      if (this.distanceOrLiteral === "distance") {
        this.baseValues = this.constants.distanceCodeCopyOffsets;
        this.extraBits = this.constants.distanceCodeExtraBits;
      } else if (this.distanceOrLiteral === "literal") {
        this.baseValues = this.constants.copyLengths;
        this.extraBits = this.constants.extraBits;
      }
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
                _results.push(new HuftNode());
              }
              return _results;
            })();
            if (this.tail === null) {
              this.tail = this.root = new HuftList();
            } else {
              this.tail = this.tail.next = new HuftList();
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
    return HuftBuild;
  })();
}).call(this);
