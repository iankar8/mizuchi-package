
import { useState } from "react";
import { ResearchNote } from "../types";

interface NotebookCategoriesProps {
  notes: ResearchNote[];
  availableTags: string[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  setSelectedNote: (id: string) => void;
  onCreateNote: () => Promise<ResearchNote | void>;
}

const NotebookCategories = ({
  notes,
  availableTags,
  activeCategory,
  setActiveCategory,
  setSelectedNote,
  onCreateNote,
}: NotebookCategoriesProps) => {
  const filterNotesByCategory = (notes: ResearchNote[]) => {
    if (activeCategory === "all") {
      return notes;
    } else if (activeCategory === "recent") {
      return [...notes].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
    } else if (activeCategory === "stocks") {
      return notes.filter(note => note.relatedStocks && note.relatedStocks.length > 0);
    } else {
      return notes.filter(note => note.tags.includes(activeCategory));
    }
  };

  const categorizedNotes = filterNotesByCategory(notes);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 relative">
      <div className="border-r border-border p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Filter By</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveCategory("all")} 
              className={`w-full text-left px-3 py-2 text-sm rounded-md ${activeCategory === "all" ? "bg-primary/10 text-primary" : "hover:bg-secondary/80"}`}
            >
              All Notes
            </button>
            <button 
              onClick={() => setActiveCategory("recent")} 
              className={`w-full text-left px-3 py-2 text-sm rounded-md ${activeCategory === "recent" ? "bg-primary/10 text-primary" : "hover:bg-secondary/80"}`}
            >
              Recent Notes
            </button>
            <button 
              onClick={() => setActiveCategory("stocks")} 
              className={`w-full text-left px-3 py-2 text-sm rounded-md ${activeCategory === "stocks" ? "bg-primary/10 text-primary" : "hover:bg-secondary/80"}`}
            >
              Notes with Stocks
            </button>
          </div>
        </div>
        
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Tags</h3>
            <div className="space-y-1">
              {availableTags.map((tag, index) => (
                <button 
                  key={index}
                  onClick={() => setActiveCategory(tag)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md ${activeCategory === tag ? "bg-primary/10 text-primary" : "hover:bg-secondary/80"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="pt-4">
          <button
            onClick={onCreateNote}
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Create New Note
          </button>
        </div>
      </div>
      
      <div className="md:col-span-2 lg:col-span-3 p-6">
        <h2 className="text-xl font-semibold mb-4">
          {activeCategory === "all" ? "All Notes" : 
           activeCategory === "recent" ? "Recent Notes" : 
           activeCategory === "stocks" ? "Notes with Stocks" : 
           `Notes tagged with "${activeCategory}"`}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorizedNotes.map(note => (
            <div 
              key={note.id} 
              className="border border-border rounded-lg p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => {
                setSelectedNote(note.id);
                setActiveCategory("all");
              }}
            >
              <h3 className="font-medium text-base mb-1 truncate">{note.title}</h3>
              <p className="text-muted-foreground text-sm mb-2">{new Date(note.date).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {note.tags.map((tag, index) => (
                  <span key={index} className="text-xs px-2 py-1 bg-secondary rounded-full">{tag}</span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {note.content.replace(/#{1,6} |(#{1,6}\n)|(\n#{1,6})/g, "").substring(0, 100)}...
              </p>
            </div>
          ))}
          
          {categorizedNotes.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              <p>No notes found in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookCategories;
