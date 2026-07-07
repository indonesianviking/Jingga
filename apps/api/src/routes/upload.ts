import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { uploadToIPFS, getSignedUrl } from '../lib/ipfs';
import { validateFile, validateCover, UPLOAD_ERRORS } from '../utils/fileValidation';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/upload
router.post('/', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const file = req.file;

    const validation = validateFile(file.buffer, file.mimetype);
    if (!validation.valid) {
      res.status(400).json({ error: UPLOAD_ERRORS[validation.error!] || validation.error });
      return;
    }

    const result = await uploadToIPFS(file.buffer, file.originalname, file.mimetype);
    const signedUrl = await getSignedUrl(result.ipfsHash, 3600);

    res.json({
      ipfsHash: result.ipfsHash,
      ipfsUrl: result.ipfsUrl,
      gatewayUrl: result.gatewayUrl,
      signedUrl,
      fileHash: result.fileHash,
      fileSizeBytes: result.fileSizeBytes,
      filename: file.originalname,
      mimeType: file.mimetype,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({ error: UPLOAD_ERRORS.UPLOAD_FAILED });
  }
});

// POST /api/v1/upload/cover
router.post('/cover', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const file = req.file;

    const validation = validateCover(file.buffer, file.mimetype);
    if (!validation.valid) {
      res.status(400).json({ error: UPLOAD_ERRORS[validation.error!] || validation.error });
      return;
    }

    const result = await uploadToIPFS(file.buffer, file.originalname, file.mimetype);

    res.json({
      ipfsHash: result.ipfsHash,
      gatewayUrl: result.gatewayUrl,
      fileHash: result.fileHash,
      fileSizeBytes: result.fileSizeBytes,
    });
  } catch (error) {
    console.error('[Upload] Cover error:', error);
    res.status(500).json({ error: UPLOAD_ERRORS.UPLOAD_FAILED });
  }
});

export default router;
