import '@testing-library/jest-dom';

// Mock File constructor for testing
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
    this.name = fileName;
    this.size = fileBits.reduce((total, bit) => {
      if (typeof bit === 'string') return total + bit.length;
      if (bit instanceof ArrayBuffer) return total + bit.byteLength;
      if (ArrayBuffer.isView(bit)) return total + bit.byteLength;
      return total;
    }, 0);
    this.type = options?.type || '';
    this.lastModified = options?.lastModified || Date.now();
  }
} as any;