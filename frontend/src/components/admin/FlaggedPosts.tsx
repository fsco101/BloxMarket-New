import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export function FlaggedPosts() {
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFlaggedPosts = async () => {
    try {
      setLoading(true);
      const posts = await apiService.getFlaggedPosts();
      setFlaggedPosts(posts);
    } catch (err) {
      console.error('Error loading flagged posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flagged posts');
      toast.error('Failed to load flagged posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlaggedPosts();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadFlaggedPosts}>Try Again</Button>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Flagged Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {flaggedPosts.length === 0 ? (
            <p>No flagged posts available.</p>
          ) : (
            flaggedPosts.map((post) => (
              <div key={post.id} className="border-b py-2">
                <h3 className="font-bold">{post.title}</h3>
                <p>{post.content}</p>
                <Button onClick={() => handleResolve(post.id)}>Resolve</Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );

  function handleResolve(postId) {
    // Logic to resolve the flagged post
  }
}