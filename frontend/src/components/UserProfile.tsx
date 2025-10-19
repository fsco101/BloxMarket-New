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
import { 
  Star, 
  Calendar, 
  MessageSquare, 
  Edit,
  Heart,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Camera,
  Save,
  X,
  RefreshCw,
  MapPin,
  MessageCircle,
  Globe,
  DollarSign,
  User,
  Mail
} from 'lucide-react';
interface ProfileData {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  bio: string;
  discord_username: string;
  messenger_link: string;
  website: string;
  location: string;
  timezone: string;
  roblox_username: string;
  avatar_url: string;
  totalVouches: number;
  credibility_score: number;
  totalWishlistItems: number;
  vouches: Vouch[];
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
  vouch_id?: string;
  voucher_username?: string;
  type?: string;
  created_at?: string;
  trade_value?: number;
}

interface EditFormData {
  username: string;
  bio: string;
  discordUsername: string;
  messengerLink: string;
  website: string;
  location: string;
  timezone: string;
  robloxUsername: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function UserProfile() {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Add flags to prevent duplicate API calls
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const hasLoadedInitially = useRef(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  
  const [editForm, setEditForm] = useState<EditFormData>({
    username: '',
    bio: '',
    discordUsername: '',
    messengerLink: '',
    website: '',
    location: '',
    timezone: '',
    robloxUsername: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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
        messengerLink: data.messenger_link || '',
        website: data.website || '',
        location: data.location || '',
        timezone: data.timezone || '',
        robloxUsername: data.roblox_username || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
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
          role: user?.role || 'user',
          id: user.id,
          createdAt: new Date().toISOString(),
          bio: '',
          discord_username: '',
          messenger_link: '',
          website: '',
          location: '',
          timezone: '',
          roblox_username: '',
          avatar_url: '',
          totalVouches: 0,
          credibility_score: 0,
          totalWishlistItems: 0,
          vouches: []
        };
        setProfileData(fallbackData);
        setError('');
        
        // Try to load trade history even with fallback data
        if (user.id) {
          // Note: Trade history loading removed as requested
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
          messengerLink: data.messenger_link || '',
          website: data.website || '',
          location: data.location || '',
          timezone: data.timezone || '',
          robloxUsername: data.roblox_username || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Load trade history
        if (data.id) {
          // Note: Trade history loading removed as requested
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
            role: user.role || 'user',
            id: user.id,
            createdAt: new Date().toISOString(),
            bio: '',
            discord_username: '',
            messenger_link: '',
            website: '',
            location: '',
            timezone: '',
            roblox_username: '',
            avatar_url: '',
            totalVouches: 0,
            credibility_score: 0,
            totalWishlistItems: 0,
            vouches: []
          };
          setProfileData(fallbackData);
          setError('');
          hasLoadedInitially.current = true;
          
          // Try to load trade history even with fallback data
          if (user.id) {
            // Note: Trade history loading removed as requested
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
    
    // Validate password change
    if (editForm.newPassword || editForm.confirmPassword || editForm.currentPassword) {
      if (!editForm.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (!editForm.newPassword) {
        setError('New password is required');
        return;
      }
      if (editForm.newPassword !== editForm.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
      if (editForm.newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
    }
    
    try {
      setSaving(true);
      setError('');
      
      console.log('Updating profile...');
      
      const updateData: {
        username: string;
        robloxUsername: string;
        bio: string;
        discordUsername: string;
        messengerLink: string;
        website: string;
        location: string;
        timezone: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        username: editForm.username,
        robloxUsername: editForm.robloxUsername,
        bio: editForm.bio,
        discordUsername: editForm.discordUsername,
        messengerLink: editForm.messengerLink,
        website: editForm.website,
        location: editForm.location,
        timezone: editForm.timezone
      };
      
      // Add password change if provided
      if (editForm.newPassword) {
        updateData.currentPassword = editForm.currentPassword;
        updateData.newPassword = editForm.newPassword;
      }
      
      await apiService.updateProfile(updateData);
      
      console.log('Profile updated successfully');
      
      setIsEditDialogOpen(false);
      toast.success('Profile updated successfully!');
      
      // Update profile data optimistically
      setProfileData(prev => prev ? {
        ...prev,
        username: editForm.username,
        bio: editForm.bio,
        discord_username: editForm.discordUsername,
        messenger_link: editForm.messengerLink,
        website: editForm.website,
        location: editForm.location,
        timezone: editForm.timezone,
        roblox_username: editForm.robloxUsername
      } : null);
      
      // Clear password fields
      setEditForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Profile Header */}
      <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="relative max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-all duration-300" />
              <div className="relative">
                <Avatar className="relative w-24 h-24 border-4 border-white dark:border-slate-800 shadow-xl transition-transform group-hover:scale-105">
                  <AvatarImage
                    src={avatarPreview || getAvatarUrl(profileData?.avatar_url)}
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '';
                    }}
                  />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-700 dark:text-blue-300 font-bold">
                    {profileData?.username?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full p-2 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 border-2 border-white dark:border-slate-800">
                  <Camera className="w-4 h-4" />
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
                      className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600 shadow-md rounded-full"
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
                      className="h-6 w-6 p-0 shadow-md rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {profileData?.username || user?.username || 'User'}
                </h1>
                {profileData?.role && ['admin', 'moderator', 'mm', 'mw'].includes(profileData.role) && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {profileData.role.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                @{profileData?.roblox_username || 'Not set'}
              </p>

              {/* Quick Stats */}
              <div className="flex justify-center lg:justify-start items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-medium">{profileData?.totalVouches || 0}</span>
                  <span>Vouches</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <Heart className="w-4 h-4 text-pink-500 fill-current" />
                  <span className="font-medium">{profileData?.totalWishlistItems || 0}</span>
                  <span>Wishlist</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <span>Joined {profileData?.createdAt ? new Date(profileData.createdAt).getFullYear() : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Edit Profile</DialogTitle>
                    <DialogDescription>
                      Update your profile information and settings
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleEditProfile} className="space-y-8 py-4">
                    {/* User Details Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                        User Details
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            value={editForm.username}
                            onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Enter your username"
                            required
                          />
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
                        </div>
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <Label htmlFor="messenger">Messenger Link</Label>
                          <Input
                            id="messenger"
                            value={editForm.messengerLink}
                            onChange={(e) => setEditForm(prev => ({ ...prev, messengerLink: e.target.value }))}
                            placeholder="https://m.me/username or other messenger link"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="website">Website/Social Media</Label>
                          <Input
                            id="website"
                            value={editForm.website}
                            onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="https://twitter.com/username or personal website"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={editForm.location}
                            onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="City, Country or Region"
                          />
                        </div>
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
                    </div>
                    
                    {/* Account Settings Section */}
                    <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                        Account Settings
                      </h3>
                      
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-3">Change Password</h4>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              value={editForm.currentPassword}
                              onChange={(e) => setEditForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                              placeholder="Enter current password"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={editForm.newPassword}
                              onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                              placeholder="Enter new password"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={editForm.confirmPassword}
                              onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {error && (
                      <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                        {error}
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="space-y-8">
            {/* User Details Section */}
            <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  User Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bio */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 border border-slate-200/50 dark:border-slate-600/50">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Bio
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {profileData?.bio || 'No bio provided yet. Tell others about yourself, your trading interests, or experience!'}
                  </p>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-green-500" />
                      Contact
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Discord</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {profileData?.discord_username || 'Not provided'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Messenger</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {profileData?.messenger_link ? (
                              <a href={profileData.messenger_link} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 dark:text-blue-400 hover:underline">
                                {profileData.messenger_link}
                              </a>
                            ) : 'Not provided'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                          <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Website</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {profileData?.website ? (
                              <a href={profileData.website} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 dark:text-blue-400 hover:underline">
                                {profileData.website}
                              </a>
                            ) : 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      Location & Time
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                          <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Location</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {profileData?.location || 'Not provided'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                          <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Timezone</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {profileData?.timezone || 'Not provided'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Member Since</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Activity</h2>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 p-1 rounded-xl shadow-sm">
                  <TabsTrigger value="stats" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200">
                    Statistics
                  </TabsTrigger>
                  <TabsTrigger value="wishlist" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white transition-all duration-200">
                    Wishlist
                  </TabsTrigger>
                  <TabsTrigger value="vouches" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-500 data-[state=active]:text-white transition-all duration-200">
                    Vouches
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stats" className="space-y-6">
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="p-6 relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                              {profileData?.createdAt ? new Date(profileData.createdAt).getFullYear() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Member Since</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {profileData?.createdAt ? Math.floor((new Date().getTime() - new Date(profileData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days ago
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200/50 dark:border-yellow-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="p-6 relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-xl">
                            <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                              {profileData?.totalVouches || 0}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">Total Vouches</p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">Community reputation</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-pink-200/50 dark:border-pink-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="p-6 relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-pink-100 dark:bg-pink-900/50 rounded-xl">
                            <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-pink-700 dark:text-pink-300">
                              {profileData?.totalWishlistItems || 0}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-pink-900 dark:text-pink-100 mb-1">Wishlist Items</p>
                          <p className="text-xs text-pink-600 dark:text-pink-400">Items looking for</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardContent className="p-6 relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                              {profileData?.credibility_score || 0}%
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Credibility Score</p>
                          <p className="text-xs text-green-600 dark:text-green-400">Trust rating</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="wishlist" className="space-y-6">
              <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">My Wishlist</h3>
                        <p className="text-sm text-muted-foreground mt-1">Items you're looking for</p>
                      </div>
                      <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-950 dark:border-pink-800 dark:text-pink-300">
                        {wishlistItems.length} items
                      </Badge>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg border-0">
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
                            <Button type="button" variant="outline" onClick={() => { /* close handled by dialog provider */ }}>Cancel</Button>
                            <Button type="submit">Add to Wishlist</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {wishlistItems.length > 0 ? (
                    <div className="grid gap-4">
                      {wishlistItems.map((item, index) => (
                        <div key={item.wishlist_id} className="group relative bg-gradient-to-r from-white to-pink-50/30 dark:from-slate-800 dark:to-pink-950/10 rounded-xl p-6 border border-pink-200/50 dark:border-pink-800/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/50 dark:to-rose-900/50 rounded-xl border border-pink-200/50 dark:border-pink-800/50">
                                <Heart className="w-6 h-6 text-pink-500 fill-current" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-sm font-medium text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/50 px-2 py-1 rounded-full">
                                    #{index + 1}
                                  </span>
                                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    {item.item_name}
                                  </h4>
                                  {item.priority && (
                                    <Badge variant="outline" className={`text-xs border-0 ${
                                      item.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                                      'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                                    }`}>
                                      {item.priority} priority
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Added {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveFromWishlist(item.wishlist_id)}
                              className="bg-white/60 dark:bg-slate-800/60 border-pink-200 dark:border-pink-800 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700 dark:hover:bg-pink-950 transition-all duration-200"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/50 dark:to-rose-900/50 rounded-2xl flex items-center justify-center border border-pink-200/50 dark:border-pink-800/50">
                        <Heart className="w-10 h-10 text-pink-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No wishlist items</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        Add items you're looking for to help other traders find you and make great deals!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vouches" className="space-y-6">
              <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">My Vouches</h3>
                        <p className="text-sm text-muted-foreground mt-1">Reputation and feedback from trades</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300">
                        {profileData?.vouches?.length || 0} vouches
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {(profileData?.vouches?.length || 0) > 0 ? (
                    <div className="grid gap-4">
                      {(profileData?.vouches || []).map((vouch) => (
                        <div key={vouch.vouch_id} className="group relative bg-gradient-to-r from-white to-emerald-50/30 dark:from-slate-800 dark:to-emerald-950/10 rounded-xl p-6 border border-emerald-200/50 dark:border-emerald-800/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                          <div className="relative flex items-start gap-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                              <Star className="w-6 h-6 text-emerald-500 fill-current" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                  {vouch.voucher_username}
                                </h4>
                                <Badge variant="outline" className={`text-xs border-0 ${
                                  vouch.type === 'positive' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                  vouch.type === 'neutral' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                                  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                }`}>
                                  {vouch.type}
                                </Badge>
                                {vouch.trade_id && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                                    Trade #{vouch.trade_id}
                                  </Badge>
                                )}
                              </div>
                              {vouch.comment && (
                                <p className="text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                                  "{vouch.comment}"
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {vouch.created_at ? new Date(vouch.created_at).toLocaleDateString() : 'Unknown'}
                                </span>
                                {vouch.trade_value && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    {vouch.trade_value} Robux
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-2xl flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
                        <Star className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No vouches yet</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        Complete your first trade to start building your reputation! Vouches help other traders know you're trustworthy.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
  );
};
