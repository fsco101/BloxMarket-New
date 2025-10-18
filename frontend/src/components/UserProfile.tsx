import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import { toast } from 'sonner';

// Type definitions
interface ProfileData {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  bio: string;
  discord_username: string;
  timezone: string;
  roblox_username: string;
  avatar_url: string;
  totalTrades: number;
  successRate: number;
  averageRating: number;
  totalVouches: number;
  credibility_score: number;
  totalWishlistItems: number;
  vouches: Vouch[];
  achievements: Achievement[];
}

interface Trade {
  _id: string;
  title: string;
  status: 'completed' | 'active' | 'pending' | 'cancelled' | 'disputed';
  created_at: string;
  updated_at?: string;
  item_offered?: string;
  item_requested?: string;
  trade_value?: number;
  trade_type?: 'sell' | 'buy' | 'trade';
  other_user_id?: string;
  other_user_name?: string;
  creator_id: string;
  acceptor_id?: string;
  is_creator: boolean; // Whether the current user created this trade
  trade_direction: 'outgoing' | 'incoming'; // Whether user initiated or received the trade
}

interface TradeHistory {
  trades: Trade[];
  totalTrades: number;
  completedTrades: number;
  activeTrades: number;
  pendingTrades: number;
  cancelledTrades: number;
  disputedTrades: number;
  successRate: number;
  totalValue: number;
}

interface WishlistItem {
  wishlist_id: string;
  item_name: string;
  created_at: string;
  priority?: 'low' | 'medium' | 'high';
}

interface Vouch {
  _id: string;
  given_by: string;
  given_by_avatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  trade_id?: string;
}

interface Achievement {
  id: string;
  title: string;
  name?: string;
  description: string;
  date: string;
  earned?: boolean;
  icon?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

interface EditFormData {
  username: string;
  bio: string;
  discordUsername: string;
  timezone: string;
  robloxUsername: string;
}

import { 
  Star, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  Edit,
  Heart,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Camera,
  Save,
  X,
  Trophy,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Filter
} from 'lucide-react';

export function UserProfile() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [tradeFilter, setTradeFilter] = useState<'all' | 'completed' | 'active' | 'pending'>('all');
  const [loadingTrades, setLoadingTrades] = useState(false);
  
  // Add flags to prevent duplicate API calls
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const hasLoadedInitially = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [editForm, setEditForm] = useState<EditFormData>({
    username: '',
    bio: '',
    discordUsername: '',
    timezone: '',
    robloxUsername: ''
  });

