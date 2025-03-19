
import { ResearchNote } from "../types";
import NoteSidebar from "../NoteSidebar";
import NoteContent from "../NoteContent";
import EmptyNoteContent from "../EmptyNoteContent";
import ShareNoteDialog from "../ShareNoteDialog";
import { useState } from "react";

interface NotebookNotesProps {
  notes: ResearchNote[];
  selectedNote: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setSelectedNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCreateNote: () => Promise<ResearchNote | void>;
  onUpdateNote: (id: string, updates: { title?: string; content?: string; tags?: string[]; relatedStocks?: string[] }) => Promise<ResearchNote>;
  availableTags: string[];
}

const NotebookNotes = ({
  notes,
  selectedNote,
  searchTerm,
  setSearchTerm,
  setSelectedNote,
  onDeleteNote,
  onCreateNote,
  onUpdateNote,
  availableTags
}: NotebookNotesProps) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState<boolean>(false);
  
  const filteredNotes = searchTerm 
    ? notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    : notes;
  
  const currentNote = notes.find(note => note.id === selectedNote);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 relative">
      <NoteSidebar 
        notes={filteredNotes}
        selectedNote={selectedNote}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelectNote={setSelectedNote}
        onDeleteNote={onDeleteNote}
        onCreateNote={onCreateNote}
      />
      
      <div className="md:col-span-2 lg:col-span-3">
        {currentNote ? (
          <>
            <NoteContent 
              note={currentNote} 
              onEdit={(updatedNote) => onUpdateNote(currentNote.id, updatedNote)}
              availableTags={availableTags}
            />
            
            <ShareNoteDialog
              open={isShareDialogOpen}
              onOpenChange={(open) => setIsShareDialogOpen(open)}
              note={currentNote}
              onShared={() => {
                // This will be handled in the parent component
              }}
            />
          </>
        ) : (
          <EmptyNoteContent onCreateNote={onCreateNote} />
        )}
      </div>
    </div>
  );
};

export default NotebookNotes;
