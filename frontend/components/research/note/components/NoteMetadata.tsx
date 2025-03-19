
import { Calendar } from "lucide-react";

interface NoteMetadataProps {
  date: Date | string;
}

const NoteMetadata = ({ date }: NoteMetadataProps) => {
  // Handle date as string or Date object
  const formattedDate = date instanceof Date 
    ? date.toLocaleDateString() 
    : new Date(date).toLocaleDateString();
    
  return (
    <div className="flex items-center text-sm text-muted-foreground mb-4">
      <Calendar size={14} className="mr-1" />
      <span>{formattedDate}</span>
    </div>
  );
};

export default NoteMetadata;
