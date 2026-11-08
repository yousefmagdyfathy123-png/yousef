const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const rendering = new Set(['IHDR','PLTE','tRNS','IDAT','IEND']);
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit=0; bit<8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  const input = Buffer.from(bytes);
  if (!input.subarray(0,8).equals(signature)) throw new Error('Invalid PNG signature');
  const output = [signature]; let ended = false; let seenHeader = false; let seenData = false;
  for (let i=8; i<input.length;) {
    if (ended || i+12>input.length) throw new Error('Invalid PNG structure');
    const length = input.readUInt32BE(i); const end=i+12+length;
    if (end>input.length) throw new Error('Invalid PNG chunk length');
    const type = input.toString('ascii', i+4, i+8);
    if (crc32(input.subarray(i+4,end-4)) !== input.readUInt32BE(end-4)) throw new Error('Invalid PNG CRC');
    if (!seenHeader && (type !== 'IHDR' || length !== 13)) throw new Error('Invalid PNG header');
    if (type === 'IHDR') { if (seenHeader) throw new Error('Duplicate PNG header'); seenHeader = true; }
    if (type === 'IDAT') seenData = true;
    if (type === 'IEND') { if (length !== 0 || !seenData) throw new Error('Invalid PNG end'); ended = true; }
    if (rendering.has(type)) output.push(input.subarray(i,end));
    else if (!['tEXt','tIME','pHYs'].includes(type)) throw new Error('Unreviewed PNG chunk: source corpus policy must be extended before conversion');
    i=end;
  }
  if (!ended) throw new Error('Missing PNG end');
  return Buffer.concat(output);
}
