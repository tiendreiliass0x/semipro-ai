import { basename, extname, join } from 'path';
import { existsSync } from 'fs';
import { parseMultipart } from '../lib/multipart';

type UploadsRouteArgs = {
  req: Request;
  pathname: string;
  method: string;
  uploadsDir: string;
  corsHeaders: Record<string, string>;
  verifyAccessKey: (req: Request) => boolean;
  getRequestAccountId: (req: Request) => string | null;
  getUploadOwnerAccountId: (filename: string) => string | null;
  registerUploadOwnership: (args: { filename: string; accountId: string }) => void;
};

type MultipartFile = {
  name: string;
  data: Uint8Array;
  filename: string;
  type: string;
};

type SupportedImageType = 'jpeg' | 'png' | 'gif' | 'webp';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_MULTI_UPLOAD_BYTES = 30 * 1024 * 1024;
const MAX_MULTI_FILES = 10;

const imageTypeToExtension: Record<SupportedImageType, string> = {
  jpeg: '.jpg',
  png: '.png',
  gif: '.gif',
  webp: '.webp',
};

const getContentType = (ext: string): string => {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return types[ext] || 'application/octet-stream';
};

const jsonHeaders = (corsHeaders: Record<string, string>) => ({
  ...corsHeaders,
  'Content-Type': 'application/json',
});

const detectImageType = (bytes: Uint8Array): SupportedImageType | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return 'png';
  }

  if (
    bytes.length >= 6
    && bytes[0] === 0x47
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x38
    && (bytes[4] === 0x37 || bytes[4] === 0x39)
    && bytes[5] === 0x61
  ) {
    return 'gif';
  }

  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
};

const maxUploadSizeLabel = `${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`;

const uploadTooLargeResponse = (corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify({ error: `Upload too large. Max ${maxUploadSizeLabel}` }), { status: 413, headers: jsonHeaders(corsHeaders) });

const validateImageFile = (file: MultipartFile): { extension: string } | { error: string; status?: 413 } => {
  if (!file.data.length) return { error: 'No valid image uploaded' };
  if (file.data.length > MAX_UPLOAD_BYTES) return { error: `Upload too large. Max ${maxUploadSizeLabel}`, status: 413 };

  const detectedType = detectImageType(file.data);
  if (!detectedType) {
    return { error: 'Unsupported image format. Allowed: jpg, png, gif, webp.' };
  }

  const providedExt = extname(String(file.filename || '')).toLowerCase();
  if (providedExt && !IMAGE_EXTENSIONS.includes(providedExt)) {
    return { error: 'Unsupported file extension. Allowed: .jpg, .jpeg, .png, .gif, .webp' };
  }
  if (providedExt && IMAGE_EXTENSIONS.includes(providedExt)) {
    const normalizedProvidedExt = providedExt === '.jpeg' ? '.jpg' : providedExt;
    const normalizedDetectedExt = imageTypeToExtension[detectedType];
    if (normalizedProvidedExt !== normalizedDetectedExt) {
      return { error: 'File extension does not match image content' };
    }
  }

  return { extension: imageTypeToExtension[detectedType] };
};

const parseUploadFiles = async (args: {
  req: Request;
  maxBytes: number;
  corsHeaders: Record<string, string>;
  payloadTooLargeMessage: string;
}): Promise<{ files: MultipartFile[] } | Response> => {
  const contentLengthHeader = args.req.headers.get('content-length') || '';
  const contentLength = Number(contentLengthHeader);
  if (Number.isFinite(contentLength) && contentLength > args.maxBytes) {
    return new Response(JSON.stringify({ error: args.payloadTooLargeMessage }), { status: 413, headers: jsonHeaders(args.corsHeaders) });
  }

  try {
    const parsed = await parseMultipart(args.req, { maxBytes: args.maxBytes });
    return { files: parsed.files };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('multipart payload exceeds')) {
      return new Response(JSON.stringify({ error: args.payloadTooLargeMessage }), { status: 413, headers: jsonHeaders(args.corsHeaders) });
    }
    return new Response(JSON.stringify({ error: 'Invalid multipart upload payload' }), { status: 400, headers: jsonHeaders(args.corsHeaders) });
  }
};

