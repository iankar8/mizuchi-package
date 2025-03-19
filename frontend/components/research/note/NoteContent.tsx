
import { useState, useEffect } from "react";
import { ResearchNote } from "../types";
import { useAuth } from "@/context/AuthContext";
import MotionContainer from "../../ui/MotionContainer";
import ShareNoteDialog from "../ShareNoteDialog";
import { getNoteCollaborators } from "@/services/research";

// Import sub-components
import NoteHeader from "./components/NoteHeader";
import NoteMetadata from "./components/NoteMetadata";
import NoteEditor from "./components/NoteEditor";
import NoteViewer from "./components/NoteViewer";

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
  const [noteWithCollaborators, setNoteWithCollaborators] = useState<ResearchNote>(note);
  const { user } = useAuth();
  
  const loadCollaborators = async () => {
    try {
      const collaborators = await getNoteCollaborators(user, note.id);
      setNoteWithCollaborators({ ...note, collaborators });
    } catch (error) {
      console.error("Error loading collaborators:", error);
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
          onEditChange={setIsEditing}
          onTitleChange={setEditTitle}
          onShareClick={() => setIsShareDialogOpen(true)}
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
