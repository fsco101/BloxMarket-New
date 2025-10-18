import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Shield, 
  Search, 
  Star, 
  MessageSquare, 
  CheckCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import { MiddlemanApplicationForm } from './user/MiddlemanApplicationForm';

// Define the Middleman interface
interface Middleman {
  id: string | number;
  username: string;
  robloxUsername: string;
  avatar?: string;
  rating: number;
  vouchCount: number;
  completedTrades: number;
  joinDate: string;
  verified: boolean;
  tier: string;
  status: string;
  fees: string;
  specialties: string[];
  responseTime: string;
  lastActive: string;
  description: string;
  successRate: number;
}

export function MiddlemanDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');

  const [middlemen, setMiddlemen] = useState<Middleman[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
  
  // Fetch actual middlemen data from the backend
  useEffect(() => {
    const fetchMiddlemen = async () => {
      try {
        setLoading(true);
        const response = await apiService.getMiddlemen();
        
        // Transform the data to match our component's expected format
        const formattedMiddlemen = response.middlemen.map((mm: any) => ({
          id: mm._id,
          username: mm.username,
          robloxUsername: mm.roblox_username,
          avatar: mm.avatar_url,
          rating: mm.rating || 5,
          vouchCount: mm.vouches || 0,
          completedTrades: mm.trades || 0,
          joinDate: mm.verificationDate || mm.createdAt,
          verified: true,
          tier: determineTier(mm.rating || 0, mm.vouches || 0),
          status: mm.is_active ? 'online' : 'offline',
          fees: mm.fees || '3-5%',
          specialties: mm.preferred_trade_types || ['General Trading'],
          responseTime: mm.average_response_time || '< 1 hour',
          lastActive: getLastActiveText(mm.last_active),
          description: mm.bio || 'Verified middleman on BloxMarket platform.',
          successRate: mm.success_rate || 100
        }));
        
        setMiddlemen(formattedMiddlemen);
      } catch (error) {
        console.error('Error fetching middlemen:', error);
        toast.error('Failed to load middlemen directory');
        
        // Fallback to mock data if API fails
        setMiddlemen([
          {
            id: 1,
            username: 'TrustedMM_Pro',
            robloxUsername: 'TrustedMM_Pro',
            avatar: 'https://images.unsplash.com/photo-1740252117027-4275d3f84385?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyb2Jsb3glMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MXx8fHwxNzU4NTYwNDQ4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
            rating: 5,
            vouchCount: 347,
            completedTrades: 1205,
            joinDate: '2022-01-15',
            verified: true,
            tier: 'diamond',
            status: 'online',
            fees: '2-5%',
            specialties: ['High Value Items', 'Robux Trading', 'Limited Items'],
            responseTime: '< 5 min',
            lastActive: 'Online now',
            description: 'Professional middleman with 3+ years experience. Specializing in high-value trades and Robux transactions. Fast response time and 100% success rate.',
            successRate: 100
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMiddlemen();
  }, []);
  
  // Helper functions for formatting data
  const determineTier = (rating: number, vouches: number): string => {
    if (vouches >= 300 && rating >= 4.8) return 'diamond';
    if (vouches >= 200 && rating >= 4.5) return 'platinum';
    if (vouches >= 100 && rating >= 4.0) return 'gold';
    if (vouches >= 50) return 'silver';
    return 'bronze';
  };
  
  const getLastActiveText = (lastActive: string | undefined): string => {
    if (!lastActive) return 'Unknown';
    
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffMinutes = Math.round((now.getTime() - lastActiveDate.getTime()) / 60000);
    
    if (diffMinutes < 5) return 'Online now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hours ago`;
    return lastActiveDate.toLocaleDateString();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'diamond': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300';
      case 'platinum': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'gold': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'silver': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      default: return 'bg-bronze-100 text-bronze-700 dark:bg-bronze-900 dark:text-bronze-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredMiddlemen = middlemen.filter(mm => 
    mm.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mm.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedMiddlemen = filteredMiddlemen.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating || b.vouchCount - a.vouchCount;
      case 'vouches':
        return b.vouchCount - a.vouchCount;
      case 'trades':
        return b.completedTrades - a.completedTrades;
      case 'newest':
        return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-blue-500" />
              Middleman Directory
            </h1>
            <p className="text-muted-foreground">Verified middlemen to help secure your trades</p>
          </div>
          
          <Button 
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            onClick={() => setIsApplicationFormOpen(true)}
          >
            Apply to be a Middleman
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search middlemen by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="vouches">Most Vouches</SelectItem>
              <SelectItem value="trades">Most Trades</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-background p-4 border-b border-border">
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span>{sortedMiddlemen.length} Verified Middlemen</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>99.2% Success Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-500" />
            <span>45,678 Completed Trades</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedMiddlemen.map((mm) => (
              <Card key={mm.id} className="hover:shadow-lg transition-all duration-200 relative">
                {/* Status Indicator */}
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${getStatusColor(mm.status)}`} />
                
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={mm.avatar} />
                      <AvatarFallback>{mm.username[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{mm.username}</h3>
                        {mm.verified && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">@{mm.robloxUsername}</p>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getTierColor(mm.tier)}>
                          <Award className="w-3 h-3 mr-1" />
                          {mm.tier} tier
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {mm.fees} fees
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < mm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <span className="text-sm font-medium ml-1">{mm.rating}.0</span>
                        <span className="text-sm text-muted-foreground">({mm.vouchCount} vouches)</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{mm.description}</p>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                    <div>
                      <span className="text-xs text-muted-foreground">Completed Trades</span>
                      <p className="font-semibold text-green-600 dark:text-green-400">{mm.completedTrades.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Success Rate</span>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">{mm.successRate}%</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Response Time</span>
                      <p className="font-semibold">{mm.responseTime}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Last Active</span>
                      <p className="font-semibold">{mm.lastActive}</p>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div>
                    <span className="text-sm text-muted-foreground mb-2 block">Specialties:</span>
                    <div className="flex flex-wrap gap-1">
                      {mm.specialties.map((specialty, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Request Service
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sortedMiddlemen.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No middlemen found</h3>
                  <p>Try adjusting your search criteria.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="border-t border-border p-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <Shield className="w-4 h-4 inline mr-1" />
              All middlemen are verified by our team and have completed identity verification
            </p>
            <p>Always verify the middleman's identity before proceeding with trades. Report any suspicious activity immediately.</p>
          </div>
        </div>
      </div>
      
      {/* Application Form Dialog */}
      <MiddlemanApplicationForm 
        isOpen={isApplicationFormOpen} 
        onClose={() => setIsApplicationFormOpen(false)} 
      />
    </div>
  );
}