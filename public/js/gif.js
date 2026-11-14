// A small animated GIF writer (GIF89a), so the moving Auto Q&A code can be made in the browser without a library.
// Usage: const gif = new Gif(width, height, palette); gif.frame(rgbaPixels, delayMs); ... ; const blob = gif.blob();
// The palette is one shared list of at most 16 colours ([[r,g,b], ...]); every pixel is mapped to the nearest one.
// The file loops forever (the NETSCAPE2.0 block). Format reference: https://www.w3.org/Graphics/GIF/spec-gif89a.txt

export class Gif {
  constructor(width, height, palette) {
    if (palette.length > 16) throw new Error('A GIF palette here holds at most 16 colours');
    this.width = width; this.height = height;
    this.palette = palette;
    this.bytes = [];
    this.cache = new Map(); // nearest-colour lookups, keyed by the 24-bit colour
    this.header();
  }

  // Little helpers for writing bytes.
  byte(b) { this.bytes.push(b & 0xff); }
  word(w) { this.byte(w); this.byte(w >> 8); }
  text(s) { for (const ch of s) this.byte(ch.charCodeAt(0)); }

  header() {
    this.text('GIF89a');
    this.word(this.width); this.word(this.height);
    // Packed field: a global colour table is present (1), 8 bits of colour resolution (111), not sorted (0),
    // and a table of 2^(3+1) = 16 entries (011).
    this.byte(0b1111_0011);
    this.byte(0); // background colour index
    this.byte(0); // pixel aspect ratio: square
    for (let i = 0; i < 16; i++) { const [r, g, b] = this.palette[i] || [0, 0, 0]; this.byte(r); this.byte(g); this.byte(b); }
    // Loop forever: application extension "NETSCAPE2.0", sub-block 1, loop count 0.
    this.byte(0x21); this.byte(0xff); this.byte(11); this.text('NETSCAPE2.0');
    this.byte(3); this.byte(1); this.word(0); this.byte(0);
  }

  // The palette index closest to a colour (plain distance in RGB, weighted a little toward green like the eye).
  nearest(r, g, b) {
    const k = (r << 16) | (g << 8) | b;
    let best = this.cache.get(k);
    if (best !== undefined) return best;
    let bestD = Infinity;
    this.palette.forEach(([pr, pg, pb], i) => {
      const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    this.cache.set(k, best);
    return best;
  }

  // Adds one frame from RGBA pixels (e.g. getImageData(...).data). delayMs is rounded to hundredths of a second.
  frame(rgba, delayMs) {
    const n = this.width * this.height, indices = new Uint8Array(n);
    for (let i = 0; i < n; i++) indices[i] = this.nearest(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    // Graphic control extension: how long to show this frame. Disposal 1 (leave it), no transparency.
    this.byte(0x21); this.byte(0xf9); this.byte(4);
    this.byte(0b0000_0100); this.word(Math.round(delayMs / 10)); this.byte(0); this.byte(0);
    // Image descriptor: the whole canvas, no local colour table, not interlaced.
    this.byte(0x2c); this.word(0); this.word(0); this.word(this.width); this.word(this.height); this.byte(0);
    this.lzw(indices, 4);
  }

  // GIF's variable-length LZW: codes start one bit wider than the colour depth and grow up to 12 bits;
  // when the table is full we send a "clear" code and start again. Output is packed least-significant bit first
  // and cut into sub-blocks of at most 255 bytes.
  lzw(indices, minCodeSize) {
    this.byte(minCodeSize);
    const clear = 1 << minCodeSize, end = clear + 1;
    let size = minCodeSize + 1, next = end + 1;
    // The dictionary: entry [prefix code * 16 + next index] holds the code for that string, or -1.
    const table = new Int16Array(4096 * 16).fill(-1);
    const out = []; let acc = 0, bits = 0;
    const emit = (code) => {
      acc |= code << bits; bits += size;
      while (bits >= 8) { out.push(acc & 0xff); acc >>>= 8; bits -= 8; }
    };
    emit(clear);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i], key = prefix * 16 + k;
      if (table[key] >= 0) { prefix = table[key]; continue; }
      emit(prefix);
      if (next < 4096) {
        table[key] = next++;
        // The decoder widens its codes one step later than we add the entry, so widen once `next` passes the limit.
        if (next > (1 << size) && size < 12) size++;
      } else {
        emit(clear); table.fill(-1); size = minCodeSize + 1; next = end + 1;
      }
      prefix = k;
    }
    emit(prefix); emit(end);
    if (bits > 0) out.push(acc & 0xff);
    for (let i = 0; i < out.length; i += 255) {
      const chunk = out.slice(i, i + 255);
      this.byte(chunk.length); for (const b of chunk) this.byte(b);
    }
    this.byte(0); // end of the image data
  }

  // Finishes the file (trailer byte) and returns it as a Blob.
  blob() {
    return new Blob([new Uint8Array([...this.bytes, 0x3b])], { type: 'image/gif' });
  }
}