  // Load user trade history
  const loadTradeHistory = async (userId: string) => {
    if (loadingTrades) {
      console.log('Trade history already loading, skipping...');
      return;
    }

    try {
      setLoadingTrades(true);
      console.log('Loading trade history for user:', userId);
      
      const trades = await apiService.getUserTradeHistory(userId);
      console.log('Trade history loaded:', trades?.length || 0, 'trades');
      
      if (trades && Array.isArray(trades) && trades.length > 0) {
        // Process trades to add user-specific context
        const processedTrades: Trade[] = trades.map(trade => ({
          ...trade,
          is_creator: trade.creator_id === userId,
          trade_direction: trade.creator_id === userId ? 'outgoing' : 'incoming',
          other_user_name: trade.creator_id === userId ? trade.acceptor_name : trade.creator_name
        }));

        // Calculate trade statistics
        const completedTrades = processedTrades.filter(t => t.status === 'completed');
        const activeTrades = processedTrades.filter(t => t.status === 'active');
        const pendingTrades = processedTrades.filter(t => t.status === 'pending');
        const cancelledTrades = processedTrades.filter(t => t.status === 'cancelled');
        const disputedTrades = processedTrades.filter(t => t.status === 'disputed');
        
        const totalValue = completedTrades.reduce((sum, trade) => sum + (trade.trade_value || 0), 0);
        const successRate = processedTrades.length > 0 
          ? Math.round((completedTrades.length / processedTrades.length) * 100) 
          : 0;

        const historyData: TradeHistory = {
          trades: processedTrades.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          totalTrades: processedTrades.length,
          completedTrades: completedTrades.length,
          activeTrades: activeTrades.length,
          pendingTrades: pendingTrades.length,
          cancelledTrades: cancelledTrades.length,
          disputedTrades: disputedTrades.length,
          successRate,
          totalValue
        };

        setTradeHistory(historyData);

        // Update profile data with trade statistics
        setProfileData(prev => prev ? {
          ...prev,
          totalTrades: historyData.totalTrades,
          successRate: historyData.successRate
        } : null);
      } else {
        // Set empty trade history if no trades or endpoint not available
        console.log('No trade history available or endpoint not implemented');
        setTradeHistory({
          trades: [],
          totalTrades: 0,
          completedTrades: 0,
          activeTrades: 0,
          pendingTrades: 0,
          cancelledTrades: 0,
          disputedTrades: 0,
          successRate: 0,
          totalValue: 0
        });
      }
    } catch (err: unknown) {
      console.error('Error loading trade history:', err);
      
      // Check if it's a missing endpoint error
      if (err instanceof Error && (err.message.includes('Route not found') || err.message.includes('404'))) {
        console.warn('Trade history endpoint not available, setting empty data');
        setTradeHistory({
          trades: [],
          totalTrades: 0,
          completedTrades: 0,
          activeTrades: 0,
          pendingTrades: 0,
          cancelledTrades: 0,
          disputedTrades: 0,
          successRate: 0,
          totalValue: 0
        });
        // Don't show error for missing endpoints
        return;
      }
      
      // For other errors, set empty data but don't show error to user
      setTradeHistory({
        trades: [],
        totalTrades: 0,
        completedTrades: 0,
        activeTrades: 0,
        pendingTrades: 0,
        cancelledTrades: 0,
        disputedTrades: 0,
        successRate: 0,
        totalValue: 0
      });
    } finally {
      setLoadingTrades(false);
    }
  };

  // Load user data on component mount
  const loadProfileData = async () => {
    // Prevent duplicate requests
    if (isLoadingProfile) {
      console.log('Profile data already loading, skipping...');
      return;
    }

    try {
      setIsLoadingProfile(true);
      setLoading(true);
      setError('');
      
      console.log('Loading profile data...');
      const data = await apiService.getCurrentUser();
      console.log('Profile data loaded successfully:', data);
      
      setProfileData(data);
      
      // Update edit form with current data
      setEditForm({
        username: data.username || '',
        bio: data.bio || '',
        discordUsername: data.discord_username || '',
        timezone: data.timezone || '',
        robloxUsername: data.roblox_username || ''
      });

      // Load trade history for this user
      if (data.id) {
        await loadTradeHistory(data.id);
      }
    } catch (err: unknown) {
      console.error('Error loading profile:', err);
      
      // Check if it's a rate limiting error
      if (err instanceof Error && err.message.includes('too many requests')) {
        setError('Too many requests. Please wait a moment and try again.');
        // Retry after a delay
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 3000);
        return;
      }
      
      // Fallback to user context data if API fails
      if (user) {
        console.log('Using fallback user data from context');
        const fallbackData: ProfileData = {
          username: user.username,
          email: user.email,
          role: user.role,
          id: user.id,
          createdAt: new Date().toISOString(),
          bio: '',
          discord_username: '',
          timezone: '',
          roblox_username: '',
          avatar_url: '',
          totalTrades: 0,
          successRate: 0,
          averageRating: 0,
          totalVouches: 0,
          credibility_score: 0,
          totalWishlistItems: 0,
          vouches: [],
          achievements: []
        };
        setProfileData(fallbackData);
        setError('');
        
        // Try to load trade history even with fallback data
        if (user.id) {
          await loadTradeHistory(user.id);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
      }
    } finally {
      setIsLoadingProfile(false);
      setLoading(false);
    }
  };

