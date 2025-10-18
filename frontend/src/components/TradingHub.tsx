import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from './ui/card';import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogFooter, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from './ui/dialog';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Upload,
  X,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  CheckCircle,
  Send,
  Star,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '../App';
import { formatDistanceToNow } from 'date-fns';

const toISO = (v: unknown): string => {
  try {
    if (!v) return new Date().toISOString();
    
    // Handle different date formats
    if (typeof v === 'string' || v instanceof Date || typeof v === 'number') {
      const d = new Date(v);
      return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
    }
    
    // Handle MongoDB date format with $date property
    if (v && typeof v === 'object' && '$date' in (v as object)) {
      const dateValue = (v as { $date: unknown }).$date;
      if (dateValue) {
        const d = new Date(String(dateValue));
        return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      }
    }
    
    // If it's an object with a date property
    if (v && typeof v === 'object' && 'date' in (v as object)) {
      const dateValue = (v as { date: unknown }).date;
      if (dateValue) {
        const d = new Date(String(dateValue));
        return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      }
    }
    
    console.warn("Unknown date format:", v);
    return new Date().toISOString();
  } catch (error) {
    console.error("Error converting date to ISO:", error, "Value was:", v);
    return new Date().toISOString(); // Fallback to current date
  }
};

const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    
    // Check if the formatDistanceToNow function is available
    if (typeof formatDistanceToNow !== 'function') {
      console.error("formatDistanceToNow is not a function. Check if date-fns is imported properly.");
      return new Date(dateString).toLocaleDateString();
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error formatting date:", error, "Date string was:", dateString);
    return 'Unknown date';
  }
};

const formatFullDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting full date:", error, "Date string was:", dateString);
    return 'Unknown date';
  }
};

interface Trade {
  trade_id: string;
  item_offered: string;
  item_requested?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  username: string;
  roblox_username: string;
  credibility_score: number;
  images?: { image_url: string; uploaded_at: string }[];
  user_id?: string;
  upvotes?: number;
  downvotes?: number;
  comments?: TradeComment[];
  comment_count?: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  robloxUsername?: string;
  role?: string;
}

interface TradeComment {
  comment_id: string;
  trade_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  credibility_score?: number;
}

interface ImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

