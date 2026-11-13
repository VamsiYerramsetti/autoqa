// Reads one part of a zip file (PowerPoint and Word files are zips) with a hard size cap.
// The size a zip says a part has is written by whoever made the file, so it can lie: a few kilobytes can unpack
// into gigabytes. We count the bytes as they actually come out and give up the moment the cap is passed.
export function readPart(zip, file, { cap = 20_000_000, type = 'string' } = {}) {
  const part = file && zip.file(file);
  if (!part || (part._data?.uncompressedSize || 0) > cap) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0, done = false;
    const finish = (value) => { if (!done) { done = true; resolve(value); } };
    const stream = part.internalStream('uint8array');
    stream
      .on('data', (chunk) => {
        if (done) return;
        size += chunk.length;
        if (size > cap) { stream.pause(); finish(undefined); } else chunks.push(chunk);
      })
      .on('error', () => finish(undefined))
      .on('end', () => {
        const all = Buffer.concat(chunks);
        finish(type === 'base64' ? all.toString('base64') : all.toString('utf8'));
      })
      .resume();
  });
}
