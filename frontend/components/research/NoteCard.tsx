
import { Calendar, Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResearchNote } from "./types";

interface NoteCardProps {
  note: ResearchNote;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const NoteCard = ({ note, isSelected, onSelect, onDelete }: NoteCardProps) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "p-4 cursor-pointer transition-colors",
        isSelected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-secondary/30"
      )}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-sm mb-1 break-words pr-4">
          {note.title}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-muted-foreground hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="text-xs text-muted-foreground mb-2 flex items-center">
        <Calendar size={12} className="mr-1" />
        {note.date.toLocaleDateString()}
      </div>
      
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {note.tags.map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary/50 text-foreground">
              <Tag size={10} className="mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteCard;
