export class KaryaError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'KaryaError';
  }
}

export const KARYA_ERRORS = {
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 50MB limit', status: 400 },
  INVALID_FILE_TYPE: { code: 'INVALID_FILE_TYPE', message: 'File type not supported. Use PDF, DOCX, or TXT', status: 400 },
  KARYA_NOT_FOUND: { code: 'KARYA_NOT_FOUND', message: 'Work not found', status: 404 },
  NOT_AUTHORIZED: { code: 'NOT_AUTHORIZED', message: 'Not authorized to perform this action', status: 403 },
  INVALID_COLLABORATORS: { code: 'INVALID_COLLABORATORS', message: 'Total collaborator percentage cannot exceed 100%', status: 400 },
  ALREADY_PUBLISHED: { code: 'ALREADY_PUBLISHED', message: 'This work is already published', status: 400 },
  NOT_DRAFT: { code: 'NOT_DRAFT', message: 'Only draft works can be edited', status: 400 },
  MISSING_FILE: { code: 'MISSING_FILE', message: 'File is required', status: 400 },
} as const;
