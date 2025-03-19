
import { FileText, PlusSquare } from "lucide-react";

interface EmptyNoteContentProps {
  onCreateNote: () => void;
}

const EmptyNoteContent = ({ onCreateNote }: EmptyNoteContentProps) => {
  return (
    <div className="p-10 h-[calc(100vh-250px)] flex items-center justify-center">
      <div className="text-center">
        <FileText size={40} className="text-muted-foreground mx-auto mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-2">No Note Selected</h3>
        <p className="text-muted-foreground mb-4">
          Select a note from the sidebar or create a new one
        </p>
        <button
          onClick={onCreateNote}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
        >
          <PlusSquare size={16} />
          <span>Create New Note</span>
        </button>
      </div>
    </div>
  );
};

export default EmptyNoteContent;
