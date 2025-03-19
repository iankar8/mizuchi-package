
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useToast } from "@/hooks/use-toast";
import { ResearchNote } from "../types";
import { useAuth } from "@/context/auth";
import { 
  fetchResearchNotes, 
  createResearchNote, 
  updateResearchNote, 
  deleteResearchNote 
} from "@/services/research";

export interface ResearchNotebookHandle {
  createNote: () => Promise<ResearchNote | void>;
}

export interface NotebookLogicProps {
  shareDialogTrigger?: boolean;
  onShareDialogClose?: () => void;
  children: (props: {
    notes: ResearchNote[];
    selectedNote: string | null;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    setSelectedNote: (id: string) => void;
    handleDeleteNote: (id: string) => Promise<void>;
    handleCreateNote: () => Promise<ResearchNote | void>;
    handleUpdateNote: (id: string, updates: { title?: string; content?: string; tags?: string[]; relatedStocks?: string[] }) => Promise<ResearchNote>;
    isLoading: boolean;
    availableTags: string[];
  }) => React.ReactNode;
}

const NotebookLogic = forwardRef<ResearchNotebookHandle, NotebookLogicProps>(
  ({ shareDialogTrigger, onShareDialogClose, children }, ref) => {
    const [notes, setNotes] = useState<ResearchNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const { toast } = useToast();
    const { user } = useAuth();
    
    useImperativeHandle(ref, () => ({
      createNote: async () => {
        try {
          const newNote = await handleCreateNote();
          return newNote;
        } catch (error) {
          console.error("Error creating note:", error);
        }
      }
    }));
    
    useEffect(() => {
      const loadNotes = async () => {
        try {
          setIsLoading(true);
          const fetchedNotes = await fetchResearchNotes(user);
          setNotes(fetchedNotes);
          
          if (fetchedNotes.length > 0 && !selectedNote) {
            setSelectedNote(fetchedNotes[0].id);
          }
          
          const allTags = fetchedNotes.flatMap(note => note.tags);
          setAvailableTags([...new Set(allTags)]);
        } catch (error) {
          console.error("Error loading notes:", error);
          toast({
            title: "Failed to load notes",
            description: "Could not retrieve your research notes",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadNotes();
    }, [user, toast, selectedNote]);
    
    useEffect(() => {
      if (shareDialogTrigger && selectedNote) {
        // Handle share dialog in the parent component
        onShareDialogClose?.();
      }
    }, [shareDialogTrigger, selectedNote, onShareDialogClose]);
    
    const handleCreateNote = async () => {
      try {
        const newNote = await createResearchNote(user, {
          title: "New Research Note",
          content: "## Start your research note here\n\nUse markdown to format your notes.\n\n### Key Insights:\n\n- Point 1\n- Point 2\n- Point 3\n\n### Follow-up Research:\n- Research item 1\n- Research item 2",
          tags: ["New"],
        });
        
        setNotes([newNote, ...notes]);
        setSelectedNote(newNote.id);
        
        setAvailableTags([...new Set([...availableTags, ...newNote.tags])]);
        
        toast({
          title: "New Note Created",
          description: "Your new research note is ready to edit.",
        });
        
        return newNote;
      } catch (error) {
        console.error("Error creating note:", error);
        toast({
          title: "Creation Failed",
          description: "Could not create a new note",
          variant: "destructive",
        });
        throw error;
      }
    };
    
    const handleDeleteNote = async (id: string) => {
      try {
        await deleteResearchNote(user, id);
        
        setNotes(notes.filter(note => note.id !== id));
        
        if (selectedNote === id) {
          setSelectedNote(notes.length > 1 ? notes.find(note => note.id !== id)?.id || null : null);
        }
        
        toast({
          title: "Note Deleted",
          description: "Your research note has been deleted.",
        });
      } catch (error) {
        console.error("Error deleting note:", error);
        toast({
          title: "Deletion Failed",
          description: "Could not delete the note",
          variant: "destructive",
        });
      }
    };
    
    const handleUpdateNote = async (id: string, updates: { title?: string; content?: string; tags?: string[]; relatedStocks?: string[] }) => {
      try {
        const updatedNote = await updateResearchNote(user, id, updates);
        
        setNotes(notes.map(note => note.id === id ? updatedNote : note));
        
        if (updates.tags) {
          const allTags = [...notes.map(note => note.id !== id ? note.tags : updates.tags || [])].flat();
          setAvailableTags([...new Set(allTags)]);
        }
        
        toast({
          title: "Note Updated",
          description: "Your changes have been saved.",
        });
        
        return updatedNote;
      } catch (error) {
        console.error("Error updating note:", error);
        toast({
          title: "Update Failed",
          description: "Could not update the note",
          variant: "destructive",
        });
        throw error;
      }
    };
    
    return children({
      notes,
      selectedNote,
      searchTerm,
      setSearchTerm,
      activeCategory,
      setActiveCategory,
      setSelectedNote,
      handleDeleteNote,
      handleCreateNote,
      handleUpdateNote,
      isLoading,
      availableTags
    });
  }
);

NotebookLogic.displayName = "NotebookLogic";

export default NotebookLogic;
