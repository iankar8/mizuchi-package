
import { useState } from "react";
import { Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";

interface TagsManagerProps {
  tags: string[];
  availableTags?: string[];
  onTagsChange: (tags: string[]) => void;
}

const TagsManager = ({ tags, availableTags = [], onTagsChange }: TagsManagerProps) => {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-1">Tags</h3>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-xs hover:text-destructive">
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Tag size={14} className="mr-2" /> Add Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <h4 className="font-medium text-sm mb-2">Add Tags</h4>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Enter new tag"
                  className="flex-1 p-2 text-sm border border-border rounded"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button size="sm" onClick={handleAddTag}>Add</Button>
              </div>
              
              {availableTags.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium mb-1">Existing Tags</h5>
                  <div className="flex flex-wrap gap-1">
                    {availableTags
                      .filter(tag => !tags.includes(tag))
                      .map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-secondary"
                          onClick={() => onTagsChange([...tags, tag])}
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TagsManager;
