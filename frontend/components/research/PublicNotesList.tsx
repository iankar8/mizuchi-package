import React, { useState, useEffect } from 'react';
import { ResearchNote } from './types';
import { getPublicNotes } from '@/services/research/socialSharingService';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, BarChart, Loader2 } from 'lucide-react';

interface PublicNotesListProps {
  limit?: number;
}

const PublicNotesList: React.FC<PublicNotesListProps> = ({ limit = 10 }) => {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  // Fetch public notes
  const fetchNotes = async (newOffset = 0) => {
    try {
      setLoading(true);
      const fetchedNotes = await getPublicNotes(limit, newOffset);
      
      if (newOffset === 0) {
        setNotes(fetchedNotes);
      } else {
        setNotes(prevNotes => [...prevNotes, ...fetchedNotes]);
      }
      
      // If we got fewer notes than the limit, there are no more to load
      setHasMore(fetchedNotes.length === limit);
    } catch (error) {
      console.error('Failed to fetch public notes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load more notes
  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchNotes(newOffset);
  };

  // Navigate to view a public note
  const handleViewNote = (noteId: string) => {
    router.push(`/research/shared/${noteId}`);
  };

  // Initial fetch
  useEffect(() => {
    fetchNotes();
  }, []);

  // Render content excerpt (first 150 chars)
  const renderContentExcerpt = (content: string) => {
    const maxLength = 150;
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  return (
    <div className="public-notes-list">
      <h2 className="text-xl font-semibold mb-4">Discover Research Notes</h2>
      
      {loading && notes.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <BarChart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No public notes available</h3>
          <p className="text-sm text-muted-foreground">Be the first to share your research!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <Card 
                key={note.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewNote(note.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={note.owner?.avatarUrl} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardDescription className="text-xs">
                    By {note.owner?.fullName || note.owner?.email || 'Anonymous'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="mb-3">
                    <p className="text-muted-foreground text-sm">
                      {renderContentExcerpt(note.content)}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {note.relatedStocks && note.relatedStocks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.relatedStocks.map(stock => (
                        <Badge key={stock} variant="outline" className="text-xs flex items-center gap-1">
                          <BarChart className="h-3 w-3" />
                          {stock}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-0">
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(note.date, { addSuffix: true })}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline"
                onClick={handleLoadMore} 
                disabled={loading || !hasMore}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublicNotesList;
