import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from './document.controller';

const router = Router();
const documentController = new DocumentController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/html',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Document upload
router.post('/upload', upload.single('file'), async (req, res) => {
  await documentController.uploadDocument(req, res);
});

// List documents
router.get('/', async (req, res) => {
  await documentController.listDocuments(req, res);
});

// Health check endpoint (must be before /:id route)
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'document-intelligence',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// Get specific document
router.get('/:id', async (req, res) => {
  await documentController.getDocument(req, res);
});

// Get document analysis
router.get('/:id/analysis', async (req, res) => {
  await documentController.getDocumentAnalysis(req, res);
});

// Analyze document (create or update analysis)
router.post('/:id/analyze', async (req, res) => {
  await documentController.analyzeDocument(req, res);
});

// Answer question about document
router.post('/:id/question', async (req, res) => {
  await documentController.answerQuestion(req, res);
});

// Delete document
router.delete('/:id', async (req, res) => {
  await documentController.deleteDocument(req, res);
});

// Search documents
router.post('/search', async (req, res) => {
  await documentController.searchDocuments(req, res);
});

// Get search results (GET version)
router.get('/search', async (req, res) => {
  await documentController.searchDocuments(req, res);
});

// Get document statistics
router.get('/stats/overview', async (req, res) => {
  await documentController.getDocumentStats(req, res);
});

// File download endpoints
router.get('/files/:filename', async (req, res) => {
  await documentController.downloadFile(req, res);
});

// Generate signed URL for file access
router.get('/files/:filename/signed-url', async (req, res) => {
  await documentController.getSignedUrl(req, res);
});

// Duplicate health check endpoint removed (moved above)

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 50MB.'
      });
    }
  }

  if (error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

export default router;