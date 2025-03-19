
import { useState, useEffect } from "react";
import { ResearchNote } from "./types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MotionContainer from "../ui/MotionContainer";
import ShareNoteDialog from "./ShareNoteDialog";
import { getNoteCollaborators } from "@/services/research";
import { toggleNotePublicStatus, shareToSocialPlatform } from "@/services/research/socialSharingService";

// Import sub-components with corrected paths
import NoteHeader from "./note/components/NoteHeader";
import NoteMetadata from "./note/components/NoteMetadata";
import NoteEditor from "./note/components/NoteEditor";
import NoteViewer from "./note/components/NoteViewer";

interface NoteContentProps {
  note: ResearchNote;
  availableTags?: string[];
  onEdit: (updatedNote: { title?: string; content?: string; tags?: string[]; relatedStocks?: string[] }) => Promise<ResearchNote>;
}

const NoteContent = ({ note, availableTags = [], onEdit }: NoteContentProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [editTags, setEditTags] = useState(note.tags);
  const [editRelatedStocks, setEditRelatedStocks] = useState(note.relatedStocks || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [noteWithCollaborators, setNoteWithCollaborators] = useState<ResearchNote>(note);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const loadCollaborators = async () => {
    try {
      const collaborators = await getNoteCollaborators(user, note.id);
      setNoteWithCollaborators({ ...note, collaborators });
    } catch (error) {
      console.error("Error loading collaborators:", error);
    }
  };
  
  // Handle toggling public/private status
  const handleTogglePublic = async (isPublic: boolean) => {
    try {
      setIsTogglingPublic(true);
      const result = await toggleNotePublicStatus(user, note.id, isPublic);
      
      if (result.success) {
        setNoteWithCollaborators(prev => ({ ...prev, isPublic }));
        toast({
          title: isPublic ? "Note is now public" : "Note is now private",
          description: isPublic ? "Anyone with the link can view this note" : "Only you and collaborators can view this note",
        });
      }
    } catch (error) {
      console.error("Error toggling note public status:", error);
      toast({
        title: "Failed to update note visibility",
        description: "Could not change the note's public status",
        variant: "destructive",
      });
    } finally {
      setIsTogglingPublic(false);
    }
  };
  
  // Handle sharing to social platforms
  const handleSocialShare = async (platform: 'twitter' | 'linkedin' | 'facebook') => {
    try {
      setIsSharing(true);
      const result = await shareToSocialPlatform(user, note.id, platform);
      
      if (result.success) {
        // Open the share URL in a new tab
        window.open(result.shareUrl, '_blank');
        
        toast({
          title: "Ready to share",
          description: `Sharing to ${platform} in a new tab`,
        });
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
      toast({
        title: "Failed to share",
        description: `Could not share to ${platform}`,
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };
  
  // Update local state when note prop changes
  useEffect(() => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags);
    setEditRelatedStocks(note.relatedStocks || []);
  }, [note]);
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const updatedNote = await onEdit({
        title: editTitle,
        content: editContent,
        tags: editTags,
        relatedStocks: editRelatedStocks,
      });
      
      setNoteWithCollaborators({ ...updatedNote, collaborators: noteWithCollaborators.collaborators });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags);
    setEditRelatedStocks(note.relatedStocks || []);
    setIsEditing(false);
  };
  
  return (
    <MotionContainer animation="fade-in" delay={100}>
      <div className="p-6">
        <NoteHeader
          title={editTitle}
          isEditing={isEditing}
          isSaving={isSaving}
          isPublic={noteWithCollaborators.isPublic}
          onEditChange={setIsEditing}
          onTitleChange={setEditTitle}
          onShareClick={() => setIsShareDialogOpen(true)}
          onTogglePublic={handleTogglePublic}
          onSocialShare={handleSocialShare}
          onSave={handleSave}
          onCancel={handleCancel}
        />
        
        <NoteMetadata date={note.date} />
        
        {isEditing ? (
          <NoteEditor
            content={editContent}
            tags={editTags}
            relatedStocks={editRelatedStocks}
            availableTags={availableTags}
            onContentChange={setEditContent}
            onTagsChange={setEditTags}
            onStocksChange={setEditRelatedStocks}
          />
        ) : (
          <NoteViewer 
            note={noteWithCollaborators}
            onCollaboratorsChanged={loadCollaborators}
          />
        )}
      </div>
      
      {/* Share dialog */}
      <ShareNoteDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        note={noteWithCollaborators}
        onShared={loadCollaborators}
      />
    </MotionContainer>
  );
};

export default NoteContent;
