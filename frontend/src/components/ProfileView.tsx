import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  MessageSquare,
  MessageCircle,
  Globe,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Award,
  Users
} from 'lucide-react';

interface ProfileData {
  user: {
    _id: string;
    username: string;
    roblox_username?: string;
    bio?: string;
    discord_username?: string;
    messenger_link?: string;
    website?: string;
    avatar_url?: string;
    role: string;
    credibility_score: number;
    vouch_count: number;
    is_verified?: boolean;
    is_middleman?: boolean;
    createdAt: string;
    last_active?: string;
    location?: string;
    timezone?: string;
  };
  stats: {
    totalTrades: number;
    completedTrades: number;
    totalVouches: number;
    successRate: number;
  };
}

export function ProfileView() {
  const { currentPage, setCurrentPage } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Extract user ID from currentPage (format: 'profile-{userId}')
  const userId = currentPage.startsWith('profile-') ? currentPage.replace('profile-', '') : null;

  useEffect(() => {
    if (!userId) {
      setError('Invalid profile URL');
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await apiService.getUserProfile(userId);
        setProfileData(data);
      } catch (err: unknown) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

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

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Admin', variant: 'destructive' as const, icon: Shield },
      moderator: { label: 'Moderator', variant: 'secondary' as const, icon: Shield },
      middleman: { label: 'Middleman', variant: 'default' as const, icon: Users },
      verified: { label: 'Verified', variant: 'default' as const, icon: CheckCircle },
      user: { label: 'Member', variant: 'outline' as const, icon: Users }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `Active ${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Active ${diffInDays}d ago`;
    if (diffInDays < 30) return `Active ${Math.floor(diffInDays / 7)}w ago`;

    return `Active ${Math.floor(diffInDays / 30)}mo ago`;
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

  if (error || !profileData) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error || 'Profile not found'}</p>
          <Button onClick={() => setCurrentPage('dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { user, stats } = profileData;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Profile Header - Hero Section */}
        <Card className="mb-8 overflow-hidden shadow-2xl border-0 bg-white dark:bg-gray-800">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700"></div>

            <CardContent className="relative p-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                {/* Avatar Section */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gray-300 dark:bg-gray-600 rounded-full blur opacity-25"></div>
                  <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white shadow-2xl">
                      <AvatarImage
                        src={getAvatarUrl(user.avatar_url)}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                        }}
                      />
                      <AvatarFallback className="text-3xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                    <div className="mb-4 lg:mb-0">
                      <div className="flex items-center gap-4 mb-3 justify-center lg:justify-start">
                        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
                          {user.username}
                        </h1>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                        @{user.roblox_username || 'Not set'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                        Member since {formatDate(user.createdAt)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {formatLastActive(user.last_active)}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {stats.totalTrades}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Trades</div>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {stats.successRate}%
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</div>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {user.vouch_count}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Vouches</div>
                    </div>
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-center mb-1">
                        <Award className="w-6 h-6 text-yellow-500 mr-1" />
                        <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {user.credibility_score}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Credibility</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio Section */}
            {user.bio && (
              <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                    {user.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-gray-900 dark:text-white">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.discord_username && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="p-3 bg-blue-500 rounded-full">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Discord</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.discord_username}</p>
                      </div>
                    </div>
                  )}

                  {user.messenger_link && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="p-3 bg-green-500 rounded-full">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Messenger</p>
                        <a
                          href={user.messenger_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {user.messenger_link}
                        </a>
                      </div>
                    </div>
                  )}

                  {user.website && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="p-3 bg-purple-500 rounded-full">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Website</p>
                        <a
                          href={user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {user.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {user.location && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="p-3 bg-red-500 rounded-full">
                        <Globe className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Location</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
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
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.username}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Roblox</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">@{user.roblox_username || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Role</span>
                  {getRoleBadge(user.role)}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Member Since</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Trading Stats */}
            <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-gray-900 dark:text-white">
                  Trading Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTrades}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Trades</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completedTrades}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalVouches}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Vouches Received</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}