function ImageDisplay({ src, alt, className, fallback }: ImageDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    console.error('Image failed to load:', src);
    
    // First attempt: try the original URL
    if (retryCount === 0) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
        setImageLoading(true);
      }, 1000);
    } 
    // Second attempt: try to fix URL format if needed
    else if (retryCount === 1) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
        setImageLoading(true);
      }, 1000);
    } else {
      setImageLoading(false);
      setImageError(true);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setImageError(false);
    setImageLoading(true);
  };

  if (imageError) {
    return fallback || (
      <div className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-400">
          <Upload className="w-8 h-8 mx-auto mb-1" />
          <span className="text-xs block mb-1">Image unavailable</span>
          <button
            onClick={handleRetry}
            className="text-xs text-blue-500 hover:text-blue-600 underline focus:outline-none"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={retryCount === 2 ? src.replace(/^(https?:\/\/[^/]+)?(\/uploads\/trades\/)?(.+)$/, `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/trades/$3`) : `${src}${retryCount === 1 ? `?v=${retryCount}` : ''}`}
        alt={alt}
        className={`w-full h-full object-cover rounded ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// Add new interfaces for modals
interface ImageModalProps {
  images: { image_url: string; uploaded_at: string }[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface TradeDetailsModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  deleteLoading: boolean;
}

// Image Modal Component
function ImageModal({ images, currentIndex, isOpen, onClose, onNext, onPrevious }: ImageModalProps) {
  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="relative bg-black rounded-lg overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          
          <div className="relative aspect-video bg-black flex items-center justify-center">
            <img
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${currentImage.image_url.startsWith('/') ? currentImage.image_url : `/uploads/trades/${currentImage.image_url}`}`}
              alt={`Trade image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          </div>
          
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Enhanced Trade Details Modal Component with upvote/downvote and comments
function TradeDetailsModal({ trade, isOpen, onClose, onEdit, onDelete, canEdit, canDelete, deleteLoading }: TradeDetailsModalProps) {
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);

  // Define loadTradeData with useCallback to prevent unnecessary rerenders
  const loadTradeData = useCallback(async () => {
    if (!trade) return;

    try {
      setLoadingComments(true);
      console.log('Loading trade data for:', trade.trade_id);
      
      // Load comments and vote data
      const [commentsResponse, voteResponse] = await Promise.allSettled([
        apiService.getTradeComments(trade.trade_id),
        apiService.getTradeVotes(trade.trade_id)
      ]);

      // Handle comments - map backend response properly
      if (commentsResponse.status === 'fulfilled') {
        const mappedComments = commentsResponse.value.comments.map((comment: Record<string, unknown>) => {
          // Convert created_at to proper ISO string
          let createdAt = comment.created_at;
          if (createdAt && typeof createdAt === 'object' && '$date' in (createdAt as Record<string, unknown>)) {
            const dateValue = (createdAt as Record<string, unknown>).$date;
            if (typeof dateValue === 'string' || typeof dateValue === 'number') {
              createdAt = new Date(dateValue).toISOString();
            }
          } else if (createdAt && typeof createdAt === 'string') {
            // Try to ensure it's a valid date string
            const date = new Date(createdAt as string);
            if (!isNaN(date.getTime())) {
              createdAt = date.toISOString();
            }
          }

          return {
            comment_id: comment.comment_id as string,
            trade_id: trade.trade_id,
            user_id: (comment.user as Record<string, string>)._id,
            content: comment.content as string,
            created_at: createdAt as string,
            username: (comment.user as Record<string, string>).username,
            credibility_score: (comment.user as Record<string, number>).credibility_score
          };
        });
        setComments(mappedComments);
      } else {
        console.error('Failed to load comments:', commentsResponse.reason);
        setComments([]);
      }

      // Handle votes
      if (voteResponse.status === 'fulfilled') {
        setUpvotes(voteResponse.value.upvotes || 0);
        setDownvotes(voteResponse.value.downvotes || 0);
        setUserVote(voteResponse.value.userVote || null);
      } else {
        console.error('Failed to load votes:', voteResponse.reason);
        setUpvotes(trade.upvotes || 0);
        setDownvotes(trade.downvotes || 0);
        setUserVote(null);
      }

    } catch (error) {
      console.error('Failed to load trade data:', error);
      toast.error('Failed to load trade data');
    } finally {
      setLoadingComments(false);
    }
  }, [trade]);

  // Load trade comments when modal opens
  useEffect(() => {
    if (isOpen && trade) {
      loadTradeData();
    }
  }, [isOpen, trade, loadTradeData]);

  const handleUpvote = async () => {
    if (!trade || votingLoading) return;

    // Check if user is authenticated
    if (!apiService.isAuthenticated()) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      setVotingLoading(true);
      console.log('Upvoting trade:', trade.trade_id);
      
      const response = await apiService.voteTradePost(trade.trade_id, 'up');
      
      setUpvotes(response.upvotes);
      setDownvotes(response.downvotes);
      setUserVote(response.userVote);
      
      if (response.userVote === 'up') {
        toast.success('Upvoted!');
      } else if (response.userVote === null) {
        toast.success('Vote removed!');
      } else {
        toast.success('Changed to upvote!');
      }
    } catch (error) {
      console.error('Failed to upvote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('cannot vote on your own trade')) {
        toast.error('You cannot vote on your own trade');
      } else if (errorMessage.includes('401')) {
        toast.error('Please log in to vote');
      } else {
        toast.error('Failed to update vote');
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (!trade || votingLoading) return;

    // Check if user is authenticated
    if (!apiService.isAuthenticated()) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      setVotingLoading(true);
      console.log('Downvoting trade:', trade.trade_id);
      
      const response = await apiService.voteTradePost(trade.trade_id, 'down');
      
      setUpvotes(response.upvotes);
      setDownvotes(response.downvotes);
      setUserVote(response.userVote);
      
      if (response.userVote === 'down') {
        toast.success('Downvoted!');
      } else if (response.userVote === null) {
        toast.success('Vote removed!');
      } else {
        toast.success('Changed to downvote!');
      }
    } catch (error) {
      console.error('Failed to downvote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('cannot vote on your own trade')) {
        toast.error('You cannot vote on your own trade');
      } else if (errorMessage.includes('401')) {
        toast.error('Please log in to vote');
      } else {
        toast.error('Failed to update vote');
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !trade || submittingComment) return;

    try {
      setSubmittingComment(true);
      console.log('Adding comment to trade:', trade.trade_id);
      
      const response = await apiService.addTradeComment(trade.trade_id, newComment);
      
      // Map the response properly
      const mappedComment = {
        comment_id: response.comment.comment_id,
        trade_id: trade.trade_id,
        user_id: response.comment.user._id,
        content: response.comment.content,
        created_at: response.comment.created_at,
        username: response.comment.user.username,
        credibility_score: response.comment.user.credibility_score
      };
      
      setComments(prev => [mappedComment, ...prev]);
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!trade) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Trade Details</span>
            <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
              {trade.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <DialogBody>
          {/* Trader Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarFallback>{trade.username?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{trade.username}</span>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {trade.credibility_score || 0}★
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                @{trade.roblox_username}
              </div>
            </div>
            
            {/* Vote Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpvote}
                disabled={votingLoading}
                className={`${userVote === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-950' : 'text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950'} transition-colors`}
              >
                <ArrowUp className={`w-5 h-5 mr-2 ${userVote === 'up' ? 'fill-current' : ''}`} />
                {upvotes}
                {votingLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownvote}
                disabled={votingLoading}
                className={`${userVote === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-950' : 'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950'} transition-colors`}
              >
                <ArrowDown className={`w-5 h-5 mr-2 ${userVote === 'down' ? 'fill-current' : ''}`} />
                {downvotes}
                {votingLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </Button>
            </div>
          </div>

          {/* Trade Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">Offering</h3>
              <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                {trade.item_offered}
              </Badge>
            </div>
            
            {trade.item_requested && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Looking for</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {trade.item_requested}
                </Badge>
              </div>
            )}
          </div>

          {/* Description */}
          {trade.description && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{trade.description}</p>
            </div>
          )}

          {/* Images Grid */}
          {trade.images && trade.images.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Images ({trade.images.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {trade.images.map((image, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-lg border cursor-pointer hover:shadow-md transition-shadow">
                    <ImageDisplay
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${image.image_url.startsWith('/') ? image.image_url : `/uploads/trades/${image.image_url}`}`}
                      alt={`Trade image ${index + 1}`}
                      className="w-full h-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vote Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600">
                <ArrowUp className="w-4 h-4" />
                <span className="font-medium">{upvotes}</span>
              </div>
              <span className="text-muted-foreground">Upvotes</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600">
                <ArrowDown className="w-4 h-4" />
                <span className="font-medium">{downvotes}</span>
              </div>
              <span className="text-muted-foreground">Downvotes</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">{comments.length}</span>
              </div>
              <span className="text-muted-foreground">Comments</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Comments ({comments.length})
                {loadingComments && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}
              </h3>
            </div>

            {/* Add Comment */}
            <div className="flex gap-3 p-4 border rounded-lg bg-muted/20">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  Y
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                  disabled={submittingComment}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  {submittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.comment_id} className="flex gap-3 p-3 border rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                        {comment.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.username}</span>
                        {comment.credibility_score && (
                          <Badge variant="secondary" className="text-xs">
                            {comment.credibility_score}★
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(toISO(comment.created_at))}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>

          {/* Trade Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Posted:</span>
              <div className="font-medium">{formatFullDate(toISO(trade.created_at))}</div>
              <div className="text-xs text-muted-foreground">{formatDate(toISO(trade.created_at))}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Trade ID:</span>
              <div className="font-medium font-mono">{trade.trade_id.slice(-8)}</div>
            </div>
            {trade.updated_at && trade.updated_at !== trade.created_at && (
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <div className="font-medium">{formatFullDate(toISO(trade.updated_at))}</div>
                <div className="text-xs text-muted-foreground">{formatDate(toISO(trade.updated_at))}</div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          {canEdit ? (
            <>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Trader
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              
              {canDelete && (
                <Button 
                  variant="outline" 
                  onClick={onDelete}
                  disabled={deleteLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Trader
              </Button>
              {canDelete && (
                <Button 
                  variant="outline" 
                  onClick={onDelete}
                  disabled={deleteLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TradingHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  // State for pagination - setCurrentPage is used in the loadTrades dependency array
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [newTrade, setNewTrade] = useState({
    itemOffered: '',
    itemRequested: '',
    description: ''
  });

  const [editTrade, setEditTrade] = useState({
    itemOffered: '',
    itemRequested: '',
    description: ''
  });

  // Image upload states (for creating/editing trades)
  const [uploadSelectedImages, setUploadSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [editUploadSelectedImages, setEditUploadSelectedImages] = useState<File[]>([]);
  const [editImagePreviewUrls, setEditImagePreviewUrls] = useState<string[]>([]);

  // Modal states (for viewing images and trade details)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isTradeDetailsOpen, setIsTradeDetailsOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalSelectedImages, setModalSelectedImages] = useState<{ image_url: string; uploaded_at: string }[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [statusUpdateLoading, setStatusUpdateLoading] = useState<string | null>(null);

  const loadTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string | number> = { page: currentPage, limit: 10 };
      if (filterCategory !== 'all') params.status = filterCategory;

      const response = await apiService.getTrades(params);
      
      // Validate that we have trades data
      if (!response || !response.trades || !Array.isArray(response.trades)) {
        console.error('Invalid response format from getTrades:', response);
        throw new Error('Invalid response format from server');
      }

      // Define a more specific type for trade object
      interface TradeData {
        trade_id?: string;
        _id?: string;
        item_offered?: string;
        item_requested?: string;
        description?: string;
        status?: string;
        created_at?: string | Date;
        createdAt?: string | Date;
        updated_at?: string | Date;
        updatedAt?: string | Date;
        user?: {
          username?: string;
          roblox_username?: string;
          credibility_score?: number;
          _id?: string;
        };
        username?: string;
        roblox_username?: string;
        credibility_score?: number;
        user_id?: string;
        images?: unknown[];
        upvotes?: number | string[] | null;
        downvotes?: number | string[] | null;
        comment_count?: number;
      }
      
      const mappedTrades = response.trades.map((trade: TradeData) => {
        try {
          // Safely extract created_at and updated_at
          const createdAtValue = trade.created_at || trade.createdAt;
          const updatedAtValue = trade.updated_at || trade.updatedAt;
          
          // Handle images safely
          // Define the image type structure
          type TradeImage = {
            image_url: string;
            uploaded_at: string;
          };
          
          let processedImages: TradeImage[] = [];
          if (Array.isArray(trade.images)) {
            processedImages = trade.images.map((img: unknown) => {
              try {
                if (typeof img === 'string') {
                  // Handle case where the image is just a string path
                  return { 
                    image_url: img.startsWith('/') ? img : `/uploads/trades/${img}`, 
                    uploaded_at: new Date().toISOString() 
                  };
                } else if (img && typeof img === 'object') {
                  const imgObj = img as Record<string, unknown>;
                  
                  // Extract the image URL with proper formatting
                  let imageUrl = '';
                  if (typeof imgObj.image_url === 'string') {
                    imageUrl = imgObj.image_url.startsWith('/') 
                      ? imgObj.image_url 
                      : `/uploads/trades/${imgObj.image_url}`;
                  } else if (typeof imgObj.filename === 'string') {
                    imageUrl = `/uploads/trades/${imgObj.filename}`;
                  } else if (img) {
                    // Last resort fallback
                    imageUrl = `/uploads/trades/${String(img).split('/').pop() || 'unknown'}`;
                  }
                  
                  // Extract the uploaded date
                  const uploadedAt = toISO(imgObj.uploaded_at);
                  
                  return {
                    image_url: imageUrl,
                    uploaded_at: uploadedAt
                  };
                }
                return {
                  image_url: '/uploads/trades/placeholder.png',
                  uploaded_at: new Date().toISOString()
                };
              } catch (imgErr) {
                console.error('Error processing image:', imgErr, img);
                return {
                  image_url: '/uploads/trades/placeholder.png',
                  uploaded_at: new Date().toISOString()
                };
              }
            });
          }
          
          return {
            trade_id: trade.trade_id as string || trade._id as string,
            item_offered: trade.item_offered as string || 'Unknown Item',
            item_requested: trade.item_requested as string || '',
            description: trade.description as string || '',
            status: trade.status as string || 'unknown',
            created_at: toISO(createdAtValue),
            updated_at: toISO(updatedAtValue),
            username: (trade.user?.username as string) || (trade.username as string) || 'Unknown User',
            roblox_username: (trade.user?.roblox_username as string) || (trade.roblox_username as string) || '',
            credibility_score: (trade.user?.credibility_score as number) ?? (trade.credibility_score as number) ?? 0,
            user_id: (trade.user?._id as string) || (trade.user_id as string) || '',
            images: processedImages,
            upvotes: Array.isArray(trade.upvotes) ? trade.upvotes.length : (trade.upvotes as number) || 0,
            downvotes: Array.isArray(trade.downvotes) ? trade.downvotes.length : (trade.downvotes as number) || 0,
            comment_count: trade.comment_count as number || 0
          };
        } catch (tradeErr) {
          console.error('Error processing trade:', tradeErr, trade);
          // Return a minimal valid trade object as fallback
          return {
            trade_id: (trade.trade_id as string) || (trade._id as string) || 'unknown-id',
            item_offered: 'Error loading item',
            item_requested: '',
            description: '',
            status: 'error',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            username: 'Unknown',
            roblox_username: '',
            credibility_score: 0,
            user_id: '',
            images: [] as {image_url: string, uploaded_at: string}[],
            upvotes: 0,
            downvotes: 0,
            comment_count: 0
          };
        }
      });

      setTrades(mappedTrades);
      if (response.pagination) setTotalPages(response.pagination.totalPages || 1);
    } catch (err) {
      console.error('Error loading trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterCategory]);

  const { isLoggedIn, isLoading: authLoading } = useAuth();

  // Wait for auth before calling protected endpoints (including /auth/me)
  useEffect(() => {
    if (authLoading || !isLoggedIn || !apiService.isAuthenticated()) return;

    const loadCurrentUser = async () => {
      try {
        const me = await apiService.getCurrentUser();
        setCurrentUser({
          id: me.id,
          username: me.username,
          email: me.email,
          robloxUsername: me.roblox_username,
          role: me.role
        });
      } catch (err) {
        console.error('Failed to load current user:', err);
        // apiService will emit 'auth-expired' if token truly invalid
      }
    };

    loadCurrentUser();
  }, [authLoading, isLoggedIn]);

  // Load trades only when authenticated
  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    loadTrades();
  }, [authLoading, isLoggedIn, loadTrades]);

  const categories = [
    { value: 'all', label: 'All Trades' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Update image handling functions to use the renamed variables
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + uploadSelectedImages.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setUploadSelectedImages(prev => [...prev, ...validFiles]);
      
      // Create preview URLs
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviewUrls(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + editUploadSelectedImages.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setEditUploadSelectedImages(prev => [...prev, ...validFiles]);
      
      // Create preview URLs
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setEditImagePreviewUrls(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditUploadSelectedImages(prev => prev.filter((_, i) => i !== index));
    setEditImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Update modal functions to use the renamed variables
  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsTradeDetailsOpen(true);
  };

  const handleImageClick = (images: { image_url: string; uploaded_at: string }[], index: number) => {
    setModalSelectedImages(images);
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % modalSelectedImages.length);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + modalSelectedImages.length) % modalSelectedImages.length);
  };

  const handleEditFromModal = () => {
    if (selectedTrade) {
      setIsTradeDetailsOpen(false);
      handleEditTrade(selectedTrade);
    }
  };

  const handleDeleteFromModal = () => {
    if (selectedTrade) {
      setIsTradeDetailsOpen(false);
      handleDeleteTrade(selectedTrade.trade_id, selectedTrade.item_offered);
    }
  };

  const canEditTrade = (trade: Trade): boolean => {
    if (!currentUser) return false;
    return currentUser.id === trade.user_id || 
           currentUser.role === 'admin' || 
           currentUser.role === 'moderator';
  };

  const canDeleteTrade = (trade: Trade): boolean => {
    if (!currentUser) return false;
    return currentUser.id === trade.user_id || 
           currentUser.role === 'admin' || 
           currentUser.role === 'moderator';
  };

  const handleDeleteTrade = async (tradeId: string, tradeTitle: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the trade "${tradeTitle}"?`);
    if (!confirmed) return;

    try {
      setDeleteLoading(tradeId);
      await apiService.deleteTrade(tradeId);
      
      setTrades(prev => prev.filter(trade => trade.trade_id !== tradeId));
      
      toast.success('Trade deleted successfully');
    } catch (error) {
      console.error('Failed to delete trade:', error);
      toast.error('Failed to delete trade');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleMarkAsTraded = async (tradeId: string, tradeTitle: string) => {
    try {
      setStatusUpdateLoading(tradeId);
      await apiService.updateTradeStatus(tradeId, 'completed');
      
      // Update the trade in the local state
      setTrades(prev => prev.map(trade => 
        trade.trade_id === tradeId 
          ? { ...trade, status: 'completed' }
          : trade
      ));
      
      toast.success(`Trade "${tradeTitle}" marked as completed!`);
    } catch (error) {
      console.error('Failed to mark trade as completed:', error);
      toast.error('Failed to mark trade as completed');
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  const handleReopenTrade = async (tradeId: string, tradeTitle: string) => {
    try {
      setStatusUpdateLoading(tradeId);
      await apiService.updateTradeStatus(tradeId, 'open');
      
      // Update the trade in the local state
      setTrades(prev => prev.map(trade => 
        trade.trade_id === tradeId 
          ? { ...trade, status: 'open' }
          : trade
      ));
      
      toast.success(`Trade "${tradeTitle}" reopened!`);
    } catch (error) {
      console.error('Failed to reopen trade:', error);
      toast.error('Failed to reopen trade');
    } finally {
      setStatusUpdateLoading(null);
    }
  };

  // Update create trade function
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newTrade.itemOffered.trim()) {
      setError('Item offered is required');
      return;
    }
    if (!newTrade.itemRequested.trim()) {
      setError('Item requested is required');
      return;
    }
    
    try {
      setCreateLoading(true);
      setError('');
      
      console.log('Creating trade with images:', uploadSelectedImages.length);
      
      await apiService.createTrade({
        itemOffered: newTrade.itemOffered,
        itemRequested: newTrade.itemRequested,
        description: newTrade.description
      }, uploadSelectedImages);
      
      // Reset form
      setIsCreateDialogOpen(false);
      setNewTrade({
        itemOffered: '',
        itemRequested: '',
        description: ''
      });
      setUploadSelectedImages([]);
      setImagePreviewUrls([]);
      
      // Reload trades to show the new one
      await loadTrades();
      
      console.log('Trade created successfully');
      toast.success('Trade created successfully! 🎉', {
        description: 'Your trade has been posted and is now visible to other users.'
      });
    } catch (err) {
      console.error('Failed to create trade:', err);
      let errorMessage = 'Failed to create trade';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('413')) {
          errorMessage = 'Images are too large. Please use smaller images (max 5MB each).';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid data. Please check all fields and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to create trade', {
        description: errorMessage
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Update edit trade function
  const handleEditTrade = (trade: Trade) => {
    if (!currentUser || currentUser.id !== trade.user_id) {
      toast.error('You can only edit your own trades');
      return;
    }
    
    setEditingTrade(trade);
    setEditTrade({
      itemOffered: trade.item_offered,
      itemRequested: trade.item_requested || '',
      description: trade.description || ''
    });
    setEditUploadSelectedImages([]);
    setEditImagePreviewUrls([]);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTrade) return;
    
    // Validation
    if (!editTrade.itemOffered.trim()) {
      setError('Item offered is required');
      return;
    }
    
    try {
      setEditLoading(true);
      setError('');
      
      await apiService.updateTrade(editingTrade.trade_id, {
        itemOffered: editTrade.itemOffered,
        itemRequested: editTrade.itemRequested,
        description: editTrade.description
      }, editUploadSelectedImages);
      
      // Reset form
      setIsEditDialogOpen(false);
      setEditingTrade(null);
      setEditTrade({
        itemOffered: '',
        itemRequested: '',
        description: ''
      });
      setEditUploadSelectedImages([]);
      setEditImagePreviewUrls([]);
      
      // Reload trades to show the updated one
      await loadTrades();
      
      toast.success('Trade updated successfully! 🎉', {
        description: 'Your trade has been updated and is now visible to other users.'
      });
    } catch (err) {
      console.error('Failed to update trade:', err);
      let errorMessage = 'Failed to update trade';
      
      if (err instanceof Error) {
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('413')) {
          errorMessage = 'Images are too large. Please use smaller images (max 5MB each).';
        } else if (err.message.includes('400')) {
          errorMessage = 'Invalid data. Please check all fields and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error('Failed to update trade', {
        description: errorMessage
      });
    } finally {
      setEditLoading(false);
    }
  };

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = searchTerm === '' || 
      trade.item_offered?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.item_requested?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Update the image upload sections in the JSX to use the renamed variables
  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Trading Hub</h1>
            <p className="text-muted-foreground">Discover and create trades with the community</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Trade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Trade</DialogTitle>
                <DialogDescription>
                  Fill out the details for your trade listing
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateTrade} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item-offered">What you're offering *</Label>
                  <Input
                    id="item-offered"
                    placeholder="Enter the item you're trading away"
                    value={newTrade.itemOffered}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, itemOffered: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="item-requested">What you want (optional)</Label>
                  <Input
                    id="item-requested"
                    placeholder="Enter what you're looking for"
                    value={newTrade.itemRequested}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, itemRequested: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="trade-description">Description (optional)</Label>
                  <Textarea
                    id="trade-description"
                    placeholder="Add additional details about your trade..."
                    value={newTrade.description}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label>Images (optional - up to 5 images)</Label>
                  <div 
                    className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                      if (files.length > 0) {
                        const input = document.getElementById('image-upload') as HTMLInputElement;
                        const dt = new DataTransfer();
                        files.forEach(file => dt.items.add(file));
                        input.files = dt.files;
                        handleImageSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadSelectedImages.length >= 5}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer flex flex-col items-center gap-2 ${
                        uploadSelectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {uploadSelectedImages.length >= 5 
                          ? 'Maximum 5 images reached' 
                          : 'Click to upload images or drag and drop'
                        }
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF up to 5MB each • {uploadSelectedImages.length}/5 selected
                      </span>
                    </label>
                  </div>

                  {/* Image Previews */}
                  {imagePreviewUrls.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {imagePreviewUrls.length} image{imagePreviewUrls.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" disabled={createLoading}>
                    {createLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Trade'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          {/* Edit Trade Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Trade</DialogTitle>
                <DialogDescription>
                  Update the details for your trade listing
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleUpdateTrade} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-item-offered">What you're offering *</Label>
                  <Input
                    id="edit-item-offered"
                    placeholder="Enter the item you're trading away"
                    value={editTrade.itemOffered}
                    onChange={(e) => setEditTrade(prev => ({ ...prev, itemOffered: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-item-requested">What you want (optional)</Label>
                  <Input
                    id="edit-item-requested"
                    placeholder="Enter what you're looking for"
                    value={editTrade.itemRequested}
                    onChange={(e) => setEditTrade(prev => ({ ...prev, itemRequested: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-trade-description">Description (optional)</Label>
                  <Textarea
                    id="edit-trade-description"
                    placeholder="Add additional details about your trade..."
                    value={editTrade.description}
                    onChange={(e) => setEditTrade(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label>Images (optional - up to 5 images)</Label>
                  <div 
                    className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-4 text-center transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                      if (files.length > 0) {
                        const input = document.getElementById('edit-image-upload') as HTMLInputElement;
                        const dt = new DataTransfer();
                        files.forEach(file => dt.items.add(file));
                        input.files = dt.files;
                        handleEditImageSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditImageSelect}
                      className="hidden"
                      id="edit-image-upload"
                      disabled={editUploadSelectedImages.length >= 5}
                    />
                    <label
                      htmlFor="edit-image-upload"
                      className={`cursor-pointer flex flex-col items-center gap-2 ${
                        editUploadSelectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {editUploadSelectedImages.length >= 5 
                          ? 'Maximum 5 images reached' 
                          : 'Click to upload images or drag and drop'
                        }
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF up to 5MB each • {editUploadSelectedImages.length}/5 selected
                      </span>
                    </label>
                  </div>

                  {/* Edit Image Previews */}
                  {editImagePreviewUrls.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {editImagePreviewUrls.length} image{editImagePreviewUrls.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {editImagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveEditImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)} 
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" 
                    disabled={editLoading}
                  >
                    {editLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Trade'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="value-high">Highest Value</SelectItem>
              <SelectItem value="value-low">Lowest Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background p-4 border-b border-border">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>{filteredTrades.length} Trades Found</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          {loading && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading trades...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
              <span className="text-red-500">{error}</span>
            </div>
          )}
          
          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTrades.map((trade) => (
                <Card 
                  key={trade.trade_id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleTradeClick(trade)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{trade.username?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{trade.username}</span>
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {trade.credibility_score || 0}★
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{trade.roblox_username}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${trade.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                        trade.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 
                        trade.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 
                        'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
                        {trade.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Trade Images */}
                    {trade.images && trade.images.length > 0 && (
                      <div className="relative" onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(trade.images!, 0);
                      }}>
                        <ImageDisplay
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${trade.images[0].image_url.startsWith('/') ? trade.images[0].image_url : `/uploads/trades/${trade.images[0].image_url}`}`}
                          alt={`${trade.item_offered} - Trade item`}
                          className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                        />
                        {trade.images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                            <Eye className="w-3 h-3 inline mr-1" />
                            {trade.images.length} images
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                        Trading: {trade.item_offered}
                      </h3>
                      {trade.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {trade.description}
                        </p>
                      )}
                    </div>

                    {/* Trade Items */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground mb-1 block">Offering:</span>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                          {trade.item_offered}
                        </Badge>
                      </div>

                      {trade.item_requested && (
                        <>
                          <div className="flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground mb-1 block">Looking for:</span>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {trade.item_requested}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(toISO(trade.created_at))}</span>
                        <span>ID: {trade.trade_id.slice(-6)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    {/* Trade Stats */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground w-full">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-green-600">
                          <ArrowUp className="w-3 h-3" />
                          <span>{trade.upvotes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <ArrowDown className="w-3 h-3" />
                          <span>{trade.downvotes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>{trade.comment_count || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </div>
                    </div>

                    {/* Actions - Keep stopPropagation on buttons */}
                    <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      {canEditTrade(trade) ? (
                        <>
                          {/* Show different buttons based on trade status */}
                          {trade.status === 'open' || trade.status === 'in_progress' ? (
                            <>
                              <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Contact
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleMarkAsTraded(trade.trade_id, trade.item_offered)}
                                disabled={statusUpdateLoading === trade.trade_id}
                                title="Mark as traded/completed"
                              >
                                {statusUpdateLoading === trade.trade_id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3 mr-1" />
                                )}
                                {statusUpdateLoading === trade.trade_id ? 'Updating...' : 'Done'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditTrade(trade)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </>
                          ) : trade.status === 'completed' ? (
                            <>
                              <Button size="sm" className="flex-1 bg-gray-500 hover:bg-gray-600 text-white" disabled>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completed
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleReopenTrade(trade.trade_id, trade.item_offered)}
                                disabled={statusUpdateLoading === trade.trade_id}
                                title="Reopen trade"
                              >
                                {statusUpdateLoading === trade.trade_id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                )}
                                {statusUpdateLoading === trade.trade_id ? 'Reopening...' : 'Reopen'}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditTrade(trade)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Contact
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handleTradeClick(trade)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View Details
                              </Button>
                            </>
                          )}
                          
                          {canDeleteTrade(trade) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTrade(trade.trade_id, trade.item_offered)}
                              disabled={deleteLoading === trade.trade_id}
                            >
                              {deleteLoading === trade.trade_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 mr-1" />
                              )}
                              {deleteLoading === trade.trade_id ? 'Deleting...' : 'Delete'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Contact
                          </Button>
                          {canDeleteTrade(trade) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTrade(trade.trade_id, trade.item_offered)}
                              disabled={deleteLoading === trade.trade_id}
                            >
                              {deleteLoading === trade.trade_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 mr-1" />
                              )}
                              {deleteLoading === trade.trade_id ? 'Deleting...' : 'Delete'}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {!loading && !error && filteredTrades.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No trades found</h3>
                  <p>Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <TradeDetailsModal
        trade={selectedTrade}
        isOpen={isTradeDetailsOpen}
        onClose={() => setIsTradeDetailsOpen(false)}
        onEdit={handleEditFromModal}
        onDelete={handleDeleteFromModal}
        canEdit={selectedTrade ? canEditTrade(selectedTrade) : false}
        canDelete={selectedTrade ? canDeleteTrade(selectedTrade) : false}
        deleteLoading={selectedTrade ? deleteLoading === selectedTrade.trade_id : false}
      />

      <ImageModal
        images={modalSelectedImages}
        currentIndex={currentImageIndex}
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onNext={handleNextImage}
        onPrevious={handlePreviousImage}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 mb-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show current page and nearby pages
              let pageToShow: number;
              if (totalPages <= 5) {
                pageToShow = i + 1;
              } else if (currentPage <= 3) {
                pageToShow = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageToShow = totalPages - 4 + i;
              } else {
                pageToShow = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={i}
                  variant={currentPage === pageToShow ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageToShow)}
                  disabled={loading}
                  className={`w-9 h-9 p-0 ${currentPage === pageToShow ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}`}
                >
                  {pageToShow}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}