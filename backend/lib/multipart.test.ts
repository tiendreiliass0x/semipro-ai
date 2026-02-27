import { describe, expect, test } from 'bun:test';
import { parseMultipart } from './multipart';

const buildMultipartBody = (boundary: string, parts: Array<{ name: string; value?: string; filename?: string; type?: string; data?: Uint8Array }>) => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  for (const part of parts) {
    let header = `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"`;
    if (part.filename) header += `; filename="${part.filename}"`;
    header += '\r\n';
    if (part.type) header += `Content-Type: ${part.type}\r\n`;
    header += '\r\n';

    chunks.push(encoder.encode(header));
    if (part.data) {
      chunks.push(part.data);
    } else {
      chunks.push(encoder.encode(part.value || ''));
    }
    chunks.push(encoder.encode('\r\n'));
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));

  let totalLength = 0;
  for (const c of chunks) totalLength += c.length;
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.length;
  }
  return body;
};

const createMultipartRequest = (boundary: string, body: Uint8Array) => {
  return new Request('http://localhost/upload', {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
};

describe('parseMultipart', () => {
  test('parses single text field', async () => {
    const boundary = 'test-boundary-123';
    const body = buildMultipartBody(boundary, [{ name: 'title', value: 'Hello World' }]);
    const req = createMultipartRequest(boundary, body);
    const result = await parseMultipart(req);

    expect(result.fields['title']).toBe('Hello World');
    expect(result.files.length).toBe(0);
  });

  test('parses file upload', async () => {
    const boundary = 'file-boundary';
    const fileData = new TextEncoder().encode('PNG file data here');
    const body = buildMultipartBody(boundary, [
      { name: 'image', filename: 'photo.png', type: 'image/png', data: fileData },
    ]);
    const req = createMultipartRequest(boundary, body);
    const result = await parseMultipart(req);

    expect(result.files.length).toBe(1);
    expect(result.files[0].name).toBe('image');
    expect(result.files[0].filename).toBe('photo.png');
    expect(result.files[0].type).toBe('image/png');
  });

  test('parses mixed fields and files', async () => {
    const boundary = 'mixed-boundary';
    const fileData = new TextEncoder().encode('JPEG data');
    const body = buildMultipartBody(boundary, [
      { name: 'caption', value: 'My photo' },
      { name: 'file', filename: 'img.jpg', type: 'image/jpeg', data: fileData },
    ]);
    const req = createMultipartRequest(boundary, body);
    const result = await parseMultipart(req);

    expect(result.fields['caption']).toBe('My photo');
    expect(result.files.length).toBe(1);
    expect(result.files[0].filename).toBe('img.jpg');
  });

  test('returns empty for non-multipart content type', async () => {
    const req = new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const result = await parseMultipart(req);
    expect(result.fields).toEqual({});
    expect(result.files).toEqual([]);
  });

  test('throws when payload exceeds maxBytes', async () => {
    const boundary = 'size-boundary';
    const largeData = new Uint8Array(1000);
    const body = buildMultipartBody(boundary, [
      { name: 'file', filename: 'big.bin', type: 'application/octet-stream', data: largeData },
    ]);
    const req = createMultipartRequest(boundary, body);

    expect(parseMultipart(req, { maxBytes: 100 })).rejects.toThrow('exceeds');
  });
});
