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
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  bio: string;
  discord_username: string;
  messenger_link: string;
  website: string;
  roblox_username: string;
  avatar_url: string;
  totalVouches: number;
  totalWishlistItems: number;
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

      // Update profile data optimistically
      setProfileData(prev => prev ? {
        ...prev,
        username: editForm.username,
        bio: editForm.bio,
        discord_username: editForm.discordUsername,
        messenger_link: editForm.messengerLink,
        website: editForm.website,
        roblox_username: editForm.robloxUsername
      } : null);

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

    if (avatarUrl.startsWith('/uploads/')) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar Section */}
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                  <AvatarImage
                    src={avatarPreview || getAvatarUrl(profileData?.avatar_url)}
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '';
                    }}
                  />
                  <AvatarFallback className="text-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {profileData?.username?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 cursor-pointer transition-colors shadow-lg">
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
                      className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600"
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
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {profileData?.username || user?.username || 'User'}
                      </h1>
                      {profileData?.role && ['admin', 'moderator', 'mm', 'mw'].includes(profileData.role) && (
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {profileData.role.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      @{profileData?.roblox_username || 'Not set'}
                    </p>
                  </div>

                  {/* Edit Profile Button */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="mt-4 md:mt-0">
                        <Edit className="w-4 h-4 mr-2" />
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
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="messenger">Messenger Link</Label>
                              <Input
                                id="messenger"
                                value={editForm.messengerLink}
                                onChange={(e) => setEditForm(prev => ({ ...prev, messengerLink: e.target.value }))}
                                placeholder="https://m.me/username"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="website">Website/Social Media</Label>
                            <Input
                              id="website"
                              value={editForm.website}
                              onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                              placeholder="https://twitter.com/username"
                            />
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

                {/* Basic Stats */}
                <div className="flex flex-wrap justify-center md:justify-start gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profileData?.totalVouches || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Vouches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profileData?.totalWishlistItems || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Wishlist Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profileData?.createdAt ? new Date(profileData.createdAt).getFullYear() : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Member Since</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Content */}
        <div className="space-y-6">
          {/* Bio Section */}
          {profileData?.bio && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {profileData.bio}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData?.discord_username && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Discord</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{profileData.discord_username}</p>
                    </div>
                  </div>
                )}

                {profileData?.messenger_link && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Messenger</p>
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
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
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

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}