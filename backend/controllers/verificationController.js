import { MiddlemanApplication } from '../models/MiddlemanApplication.js';
import { VerificationDocument } from '../models/VerificationDocument.js';
import { User } from '../models/User.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage for document uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Create a unique filename with original extension
    const fileExt = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${fileExt}`;
    cb(null, filename);
  }
});

// Configure upload options
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: function(req, file, cb) {
    // Accept images and PDFs only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
      return cb(new Error('Only image files and PDFs are allowed!'), false);
    }
    cb(null, true);
  }
}).array('documents', 5); // Allow up to 5 files

export const verificationController = {
  // Get all middleman applications (admin only)
  getApplications: async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      
      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        populate: [
          { path: 'user_id', select: 'username email roblox_username avatar_url credibility_score' },
          { path: 'documents' }
        ]
      };
      
      const applications = await MiddlemanApplication.find(query)
        .populate('user_id', 'username email roblox_username avatar_url credibility_score')
        .populate('documents')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);
      
      // Get total counts for each status
      const [total, pending, approved, rejected] = await Promise.all([
        MiddlemanApplication.countDocuments({}),
        MiddlemanApplication.countDocuments({ status: 'pending' }),
        MiddlemanApplication.countDocuments({ status: 'approved' }),
        MiddlemanApplication.countDocuments({ status: 'rejected' })
      ]);
      
      // Enhance each application with trade and vouch counts
      const enhancedApplications = await Promise.all(applications.map(async (application) => {
        const appObject = application.toObject();
        
        // Get trade count
        let tradeCount = 0;
        try {
          const { Trade } = await import('../models/Trade.js');
          tradeCount = await Trade.countDocuments({ user_id: application.user_id._id });
        } catch (err) {
          console.error('Error counting trades:', err);
        }
        
        // Get vouch count
        let vouchCount = 0;
        try {
          const { Vouch } = await import('../models/Vouch.js');
          vouchCount = await Vouch.countDocuments({ 
            user_id: application.user_id._id,
            status: 'approved'
          });
        } catch (err) {
          console.error('Error counting vouches:', err);
        }
        
        return {
          ...appObject,
          trades: tradeCount,
          vouches: vouchCount,
          requestType: 'Middleman'
        };
      }));
      
      res.status(200).json({
        requests: enhancedApplications,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages: Math.ceil(total / options.limit)
        },
        counts: {
          total,
          pending,
          approved,
          rejected
        }
      });
    } catch (error) {
      console.error('Error fetching middleman applications:', error);
      res.status(500).json({ error: 'Failed to fetch middleman applications' });
    }
  },
  
  // Submit middleman application
  submitApplication: async (req, res) => {
    try {
      console.log('Received application submission request');
      console.log('Request body:', req.body);
      console.log('Files received:', req.files ? req.files.length : 'none');
      
      const userId = req.user.userId;
      console.log('User ID:', userId);
      
      // Check if user already has a pending application
      const existingApplication = await MiddlemanApplication.findOne({ 
        user_id: userId, 
        status: 'pending' 
      });
      
      if (existingApplication) {
        console.log('User already has pending application:', existingApplication._id);
        return res.status(400).json({ 
          error: 'You already have a pending middleman application' 
        });
      }
      
      // Process form data
      const { 
        experience, 
        availability, 
        why_middleman, 
        referral_codes, 
        external_links,
        preferred_trade_types
      } = req.body;
      
      // Validate required fields
      if (!experience || !availability || !why_middleman) {
        console.log('Missing required fields:', { experience, availability, why_middleman });
        return res.status(400).json({
          error: 'Missing required fields'
        });
      }
      
      // Create application
      const application = new MiddlemanApplication({
        user_id: userId,
        experience,
        availability,
        why_middleman,
        referral_codes,
        external_links: external_links ? external_links.split(',').map(link => link.trim()) : [],
        preferred_trade_types: preferred_trade_types ? preferred_trade_types.split(',').map(type => type.trim()) : []
      });
      
      // Process uploaded documents if any
      if (req.files && req.files.length > 0) {
        console.log('Processing uploaded files:', req.files.length);
        const documentIds = [];
        
        for (const file of req.files) {
          console.log('Processing file:', file.originalname, file.fieldname);
          
          const document = new VerificationDocument({
            user_id: userId,
            document_type: file.fieldname === 'documents' ? 'other' : file.fieldname,
            filename: file.filename,
            original_filename: file.originalname,
            file_path: file.path,
            mime_type: file.mimetype,
            file_size: file.size,
            description: file.fieldname === 'id_card' ? 'Identity Verification' : 'Supporting Document'
          });
          
          try {
            await document.save();
            console.log('Document saved:', document._id);
            documentIds.push(document._id);
          } catch (docError) {
            console.error('Error saving document:', docError);
          }
        }
        
        application.documents = documentIds;
        console.log('Documents attached to application:', documentIds.length);
      } else {
        console.log('No documents uploaded with application');
      }
      
      await application.save();
      console.log('Application saved successfully:', application._id);
      
      // Update user model
      await User.updateOne(
        { _id: userId },
        { $set: { middleman_requested: true }}
      );
      console.log('User marked as having requested middleman status');
      
      res.status(201).json({
        message: 'Middleman application submitted successfully',
        applicationId: application._id
      });
    } catch (error) {
      console.error('Error submitting middleman application:', error);
      res.status(500).json({ error: 'Failed to submit application: ' + error.message });
    }
  },
  
  // Review application (approve/reject)
  reviewApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { action, reason } = req.body;
      const adminId = req.user.userId;
      
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      if (action === 'reject' && !reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      
      const application = await MiddlemanApplication.findById(applicationId);
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      if (application.status !== 'pending') {
        return res.status(400).json({ error: 'Application has already been processed' });
      }
      
      // Update application status
      application.status = action === 'approve' ? 'approved' : 'rejected';
      application.reviewed_by = adminId;
      application.reviewed_date = new Date();
      
      if (action === 'reject') {
        application.rejection_reason = reason;
      }
      
      await application.save();
      
      // Update user model
      const user = await User.findById(application.user_id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (action === 'approve') {
        user.role = 'middleman';
        
        // Add to role history
        user.role_history.push({
          old_role: user.role,
          new_role: 'middleman',
          changed_by: adminId,
          changed_at: new Date(),
          reason: 'Middleman application approved'
        });
      }
      
      user.middleman_requested = false;
      await user.save();
      
      res.status(200).json({
        message: `Application ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Error reviewing middleman application:', error);
      res.status(500).json({ error: 'Failed to process application review' });
    }
  },
  
  // Get application by id
  getApplicationById: async (req, res) => {
    try {
      const { applicationId } = req.params;
      
      const application = await MiddlemanApplication.findById(applicationId)
        .populate('user_id', 'username email roblox_username avatar_url credibility_score')
        .populate('documents');
      
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      // Get trade and vouch counts
      let tradeCount = 0;
      let vouchCount = 0;
      
      try {
        const { Trade } = await import('../models/Trade.js');
        tradeCount = await Trade.countDocuments({ user_id: application.user_id._id });
      } catch (err) {
        console.error('Error counting trades:', err);
      }
      
      try {
        const { Vouch } = await import('../models/Vouch.js');
        vouchCount = await Vouch.countDocuments({
          user_id: application.user_id._id,
          status: 'approved'
        });
      } catch (err) {
        console.error('Error counting vouches:', err);
      }
      
      // Construct response
      const applicationData = application.toObject();
      applicationData.trades = tradeCount;
      applicationData.vouches = vouchCount;
      
      res.status(200).json({
        application: applicationData
      });
    } catch (error) {
      console.error('Error fetching application details:', error);
      res.status(500).json({ error: 'Failed to fetch application details' });
    }
  },
  
  // Get user's application status
  getUserApplicationStatus: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      const application = await MiddlemanApplication.findOne({
        user_id: userId
      }).sort({ createdAt: -1 });
      
      if (!application) {
        return res.status(404).json({ error: 'No application found' });
      }
      
      res.status(200).json({
        status: application.status,
        applicationId: application._id,
        submittedAt: application.createdAt,
        reviewedAt: application.reviewed_date,
        rejectionReason: application.rejection_reason
      });
    } catch (error) {
      console.error('Error fetching user application status:', error);
      res.status(500).json({ error: 'Failed to fetch application status' });
    }
  },
  
  // Get document by id
  getDocumentById: async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const document = await VerificationDocument.findById(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Security check - only admin or document owner can access
      if (
        req.user.role !== 'admin' && 
        req.user.role !== 'moderator' && 
        document.user_id.toString() !== req.user.userId
      ) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Serve file
      res.sendFile(document.file_path);
    } catch (error) {
      console.error('Error retrieving document:', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  },
  
  // Get active middlemen
  getActiveMiddlemen: async (req, res) => {
    try {
      const middlemen = await User.find({
        role: 'middleman',
        is_active: true
      }).select('_id username roblox_username avatar_url credibility_score bio timezone');
      
      // Enhance with trade and vouch data
      const enhancedMiddlemen = await Promise.all(middlemen.map(async (mm) => {
        const middleman = mm.toObject();
        
        // Get trade count
        let tradeCount = 0;
        try {
          const { Trade } = await import('../models/Trade.js');
          tradeCount = await Trade.countDocuments({ user_id: mm._id });
        } catch (err) {
          console.error('Error counting trades:', err);
        }
        
        // Get vouch count and average rating
        let vouchCount = 0;
        let averageRating = 0;
        try {
          const { Vouch } = await import('../models/Vouch.js');
          vouchCount = await Vouch.countDocuments({
            user_id: mm._id,
            status: 'approved'
          });
          
          // Get average rating if vouches exist
          if (vouchCount > 0) {
            const vouchData = await Vouch.aggregate([
              { $match: { user_id: mm._id, status: 'approved' }},
              { $group: { _id: null, avgRating: { $avg: '$rating' }}}
            ]);
            
            if (vouchData.length > 0) {
              averageRating = vouchData[0].avgRating;
            }
          }
        } catch (err) {
          console.error('Error processing vouches:', err);
        }
        
        // Get verification date
        let verificationDate = null;
        if (mm.role_history && mm.role_history.length > 0) {
          const verificationEvent = mm.role_history.find(
            event => event.new_role === 'middleman'
          );
          if (verificationEvent) {
            verificationDate = verificationEvent.changed_at;
          }
        }
        
        return {
          ...middleman,
          trades: tradeCount,
          vouches: vouchCount,
          rating: averageRating,
          verificationDate
        };
      }));
      
      res.status(200).json({
        middlemen: enhancedMiddlemen
      });
    } catch (error) {
      console.error('Error fetching middlemen:', error);
      res.status(500).json({ error: 'Failed to fetch middlemen' });
    }
  }
};