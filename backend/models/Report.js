import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reported_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reported_by_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumPost'
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Scamming', 'Harassment', 'Inappropriate Content', 'Spam', 'Impersonation', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  }
}, {
  timestamps: true
});

export const Report = mongoose.model('Report', reportSchema);