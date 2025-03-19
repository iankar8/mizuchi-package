
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMarkdown } from "../utils/markdownUtils";
import CollaboratorsList from "./viewers/CollaboratorsList";
import { ResearchNote } from "../../types";

interface NoteViewerProps {
  note: ResearchNote;
  onCollaboratorsChanged: () => void;
}

const NoteViewer = ({ note, onCollaboratorsChanged }: NoteViewerProps) => {
  return (
    <>
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {note.tags.map((tag, index) => (
            <Badge key={index} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}
      
      {note.relatedStocks && note.relatedStocks.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1">
          <span className="text-sm font-medium">Related Stocks:</span>
          {note.relatedStocks.map((stock, index) => (
            <Link
              key={index}
              to={`/watchlist`}
              className="inline-flex items-center px-2 py-0.5 ml-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {stock}
              <ArrowUpRight size={10} className="ml-1" />
            </Link>
          ))}
        </div>
      )}
      
      {/* Render collaborators list */}
      {note.collaborators && note.collaborators.length > 0 && (
        <div className="mb-6">
          <CollaboratorsList 
            note={note}
            onCollaboratorsChanged={onCollaboratorsChanged}
          />
        </div>
      )}
      
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: formatMarkdown(note.content) }}
      />
    </>
  );
};

export default NoteViewer;