  // Load profile data first, then wishlist sequentially - optimized to prevent too many requests
  useEffect(() => {
    // Only load on mount or when refreshKey changes, and prevent multiple loads
    if (hasLoadedInitially.current && refreshKey === 0) {
      return; // Skip if already loaded initially and no refresh requested
    }
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    const loadInitialData = async () => {
      // Prevent concurrent loads
      if (isLoadingProfile || isLoadingWishlist) {
        console.log('Already loading data, skipping duplicate request...');
        return;
      }
      
      try {
        console.log('Starting optimized data load...');
        setIsLoadingProfile(true);
        setLoading(true);
        setError('');
        
        // Load profile data (includes trade history now)
        const data = await apiService.getCurrentUser();
        console.log('Profile data loaded successfully:', data?.username);
        
        setProfileData(data);
        setEditForm({
          username: data.username || '',
          bio: data.bio || '',
          discordUsername: data.discord_username || '',
          timezone: data.timezone || '',
          robloxUsername: data.roblox_username || ''
        });

        // Load trade history
        if (data.id) {
          await loadTradeHistory(data.id);
        }
        
        setIsLoadingProfile(false);
        setLoading(false);
        hasLoadedInitially.current = true;
        
        // Load wishlist with delay to prevent rate limiting
        if (user?.id && data) {
          console.log('Scheduling wishlist load...');
          loadingTimeoutRef.current = setTimeout(async () => {
            if (isLoadingWishlist) {
              console.log('Wishlist already loading, skipping...');
              return;
            }
            
            try {
              setIsLoadingWishlist(true);
              const wishlist = await apiService.getUserWishlist(user.id);
              console.log('Wishlist loaded successfully:', wishlist?.length || 0, 'items');
              
              setWishlistItems(wishlist || []);
              setProfileData(prev => prev ? { ...prev, totalWishlistItems: wishlist?.length || 0 } : null);
            } catch (err) {
              console.error('Error loading wishlist:', err);
              // Don't show error for wishlist, it's not critical
            } finally {
              setIsLoadingWishlist(false);
            }
          }, 800); // Increased delay to prevent rate limiting
        }
      } catch (err: unknown) {
        console.error('Error loading profile:', err);
        setIsLoadingProfile(false);
        setLoading(false);
        
        if (err instanceof Error && err.message.includes('too many requests')) {
          setError('Too many requests. Please wait a moment and try again.');
          // Longer retry delay for rate limiting
          loadingTimeoutRef.current = setTimeout(() => {
            setRefreshKey(prev => prev + 1);
          }, 5000);
          return;
        }
        
        // Fallback to user context data if API fails
        if (user) {
          console.log('Using fallback user data from context');
          const fallbackData: ProfileData = {
            username: user.username,
            email: user.email,
            role: user.role,
            id: user.id,
            createdAt: new Date().toISOString(),
            bio: '',
            discord_username: '',
            timezone: '',
            roblox_username: '',
            avatar_url: '',
            totalTrades: 0,
            successRate: 0,
            averageRating: 0,
            totalVouches: 0,
            credibility_score: 0,
            totalWishlistItems: 0,
            vouches: [],
            achievements: []
          };
          setProfileData(fallbackData);
          setError('');
          hasLoadedInitially.current = true;
          
          // Try to load trade history even with fallback data
          if (user.id) {
            await loadTradeHistory(user.id);
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load profile data');
        }
      }
    };
    
    // Small delay to batch any rapid state changes
    loadingTimeoutRef.current = setTimeout(loadInitialData, 100);
    
    // Cleanup function
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [refreshKey, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) // 2MB limit
        {
        toast.error('Avatar file too large (max 2MB)');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setSelectedAvatar(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatar) return;
    
    try {
      setSaving(true);
      const toastId = toast.loading('Uploading avatar...');
      
      const result = await apiService.uploadAvatar(selectedAvatar);
      
      // Update profile data with new avatar
      setProfileData((prev) => prev ? ({
        ...prev,
        avatar_url: result.avatar_url
      }) : null);
      
      setSelectedAvatar(null);
      setAvatarPreview('');
      toast.success('Avatar updated successfully!', { id: toastId });
    } catch (err: unknown) {
      console.error('Failed to upload avatar:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (saving) {
      console.log('Already saving, skipping...');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      console.log('Updating profile...');
      
      await apiService.updateProfile({
        username: editForm.username,
        robloxUsername: editForm.robloxUsername,
        bio: editForm.bio,
        discordUsername: editForm.discordUsername,
        timezone: editForm.timezone
      });
      
      console.log('Profile updated successfully');
      
      setIsEditDialogOpen(false);
      toast.success('Profile updated successfully!');
      
      // Update profile data optimistically
      setProfileData(prev => prev ? {
        ...prev,
        username: editForm.username,
        bio: editForm.bio,
        discord_username: editForm.discordUsername,
        timezone: editForm.timezone,
        roblox_username: editForm.robloxUsername
      } : null);
      
      // Add a longer delay before reloading to prevent rate limiting
      setTimeout(() => {
        hasLoadedInitially.current = false; // Allow reload
        setRefreshKey(prev => prev + 1);
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      console.error('Failed to update profile:', err);
      
      if (errorMessage.includes('too many requests')) {
        setError('Too many requests. Please wait a moment and try again.');
        toast.error('Please wait a moment before trying again.');
      } else {
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddToWishlist = async (itemName: string) => {
    if (!itemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }
    
    // Prevent multiple rapid calls
    if (isLoadingWishlist) {
      toast.info('Please wait, already updating wishlist...');
      return;
    }
    
    try {
      setIsLoadingWishlist(true);
      console.log('Adding item to wishlist:', itemName);
      await apiService.addToWishlist(itemName.trim());
      
      toast.success('Item added to wishlist!');
      
      // Optimistically update the UI immediately
      const newItem: WishlistItem = {
        wishlist_id: 'temp-' + Date.now(),
        item_name: itemName.trim(),
        created_at: new Date().toISOString()
      };
      setWishlistItems(prev => [...prev, newItem]);
      
      // Reload wishlist after a delay to get the real data
      setTimeout(async () => {
        try {
          if (user?.id) {
            const wishlist = await apiService.getUserWishlist(user.id);
            setWishlistItems(wishlist || []);
          }
        } catch (err) {
          console.error('Error reloading wishlist:', err);
        }
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to wishlist';
      console.error('Failed to add to wishlist:', err);
      
      if (errorMessage.includes('too many requests')) {
        toast.error('Please wait a moment before adding more items.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoadingWishlist(false);
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    // Prevent multiple rapid calls
    if (isLoadingWishlist) {
      toast.info('Please wait, already updating wishlist...');
      return;
    }
    
    try {
      setIsLoadingWishlist(true);
      console.log('Removing item from wishlist:', wishlistId);
      
      // Optimistically update the UI immediately
      setWishlistItems(prev => prev.filter(item => item.wishlist_id !== wishlistId));
      
      await apiService.removeFromWishlist(wishlistId);
      toast.success('Item removed from wishlist!');
      
      // Reload wishlist after a delay to ensure sync
      setTimeout(async () => {
        try {
          if (user?.id) {
            const wishlist = await apiService.getUserWishlist(user.id);
            setWishlistItems(wishlist || []);
          }
        } catch (err) {
          console.error('Error reloading wishlist:', err);
        }
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item from wishlist';
      console.error('Failed to remove from wishlist:', err);
      
      // Revert optimistic update on error
      if (user?.id) {
        try {
          const wishlist = await apiService.getUserWishlist(user.id);
          setWishlistItems(wishlist || []);
        } catch {
          // If reload fails, just show error
        }
      }
      
      if (errorMessage.includes('too many requests')) {
        toast.error('Please wait a moment before removing more items.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoadingWishlist(false);
    }
  };

  const refreshData = () => {
    if (isLoadingProfile || isLoadingWishlist) {
      toast.info('Data is already loading, please wait...');
      return;
    }
    
    // Prevent rapid successive refresh calls
    if (loadingTimeoutRef.current) {
      toast.info('Refresh already in progress, please wait...');
      return;
    }
    
    console.log('Manual data refresh triggered');
    hasLoadedInitially.current = false; // Allow reload
    setRefreshKey(prev => prev + 1);
    toast.info('Refreshing profile data...');
  };

  // Helper function to get avatar URL
  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return '';
    
    // If it's already a full URL, return as is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // If it's a relative path, prepend the backend URL
    if (avatarUrl.startsWith('/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }
    
    // If it's just a filename, construct the full path
    return `http://localhost:5000/uploads/avatars/${avatarUrl}`;
  };

  // Filter trades based on current filter
  const filteredTrades = tradeHistory?.trades.filter(trade => {
    if (tradeFilter === 'all') return true;
    return trade.status === tradeFilter;
  }) || [];

  // Show loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !profileData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadProfileData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="w-20 h-20 transition-transform group-hover:scale-105">
                <AvatarImage 
                  src={avatarPreview || getAvatarUrl(profileData?.avatar_url)} 
                  className="object-cover"
                  onError={(e) => {
                    // If avatar fails to load, remove src to show fallback
                    const target = e.target as HTMLImageElement;
                    target.src = '';
                  }}
                />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {profileData?.username?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 cursor-pointer transition-colors shadow-lg">
                <Camera className="w-3 h-3" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </label>
              {selectedAvatar && (
                <div className="absolute -top-2 -right-2 flex gap-1">
                  <Button
                    size="sm"
                    onClick={handleAvatarUpload}
                    disabled={saving}
                    className="h-6 px-2 bg-green-500 hover:bg-green-600 shadow-md"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedAvatar(null);
                      setAvatarPreview('');
                    }}
                    className="h-6 px-2 shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {profileData?.username || user?.username || 'User'}
                {profileData?.role && ['admin', 'moderator', 'mm', 'mw'].includes(profileData.role) && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                    ✓ {profileData.role.toUpperCase()}
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <span className="font-medium">@{profileData?.roblox_username || 'Not set'}</span>
                {profileData?.credibility_score !== undefined && (
                  <Badge variant="outline" className={`
                    ${profileData.credibility_score >= 90 ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300' : ''}
                    ${profileData.credibility_score >= 70 && profileData.credibility_score < 90 ? 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300' : ''}
                    ${profileData.credibility_score >= 50 && profileData.credibility_score < 70 ? 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300' : ''}
                    ${profileData.credibility_score < 50 ? 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300' : ''}
                  `}>
                    {profileData.credibility_score}% Trust Score
                  </Badge>
                )}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 transition-colors ${
                      i < Math.floor(profileData?.averageRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {profileData?.averageRating?.toFixed(1) || '0.0'} ({profileData?.totalVouches || 0} vouches)
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>
                    Update your profile information to help others connect with you
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleEditProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={editForm.username}
                      onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter your username"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be your display name on the platform
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="roblox">Roblox Username *</Label>
                    <Input
                      id="roblox"
                      value={editForm.robloxUsername}
                      onChange={(e) => setEditForm(prev => ({ ...prev, robloxUsername: e.target.value }))}
                      placeholder="Enter your Roblox username"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Your Roblox username for trading verification
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="min-h-[100px] resize-none"
                      placeholder="Tell others about yourself, your trading interests, or experience..."
                      maxLength={500}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {editForm.bio.length}/500 characters
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="discord">Discord Username</Label>
                    <Input
                      id="discord"
                      value={editForm.discordUsername}
                      onChange={(e) => setEditForm(prev => ({ ...prev, discordUsername: e.target.value }))}
                      placeholder="username#1234 or @username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={editForm.timezone}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EST (UTC-5)">EST (UTC-5)</SelectItem>
                        <SelectItem value="CST (UTC-6)">CST (UTC-6)</SelectItem>
                        <SelectItem value="MST (UTC-7)">MST (UTC-7)</SelectItem>
                        <SelectItem value="PST (UTC-8)">PST (UTC-8)</SelectItem>
                        <SelectItem value="GMT (UTC+0)">GMT (UTC+0)</SelectItem>
                        <SelectItem value="CET (UTC+1)">CET (UTC+1)</SelectItem>
                        <SelectItem value="JST (UTC+9)">JST (UTC+9)</SelectItem>
                        <SelectItem value="AEST (UTC+10)">AEST (UTC+10)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {error && (
                    <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-950 rounded">{error}</div>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trades">
                Trade History
                {tradeHistory && <Badge variant="outline" className="ml-1">{tradeHistory.totalTrades}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
              <TabsTrigger value="vouches">Vouches</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
                        <p className="text-2xl font-bold">{profileData?.totalTrades || 0}</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min((profileData?.totalTrades || 0) / 100 * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
                        <p className={`text-2xl font-bold ${
                          (profileData?.successRate || 0) >= 95 ? 'text-green-600' :
                          (profileData?.successRate || 0) >= 85 ? 'text-blue-600' :
                          (profileData?.successRate || 0) >= 75 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{profileData?.successRate || 0}%</p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              (profileData?.successRate || 0) >= 95 ? 'bg-green-500' :
                              (profileData?.successRate || 0) >= 85 ? 'bg-blue-500' :
                              (profileData?.successRate || 0) >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${profileData?.successRate || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                        <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
                        <p className="text-2xl font-bold">{profileData?.averageRating?.toFixed(1) || '0.0'}</p>
                        <div className="flex mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${
                              i < Math.floor(profileData?.averageRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" />
                  <CardContent className="p-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                        <p className="text-2xl font-bold">
                          {profileData?.createdAt ? new Date(profileData.createdAt).getFullYear() : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {profileData?.createdAt ? 
                            `${Math.floor((Date.now() - new Date(profileData.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago` : 
                            'Unknown'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bio and Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      About
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Bio</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          {profileData?.bio || 'No bio provided yet. Add one to tell others about yourself!'}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Joined:</span>
                            <span className="font-medium">
                              {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Unknown'}
                            </span>
                          </div>
                          {profileData?.timezone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Timezone:</span>
                              <span className="font-medium">{profileData.timezone}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {profileData?.discord_username && (
                            <div className="flex items-center gap-2 text-sm">
                              <MessageSquare className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Discord:</span>
                              <span className="font-medium font-mono">{profileData.discord_username}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Trust Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                (profileData?.credibility_score || 0) >= 90 ? 'bg-green-500' :
                                (profileData?.credibility_score || 0) >= 70 ? 'bg-blue-500' :
                                (profileData?.credibility_score || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${profileData?.credibility_score || 0}%` }}
                            />
                          </div>
                          <span className={`font-medium text-sm ${
                            (profileData?.credibility_score || 0) >= 90 ? 'text-green-600' :
                            (profileData?.credibility_score || 0) >= 70 ? 'text-blue-600' :
                            (profileData?.credibility_score || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {profileData?.credibility_score || 0}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Vouches</span>
                        <span className="font-medium">{profileData?.totalVouches || 0}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Wishlist Items</span>
                        <span className="font-medium">{wishlistItems.length || 0}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Trade Value</span>
                        <span className="font-medium text-green-600">
                          {profileData?.recentTrades?.reduce((sum, trade) => sum + (trade.trade_value || 0), 0) || 0} RAP
                        </span>
                      </div>
                    </div>
                    
                    {profileData?.role && ['admin', 'moderator', 'mm', 'mw'].includes(profileData.role) && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Verified {profileData.role === 'mm' ? 'Middleman' : profileData.role === 'mw' ? 'Middlewoman' : profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trades" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Trade History</h3>
                <div className="flex items-center gap-2">
                  <Select value={tradeFilter} onValueChange={(value: any) => setTradeFilter(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trades</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  {tradeHistory && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {tradeHistory.completedTrades} Completed
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        {tradeHistory.activeTrades} Active
                      </Badge>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        {tradeHistory.pendingTrades} Pending
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Trade Statistics Cards */}
              {tradeHistory && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Trades</p>
                          <p className="text-2xl font-bold">{tradeHistory.totalTrades}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Success Rate</p>
                          <p className="text-2xl font-bold text-green-600">{tradeHistory.successRate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-2xl font-bold text-yellow-600">{tradeHistory.totalValue.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Avg. Per Trade</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {tradeHistory.totalTrades > 0 ? Math.round(tradeHistory.totalValue / tradeHistory.totalTrades).toLocaleString() : '0'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <Card>
                <CardContent className="p-0">
                  {loadingTrades ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading trade history...</p>
                    </div>
                  ) : filteredTrades.length > 0 ? (
                    <div className="divide-y">
                      {filteredTrades.map((trade, index) => (
                        <div key={trade._id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                  trade.status === 'completed' ? 'bg-green-500' : 
                                  trade.status === 'active' ? 'bg-blue-500 animate-pulse' : 
                                  trade.status === 'pending' ? 'bg-yellow-500' :
                                  trade.status === 'disputed' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`} />
                                {trade.trade_direction === 'outgoing' ? (
                                  <ArrowUpRight className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <ArrowDownLeft className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium truncate">{trade.item_offered || trade.title}</p>
                                  {trade.item_requested && (
                                    <>
                                      <span className="text-muted-foreground">→</span>
                                      <p className="text-sm text-muted-foreground truncate">{trade.item_requested}</p>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span>#{trade._id.slice(-6)}</span>
                                  <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                                  {trade.other_user_name && (
                                    <span className="text-blue-600">
                                      {trade.trade_direction === 'outgoing' ? 'To:' : 'From:'} {trade.other_user_name}
                                    </span>
                                  )}
                                  {trade.trade_value && (
                                    <span className="text-green-600 font-medium">{trade.trade_value.toLocaleString()} RAP</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={trade.status === 'completed' ? 'default' : trade.status === 'active' ? 'secondary' : 'outline'}
                                className={`${
                                  trade.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                  trade.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                  trade.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                  trade.status === 'disputed' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                  ''
                                }`}
                              >
                                {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                              </Badge>
                              {trade.trade_type && (
                                <Badge variant="outline" className="text-xs">
                                  {trade.trade_type.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        {tradeFilter === 'all' ? 'No trades yet' : `No ${tradeFilter} trades`}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {tradeFilter === 'all' 
                          ? 'Start trading to build your history and reputation!'
                          : `You don't have any ${tradeFilter} trades at the moment.`
                        }
                      </p>
                      {tradeFilter !== 'all' && (
                        <Button variant="outline" onClick={() => setTradeFilter('all')}>
                          View All Trades
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wishlist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      My Wishlist
                      <Badge variant="outline">{wishlistItems.length} items</Badge>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600">
                          <Heart className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add to Wishlist</DialogTitle>
                          <DialogDescription>
                            Add an item you're looking for to your wishlist. This helps other traders know what you want.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target as HTMLFormElement);
                          const itemName = formData.get('itemName') as string;
                          if (itemName?.trim()) {
                            handleAddToWishlist(itemName.trim());
                            (e.target as HTMLFormElement).reset();
                          }
                        }} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="itemName">Item Name *</Label>
                            <Input
                              id="itemName"
                              name="itemName"
                              placeholder="e.g., Dominus Empyreus, Valkyrie Helm..."
                              required
                              autoFocus
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline">Cancel</Button>
                            </DialogTrigger>
                            <Button type="submit">Add to Wishlist</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {wishlistItems.length > 0 ? (
                    <div className="grid gap-3">
                      {wishlistItems.map((item, index) => (
                        <div key={item.wishlist_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-red-100 dark:bg-red-900 rounded-full">
                              <Heart className="w-4 h-4 text-red-500 fill-current" />
                            </div>
                            <div>
                              <p className="font-medium">{item.item_name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>#{index + 1}</span>
                                <span>•</span>
                                <span>Added {new Date(item.created_at).toLocaleDateString()}</span>
                                {item.priority && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className={`text-xs ${
                                      item.priority === 'high' ? 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950' :
                                      item.priority === 'medium' ? 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950' :
                                      'border-green-500 text-green-700 bg-green-50 dark:bg-green-950'
                                    }`}>
                                      {item.priority} priority
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveFromWishlist(item.wishlist_id)}
                            className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-950"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <Heart className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No wishlist items</h3>
                      <p className="text-muted-foreground mb-4">Add items you're looking for to help traders find you!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vouches" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Community Vouches</h3>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${
                        i < Math.floor(profileData?.averageRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`} />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {profileData?.averageRating?.toFixed(1) || '0.0'} average
                  </span>
                </div>
              </div>
              
              {profileData?.vouches && profileData.vouches.length > 0 ? (
                <div className="grid gap-4">
                  {profileData.vouches.map((vouch) => (
                    <Card key={vouch._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={vouch.given_by_avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {vouch.given_by[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{vouch.given_by}</span>
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${
                                    i < vouch.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`} />
                                ))}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {vouch.rating}/5
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              "{vouch.comment}"
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(vouch.createdAt).toLocaleDateString()}</span>
                              {vouch.trade_id && (
                                <>
                                  <span>•</span>
                                  <span>Trade #{vouch.trade_id.slice(-6)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                      <Star className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No vouches yet</h3>
                    <p className="text-muted-foreground mb-4">Complete trades to receive vouches from other users!</p>
                    <Button variant="outline" onClick={() => setActiveTab('trades')}>
                      View Trade History
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Achievements</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {profileData?.achievements?.filter(a => a.earned).length || 0} Earned
                  </Badge>
                  <Badge variant="outline">
                    {profileData?.achievements?.length || 0} Total
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileData?.achievements && profileData.achievements.length > 0 ? profileData.achievements.map((achievement) => (
                  <Card key={achievement.id} className={`relative overflow-hidden transition-all duration-200 hover:scale-105 ${
                    achievement.earned 
                      ? 'border-green-200 bg-gradient-to-br from-green-50/80 to-green-100/50 dark:border-green-800 dark:from-green-950/80 dark:to-green-900/50 shadow-lg' 
                      : 'opacity-60 hover:opacity-80'
                  }`}>
                    {achievement.earned && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {achievement.rarity && (
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500' :
                        achievement.rarity === 'epic' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                        achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`} />
                    )}
                    
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          achievement.earned 
                            ? 'bg-green-100 dark:bg-green-900' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {achievement.icon ? (
                            <img src={achievement.icon} alt="" className="w-5 h-5" />
                          ) : (
                            <Trophy className={`w-5 h-5 ${
                              achievement.earned 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-400'
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{achievement.name || achievement.title}</p>
                            {achievement.rarity && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs border-0 ${
                                  achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 dark:from-yellow-900 dark:to-orange-900 dark:text-orange-300' :
                                  achievement.rarity === 'epic' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900 dark:to-pink-900 dark:text-purple-300' :
                                  achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900 dark:to-cyan-900 dark:text-blue-300' :
                                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {achievement.rarity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{achievement.description}</p>
                          {achievement.earned && (
                            <div className="flex items-center gap-1">
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Earned
                              </Badge>
                              {achievement.date && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(achievement.date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                          <Trophy className="w-8 h-8 text-yellow-500" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">No achievements yet</h3>
                        <p className="text-muted-foreground mb-4">Complete trades and activities to earn achievements!</p>
                        <Button variant="outline" onClick={() => setActiveTab('overview')}>
                          View Profile Stats
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}