
import { FileText, PlusSquare, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import NoteCard from "./NoteCard";
import { ResearchNote } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface NoteSidebarProps {
  notes: ResearchNote[];
  selectedNote: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCreateNote: () => void;
}

const NoteSidebar = ({
  notes,
  selectedNote,
  searchTerm,
  onSearchChange,
  onSelectNote,
  onDeleteNote,
  onCreateNote
}: NoteSidebarProps) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // On mobile, when a note is selected, close the sidebar
  const handleNoteSelect = (id: string) => {
    onSelectNote(id);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };
  
  return (
    <div className={`md:col-span-1 border-r border-border ${isMobile ? 'absolute z-10 bg-white h-full w-full md:relative md:w-auto' : ''}`}>
      {isMobile && (
        <button 
          onClick={toggleSidebar}
          className="fixed bottom-5 right-5 bg-primary text-white p-3 rounded-full shadow-lg z-20"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}
      
      {(sidebarOpen || !isMobile) && (
        <>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full px-3 py-2 pl-9 border border-border rounded-lg text-sm"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">My Research Notes</span>
            </div>
            <button
              onClick={onCreateNote}
              className="p-1 hover:bg-secondary/50 rounded-md transition-colors"
            >
              <PlusSquare size={16} className="text-primary" />
            </button>
          </div>
          
          <div className={`overflow-y-auto ${isMobile ? 'h-[calc(100vh-180px)]' : 'h-[calc(100vh-320px)]'}`}>
            {notes.length > 0 ? (
              <div className="divide-y divide-border">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isSelected={selectedNote === note.id}
                    onSelect={() => handleNoteSelect(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground text-sm">No notes found</p>
                <button
                  onClick={onCreateNote}
                  className="mt-2 text-primary text-sm flex items-center gap-1 mx-auto"
                >
                  <PlusSquare size={14} />
                  <span>Create a note</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NoteSidebar;
