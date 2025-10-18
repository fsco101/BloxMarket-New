import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { apiService } from '../../services/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserReport {
  id: number;
  userId: number;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export function UserReports() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedReports = await apiService.getUserReports();
      setReports(fetchedReports);
    } catch (err: unknown) {
      console.error('Error loading user reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user reports');
      toast.error('Failed to load user reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading user reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Alert className="text-red-500">{error}</Alert>
        <Button onClick={loadReports}>Try Again</Button>
      </div>
    );
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>User Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p>No reports available.</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="border-b py-2">
                <p>User ID: {report.userId}</p>
                <p>Reason: {report.reason}</p>
                <p>Status: {report.status}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}