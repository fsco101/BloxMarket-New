import express from 'express';
import { verificationController, upload } from '../controllers/verificationController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();

// Routes that require authentication
router.use(authenticateToken);

// Apply for middleman status (regular authenticated users)
router.post('/apply', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Multer error (file too large, etc.)
        return res.status(400).json({ error: err.message });
      } else {
        // Unknown error
        return res.status(500).json({ error: err.message });
      }
    }
    // No error, proceed to controller
    next();
  });
}, verificationController.submitApplication);

// Get current user's application status
router.get('/my-application', verificationController.getUserApplicationStatus);

// Routes that require admin privileges
router.use(requireAdmin);

// Admin routes for managing applications
router.get('/applications', verificationController.getApplications);
router.get('/applications/:applicationId', verificationController.getApplicationById);
router.post('/applications/:applicationId/review', verificationController.reviewApplication);

// Public routes (accessible by all authenticated users)
router.get('/middlemen', verificationController.getActiveMiddlemen);

// Access to documents (with security checks in the controller)
router.get('/documents/:documentId', verificationController.getDocumentById);

export default router;