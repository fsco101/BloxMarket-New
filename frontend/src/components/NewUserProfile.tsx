import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare,
  MessageCircle,
  Globe,
  Calendar,
  Edit,
  Camera,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ProfileData {
  _id: string;
  username: string;
  email: string;
  roblox_username?: string;
  bio?: string;
  discord_username?: string;
  messenger_link?: string;
  website?: string;
  avatar_url?: string;
  role: string;
  createdAt: string;
  vouch_count: number;
  totalVouches: number;
  wishlistItems: Array<{
    wishlist_id: string;
    item_name: string;
    item_value?: string;
    description?: string;
    image_url?: string;
  }>;
}

interface EditFormData {
  username: string;
  bio: string;
  discordUsername: string;
  messengerLink: string;
  website: string;
  robloxUsername: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function NewUserProfile() {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [editForm, setEditForm] = useState<EditFormData>({
    username: '',
    bio: '',
    discordUsername: '',
    messengerLink: '',
    website: '',
    robloxUsername: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await apiService.getCurrentUser();
        setProfileData(data);

        // Initialize edit form with current data
        setEditForm({
          username: data.username || '',
          bio: data.bio || '',
          discordUsername: data.discord_username || '',
          messengerLink: data.messenger_link || '',
          website: data.website || '',
          robloxUsername: data.roblox_username || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } catch (err: unknown) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
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
      setProfileData(prev => prev ? ({
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

    if (saving) return;

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

      const updateData: {
        username: string;
        robloxUsername: string;
        bio: string;
        discordUsername: string;
        messengerLink: string;
        website: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        username: editForm.username,
        robloxUsername: editForm.robloxUsername,
        bio: editForm.bio,
        discordUsername: editForm.discordUsername,
        messengerLink: editForm.messengerLink,
        website: editForm.website
      };

      // Add password change if provided
      if (editForm.newPassword) {
        updateData.currentPassword = editForm.currentPassword;
        updateData.newPassword = editForm.newPassword;
      }

      await apiService.updateProfile(updateData);

      setIsEditDialogOpen(false);
      toast.success('Profile updated successfully!');

      // Refetch profile data to ensure we have the latest data
      try {
        const updatedData = await apiService.getCurrentUser();
        setProfileData(updatedData);
      } catch (refetchError) {
        console.error('Failed to refetch profile data:', refetchError);
        // Fallback to optimistic update if refetch fails
        setProfileData(prev => prev ? {
          ...prev,
          username: editForm.username,
          bio: editForm.bio,
          discord_username: editForm.discordUsername,
          messenger_link: editForm.messengerLink,
          website: editForm.website,
          roblox_username: editForm.robloxUsername
        } : null);
      }

      // Clear password fields
      setEditForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      console.error('Failed to update profile:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) return '';

    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('/api/uploads/')) {
      return `http://localhost:5000${avatarUrl}`;
    }

    return `http://localhost:5000/uploads/avatars/${avatarUrl}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Profile Header - Hero Section */}
        <Card className="mb-8 overflow-hidden shadow-2xl border-0 bg-white dark:bg-gray-800">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700"></div>

            <CardContent className="relative p-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Avatar Section - Larger */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gray-300 dark:bg-gray-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                      <AvatarImage
                        src={avatarPreview || getAvatarUrl(profileData?.avatar_url)}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                        }}
                      />
                      <AvatarFallback className="text-3xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {profileData?.username?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-1 right-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-white z-10">
                      <Camera className="w-3 h-3" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {selectedAvatar && (
                    <div className="absolute -top-3 -right-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAvatarUpload}
                        disabled={saving}
                        className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 shadow-lg"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedAvatar(null);
                          setAvatarPreview('');
                        }}
                        className="h-8 w-8 p-0 shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Profile Info - Enhanced */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                    <div className="mb-4 lg:mb-0">
                      <div className="flex items-center gap-4 mb-3 justify-center lg:justify-start">
                        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
                          {profileData?.username || user?.username || 'User'}
                        </h1>
                        {profileData?.role && ['admin', 'moderator', 'mm', 'mw'].includes(profileData.role) && (
                          <Badge variant="secondary" className="bg-gray-600 text-white border-0 px-3 py-1 text-sm font-medium">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {profileData.role.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                        @{profileData?.roblox_username || 'Not set'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Member since {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Unknown'}
                      </p>
                    </div>

                    {/* Edit Profile Button */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Edit className="w-5 h-5 mr-2" />
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleEditProfile} className="space-y-6 py-4">
                          {/* Profile Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Profile Information</h3>

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
                                placeholder="Tell others about yourself..."
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
                                  maxLength={50}
                                />
                                <div className="text-xs text-muted-foreground text-right">
                                  {editForm.discordUsername.length}/50 characters
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="messenger">Messenger Link</Label>
                                <Input
                                  id="messenger"
                                  value={editForm.messengerLink}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, messengerLink: e.target.value }))}
                                  placeholder="https://m.me/username"
                                  maxLength={200}
                                />
                                <div className="text-xs text-muted-foreground text-right">
                                  {editForm.messengerLink.length}/200 characters
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="website">Website/Social Media</Label>
                              <Input
                                id="website"
                                value={editForm.website}
                                onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                                placeholder="https://twitter.com/username"
                                maxLength={200}
                              />
                              <div className="text-xs text-muted-foreground text-right">
                                {editForm.website.length}/200 characters
                              </div>
                            </div>
                          </div>

                          {/* Password Change */}
                          <div className="space-y-4 border-t pt-6">
                            <h3 className="text-lg font-semibold border-b pb-2">Change Password</h3>

                            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
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

                          <div className="flex justify-end gap-3 pt-4 border-t">
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

                  {/* Enhanced Stats */}
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {profileData?.totalVouches || 0}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Vouches</div>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {profileData?.wishlistItems && profileData.wishlistItems.length > 0 ? (
                          <div className="space-y-1">
                            {profileData.wishlistItems.slice(0, 3).map((item) => (
                              <div key={item.wishlist_id} className="text-sm truncate">
                                {item.item_name}
                              </div>
                            ))}
                            {profileData.wishlistItems.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                +{profileData.wishlistItems.length - 3} more
                              </div>
                            )}
                          </div>
                        ) : (
                          'No items'
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Wishlist Items</div>
                    </div>
                      <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                          {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Member Since</div>
                      </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Profile Content - Enhanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Bio and Links */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio Section - Enhanced */}
            {profileData?.bio && (
              <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">
                    About Me
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                    {profileData.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information - Enhanced */}
            <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-gray-900 dark:text-white">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileData?.discord_username && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="p-3 bg-blue-500 rounded-full">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Discord</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{profileData.discord_username}</p>
                      </div>
                    </div>
                  )}

                  {profileData?.messenger_link && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="p-3 bg-green-500 rounded-full">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Messenger</p>
                        <a
                          href={profileData.messenger_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {profileData.messenger_link}
                        </a>
                      </div>
                    </div>
                  )}

                  {profileData?.website && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="p-3 bg-purple-500 rounded-full">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Website</p>
                        <a
                          href={profileData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {profileData.website}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="p-3 bg-indigo-500 rounded-full">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Member Since</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Additional Info */}
          <div className="space-y-8">
            {/* Account Details */}
            <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-900 dark:text-white">
                  Account Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Username</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{profileData?.username || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Roblox</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">@{profileData?.roblox_username || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Role</span>
                  <Badge variant="outline" className="text-xs">
                    {profileData?.role || 'user'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{profileData?.email || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-900 dark:text-white">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{profileData?.totalVouches || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Vouches</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {profileData?.wishlistItems && profileData.wishlistItems.length > 0 ? (
                      <div className="space-y-1">
                        {profileData.wishlistItems.slice(0, 3).map((item) => (
                          <div key={item.wishlist_id} className="text-sm truncate">
                            {item.item_name}
                          </div>
                        ))}
                        {profileData.wishlistItems.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{profileData.wishlistItems.length - 3} more
                          </div>
                        )}
                      </div>
                    ) : (
                      'No items'
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Wishlist Items</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}