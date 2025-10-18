import React, { useState, useEffect } from 'react';
import { useApp, useAuth, useTheme } from '../App';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  Home, 
  ArrowLeftRight, 
  Heart, 
  Shield, 
  MessageSquare, 
  Calendar, 
  User, 
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Users,
  Flag,
  AlertTriangle,
  UserCheck,
  ShoppingCart,
  BarChart3,
  FileText,
  Package
} from 'lucide-react';

export function Sidebar() {
  const { currentPage, setCurrentPage } = useApp();
  const { user, logout, isLoading } = useAuth(); // was `loading`
  const { isDark, toggleTheme } = useTheme();
  
  // Simplified admin status check - directly from user object
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator';

  const adminMenuItems = [
    { id: 'admin', label: 'Dashboard', icon: BarChart3 },
    { id: 'admin-users', label: 'User Management', icon: Users },
    { id: 'admin-middleman', label: 'Middleman Verification', icon: UserCheck },
    { id: 'admin-forum', label: 'Forum Management', icon: MessageSquare },
    { id: 'admin-trades', label: 'Trading Posts', icon: ShoppingCart },
    { id: 'admin-wishlists', label: 'Wishlists', icon: Heart },
    { id: 'admin-events', label: 'Events', icon: Calendar },
    { id: 'admin-reports', label: 'User Reports', icon: Flag },
    { id: 'admin-flagged', label: 'Flagged Content', icon: AlertTriangle }
  ];

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'trading-hub', label: 'Trading Hub', icon: ArrowLeftRight },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'middleman', label: 'Middleman Directory', icon: Shield },
    { id: 'forums', label: 'Forums', icon: MessageSquare },
    { id: 'events', label: 'Events & Giveaways', icon: Calendar }
  ];

  const profileMenuItems = [
    { id: 'profile', label: 'Profile Overview', icon: User },
    { id: 'my-forum-posts', label: 'My Forum Posts', icon: FileText },
    { id: 'my-trade-posts', label: 'My Trade Posts', icon: Package },
    { id: 'my-wishlist', label: 'My Wishlist', icon: Heart }
  ];

  const handleAdminMenuClick = (itemId: string) => {
    // Set current page to admin for all admin-related pages
    setCurrentPage('admin');
    
    // Communicate with AdminPanel about which section should be active
    if (itemId !== 'admin') {
      // Extract the section name (remove 'admin-' prefix)
      const section = itemId.replace('admin-', '');
      // Dispatch custom event for AdminPanel to listen to
      window.dispatchEvent(new CustomEvent('admin-section-change', { detail: section }));
    } else {
      // Reset to dashboard when clicking main admin item
      window.dispatchEvent(new CustomEvent('admin-section-change', { detail: 'dashboard' }));
    }
  };

  const handleProfileMenuClick = (itemId: string) => {
    setCurrentPage(itemId);
  };

  // Check if current page is a profile-related page
  const isProfilePage = profileMenuItems.some(item => item.id === currentPage);

  // Debug logging to help identify issues
  useEffect(() => {
    console.log('Sidebar Debug:', {
      user: user,
      userRole: user?.role,
      userObject: JSON.stringify(user, null, 2),
      isAdminOrModerator: isAdminOrModerator,
      loading: isLoading,
      localStorage: {
        token: !!localStorage.getItem('bloxmarket-token'),
        storedUser: !!localStorage.getItem('bloxmarket-user')
      }
    });
  }, [user, isAdminOrModerator, isLoading]);

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BM</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">BloxMarket</h1>
            <p className="text-xs text-sidebar-foreground/60">Trading Community</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={(user as any)?.avatar || "https://images.unsplash.com/photo-1740252117027-4275d3f84385?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyb2Jsb3glMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MXx8fHwxNzU4NTYwNDQ4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"} />
            <AvatarFallback>{user?.username?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-sidebar-foreground truncate">
              {user?.username || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {(user as any)?.robloxUsername || 'No Roblox linked'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-2 h-2 ${i < ((user as any)?.rating || 0) ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                ))}
              </div>
              <span className="text-xs text-sidebar-foreground/60 ml-1">
                ({(user as any)?.vouchCount || 0} vouches)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={currentPage === id ? "secondary" : "ghost"}
              className={`w-full justify-start h-10 ${
                currentPage === id 
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              onClick={() => setCurrentPage(id)}
            >
              <Icon className="w-4 h-4 mr-3" />
              {label}
            </Button>
          ))}

          {/* Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isProfilePage ? "secondary" : "ghost"}
                className={`w-full justify-start h-10 ${
                  isProfilePage
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <User className="w-4 h-4 mr-3" />
                Profile
                <ChevronDown className="w-4 h-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {profileMenuItems.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => handleProfileMenuClick(id)}
                  className={`flex items-center gap-2 cursor-pointer ${
                    currentPage === id ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Admin Dropdown Menu - Simplified condition */}
          {isAdminOrModerator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentPage === 'admin' ? "secondary" : "ghost"}
                  className={`w-full justify-start h-10 ${
                    currentPage === 'admin'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Admin Panel
                  <ChevronDown className="w-4 h-4 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {adminMenuItems.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => handleAdminMenuClick(id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Debug Info - Remove this after fixing */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-2 text-xs text-muted-foreground border rounded">
              Role: {user?.role || 'none'}<br/>
              Admin: {isAdminOrModerator ? 'yes' : 'no'}<br/>
              Loading: {isLoading ? 'yes' : 'no'}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-3 flex-shrink-0">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="text-sm text-sidebar-foreground">Dark Mode</span>
          </div>
          <Switch checked={isDark} onCheckedChange={toggleTheme} />
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}