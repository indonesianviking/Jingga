export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateFile(buffer: Buffer, mimeType: string): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as any)) {
    return { valid: false, error: 'INVALID_FILE_TYPE' };
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'FILE_TOO_LARGE' };
  }
  return { valid: true };
}

export function validateCover(buffer: Buffer, mimeType: string): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as any)) {
    return { valid: false, error: 'INVALID_FILE_TYPE' };
  }
  if (buffer.length > MAX_COVER_SIZE_BYTES) {
    return { valid: false, error: 'FILE_TOO_LARGE' };
  }
  return { valid: true };
}

export const UPLOAD_ERRORS: Record<string, string> = {
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FILE_TYPE: 'File type not supported. Use PDF, DOCX, or TXT.',
  UPLOAD_FAILED: 'Upload failed. Please try again.',
  IPFS_PIN_FAILED: 'Failed to save to IPFS. Please try again.',
  HASH_CALCULATION_FAILED: 'Failed to calculate file hash.',
  RATE_LIMIT_EXCEEDED: 'Upload limit reached. Try again in 1 hour.',
};