const buildStoredFilename = (extension: string) =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${extension}`;

export const handleUploadsRoutes = async (args: UploadsRouteArgs): Promise<Response | null> => {
  const { req, pathname, method, uploadsDir, corsHeaders, verifyAccessKey, getRequestAccountId, getUploadOwnerAccountId, registerUploadOwnership } = args;

  if (pathname.startsWith('/uploads/')) {
    const accountId = getRequestAccountId(req);
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    }

    const filename = basename(pathname);
    const ownerAccountId = getUploadOwnerAccountId(filename);
    if (!ownerAccountId || ownerAccountId !== accountId) {
      return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }

    const filePath = join(uploadsDir, filename);
    if (existsSync(filePath)) {
      const ext = extname(filename).toLowerCase();
      const file = Bun.file(filePath);
      return new Response(file, { headers: { ...corsHeaders, 'Content-Type': getContentType(ext) } });
    }
    return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/upload' && method === 'POST') {
    if (!verifyAccessKey(req)) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const accountId = getRequestAccountId(req);
    if (!accountId) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });

    const parsed = await parseUploadFiles({
      req,
      maxBytes: MAX_UPLOAD_BYTES,
      corsHeaders,
      payloadTooLargeMessage: `Upload too large. Max ${maxUploadSizeLabel}`,
    });
    if (parsed instanceof Response) return parsed;

    const imageFile = parsed.files.find(file => file.data.length > 0);
    if (!imageFile) {
      return new Response(JSON.stringify({ error: 'No valid image uploaded' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const validation = validateImageFile(imageFile);
    if ('error' in validation) {
      if (validation.status === 413) return uploadTooLargeResponse(corsHeaders);
      return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const uniqueName = buildStoredFilename(validation.extension);
    const filePath = join(uploadsDir, uniqueName);
    await Bun.write(filePath, imageFile.data);
    registerUploadOwnership({ filename: uniqueName, accountId });

    return new Response(JSON.stringify({ success: true, url: `/uploads/${uniqueName}`, filename: uniqueName }), {
      headers: jsonHeaders(corsHeaders),
    });
  }

  if (pathname === '/api/upload/multiple' && method === 'POST') {
    if (!verifyAccessKey(req)) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const accountId = getRequestAccountId(req);
    if (!accountId) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });

    const parsed = await parseUploadFiles({
      req,
      maxBytes: MAX_MULTI_UPLOAD_BYTES,
      corsHeaders,
      payloadTooLargeMessage: `Upload payload too large. Max ${Math.floor(MAX_MULTI_UPLOAD_BYTES / (1024 * 1024))}MB`,
    });
    if (parsed instanceof Response) return parsed;

    const candidateImages = parsed.files.filter(file => file.data.length > 0);
    if (!candidateImages.length) {
      return new Response(JSON.stringify({ error: 'No valid images uploaded' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }
    if (candidateImages.length > MAX_MULTI_FILES) {
      return new Response(JSON.stringify({ error: `Too many files. Max ${MAX_MULTI_FILES} images per upload.` }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const savedFiles: Array<{ url: string; filename: string; originalName: string; size: number }> = [];
    for (const imageFile of candidateImages) {
      const validation = validateImageFile(imageFile);
      if ('error' in validation) {
        if (validation.status === 413) return uploadTooLargeResponse(corsHeaders);
        return new Response(JSON.stringify({ error: `Invalid image "${imageFile.filename || 'unnamed'}": ${validation.error}` }), { status: 400, headers: jsonHeaders(corsHeaders) });
      }

      const uniqueName = buildStoredFilename(validation.extension);
      const filePath = join(uploadsDir, uniqueName);
      await Bun.write(filePath, imageFile.data);
      registerUploadOwnership({ filename: uniqueName, accountId });
      savedFiles.push({
        url: `/uploads/${uniqueName}`,
        filename: uniqueName,
        originalName: String(imageFile.filename || ''),
        size: imageFile.data.length,
      });
    }

    return new Response(JSON.stringify({ success: true, files: savedFiles }), {
      headers: jsonHeaders(corsHeaders),
    });
  }

  return null;
};
