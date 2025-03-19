import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import { getPublicNote } from '@/services/research/socialSharingService';
import { ResearchNote } from '@/components/research/types';
import MainLayout from '@/components/layouts/MainLayout';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { User, Calendar, BarChart, ArrowLeft } from 'lucide-react';

const SharedNotePage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [note, setNote] = useState<ResearchNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the public note
  useEffect(() => {
    const fetchNote = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const fetchedNote = await getPublicNote(id as string);
        
        if (!fetchedNote) {
          setError('Note not found or not publicly available');
        } else {
          setNote(fetchedNote);
        }
      } catch (err) {
        console.error('Error fetching shared note:', err);
        setError('Failed to load the shared note');
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  // Handle navigation back to discover page
  const handleBackToDiscover = () => {
    router.push('/research/discover');
  };

  return (
    <MainLayout title={note?.title || 'Shared Research Note'}>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost"
          size="sm"
          className="mb-4 gap-1"
          onClick={handleBackToDiscover}
        >
          <ArrowLeft size={16} />
          Back to Discover
        </Button>
        
        {loading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent>
              <div className="text-center py-8 space-y-4">
                <div className="text-destructive font-medium text-lg">{error}</div>
                <Button 
                  onClick={handleBackToDiscover} 
                  variant="default"
                >
                  Browse Other Research Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : note && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-2xl">{note.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Calendar size={14} />
                    <span>
                      {formatDistanceToNow(note.date, { addSuffix: true })}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={note.owner?.avatarUrl} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {note.owner?.fullName || note.owner?.email || 'Anonymous'}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {note.tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
                
                {note.relatedStocks && note.relatedStocks.length > 0 && (
                  <>
                    {note.relatedStocks.map(stock => (
                      <Badge key={stock} variant="outline" className="flex items-center gap-1">
                        <BarChart className="h-3 w-3" />
                        {stock}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="border-t pt-4">
                <MarkdownRenderer content={note.content} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default SharedNotePage;
