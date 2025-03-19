
import { Pencil, MoreHorizontal, Save, X, Share2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ResearchNote } from "../../types";

interface NoteHeaderProps {
  title: string;
  isEditing: boolean;
  isSaving: boolean;
  isPublic?: boolean;
  onEditChange: (isEditing: boolean) => void;
  onTitleChange: (title: string) => void;
  onShareClick: () => void;
  onTogglePublic?: (isPublic: boolean) => void;
  onSocialShare?: (platform: 'twitter' | 'linkedin' | 'facebook') => void;
  onSave: () => void;
  onCancel: () => void;
}

const NoteHeader = ({
  title,
  isEditing,
  isSaving,
  isPublic = false,
  onEditChange,
  onTitleChange,
  onShareClick,
  onTogglePublic,
  onSocialShare,
  onSave,
  onCancel
}: NoteHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex justify-between items-start mb-4">
      {isEditing ? (
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-xl font-semibold w-full p-2 border border-border rounded"
        />
      ) : (
        <h2 className="text-xl font-semibold">{title}</h2>
      )}
      
      <div className="flex items-center">
        {isEditing ? (
          <>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-secondary/50 rounded-md transition-colors mr-2"
              disabled={isSaving}
            >
              <X size={16} className="text-muted-foreground" />
            </button>
            <button
              onClick={onSave}
              className="p-2 bg-primary/10 hover:bg-primary/20 rounded-md transition-colors text-primary flex items-center"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Save size={16} className="mr-1" />
              )}
              <span className="text-xs">Save</span>
            </button>
          </>
        ) : (
          <>
            {/* Public/Private Toggle */}
            {onTogglePublic && (
              <div className="flex items-center mr-2">
                <Switch
                  id="public-mode"
                  checked={isPublic}
                  onCheckedChange={onTogglePublic}
                />
                <Label htmlFor="public-mode" className="ml-2 text-xs">
                  {isPublic ? (
                    <span className="flex items-center"><Globe size={14} className="mr-1" /> Public</span>
                  ) : (
                    <span className="flex items-center"><Lock size={14} className="mr-1" /> Private</span>
                  )}
                </Label>
              </div>
            )}
            
            {/* Share Button with Popover */}
            {onSocialShare ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                  >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start" 
                      onClick={() => onSocialShare('twitter')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                      </svg>
                      Twitter
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start" 
                      onClick={() => onSocialShare('linkedin')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                        <rect x="2" y="9" width="4" height="12"></rect>
                        <circle cx="4" cy="4" r="2"></circle>
                      </svg>
                      LinkedIn
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start" 
                      onClick={() => onSocialShare('facebook')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                      Facebook
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start" 
                      onClick={onShareClick}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                        <polyline points="16 6 12 2 8 6"></polyline>
                        <line x1="12" y1="2" x2="12" y2="15"></line>
                      </svg>
                      Collaborate
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={onShareClick}
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
            <button
              onClick={() => onEditChange(true)}
              className="p-2 hover:bg-secondary/50 rounded-md transition-colors"
            >
              <Pencil size={16} className="text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-secondary/50 rounded-md transition-colors">
              <MoreHorizontal size={16} className="text-muted-foreground" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NoteHeader;
