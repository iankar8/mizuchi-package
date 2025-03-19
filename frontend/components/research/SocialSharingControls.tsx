import React, { useState } from 'react';
import { ResearchNote } from './types';
import { toggleNotePublicStatus, generateShareableLink, shareToSocialPlatform } from '@/services/research/socialSharingService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Share, Twitter, Linkedin, Facebook, Copy, Lock, Unlock, Globe } from 'lucide-react';

interface SocialSharingControlsProps {
  note: ResearchNote;
  onNoteUpdated: (updatedNote: ResearchNote) => void;
}

const SocialSharingControls: React.FC<SocialSharingControlsProps> = ({ note, onNoteUpdated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Check if the current user is the owner of the note
  const isOwner = user && note.owner?.id === user.id;

  // Handle toggling public/private status
  const handleTogglePublic = async () => {
    if (!isOwner) return;
    
    try {
      setIsTogglingPublic(true);
      const newStatus = !note.isPublic;
      const result = await toggleNotePublicStatus(user, note.id, newStatus);
      
      if (result.success) {
        onNoteUpdated({ ...note, isPublic: newStatus });
        toast({
          title: `Note is now ${newStatus ? 'public' : 'private'}`,
          description: newStatus ? 'Anyone with the link can view this note' : 'Only you and collaborators can view this note',
        });
      }
    } catch (error) {
      console.error('Failed to toggle note status:', error);
      toast({
        title: 'Failed to update note visibility',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingPublic(false);
    }
  };

  // Generate a shareable link
  const handleGenerateLink = async () => {
    if (!isOwner) return;
    
    try {
      setIsGeneratingLink(true);
      const result = await generateShareableLink(user, note.id);
      
      if (result.success) {
        setShareableLink(result.shareUrl);
        // If generating a link made the note public, update the note state
        if (!note.isPublic) {
          onNoteUpdated({ ...note, isPublic: true });
        }
      }
    } catch (error) {
      console.error('Failed to generate shareable link:', error);
      toast({
        title: 'Failed to generate shareable link',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = () => {
    if (!shareableLink) return;
    
    navigator.clipboard.writeText(shareableLink)
      .then(() => {
        toast({
          title: 'Link copied to clipboard',
        });
      })
      .catch(() => {
        toast({
          title: 'Failed to copy link',
          variant: 'destructive',
        });
      });
  };

  // Share to a social platform
  const handleShareToSocial = async (platform: 'twitter' | 'linkedin' | 'facebook') => {
    if (!isOwner) return;
    
    try {
      setIsSharing(true);
      const result = await shareToSocialPlatform(user, note.id, platform);
      
      if (result.success) {
        // Open the share URL in a new tab
        window.open(result.shareUrl, '_blank');
      }
    } catch (error) {
      console.error(`Failed to share to ${platform}:`, error);
      toast({
        title: `Failed to share to ${platform}`,
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Render nothing if user is not the owner
  if (!isOwner) return null;

  const shareContent = (
    <div className="flex flex-col gap-3">
      <div className="mb-2">
        <p className="text-sm mb-2">Share this research note:</p>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="p-2"
            onClick={() => handleShareToSocial('twitter')}
            disabled={isSharing}
          >
            <Twitter size={16} />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="p-2"
            onClick={() => handleShareToSocial('linkedin')}
            disabled={isSharing}
          >
            <Linkedin size={16} />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="p-2"
            onClick={() => handleShareToSocial('facebook')}
            disabled={isSharing}
          >
            <Facebook size={16} />
          </Button>
        </div>
      </div>
      
      <div>
        <p className="text-sm mb-2">Or get a shareable link:</p>
        <div className="flex gap-2">
          {!shareableLink ? (
            <Button 
              variant="outline"
              size="sm"
              onClick={handleGenerateLink}
              disabled={isGeneratingLink}
            >
              {isGeneratingLink ? (
                <span className="flex items-center gap-1">
                  <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : 'Generate Link'}
            </Button>
          ) : (
            <>
              <input 
                type="text" 
                value={shareableLink} 
                readOnly 
                className="border rounded px-2 py-1 flex-1 text-sm" 
              />
              <Button 
                variant="outline"
                size="sm"
                className="p-2"
                onClick={handleCopyLink}
              >
                <Copy size={16} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Public</span>
              <Switch 
                checked={note.isPublic}
                onCheckedChange={handleTogglePublic}
                disabled={isTogglingPublic}
              />
              {note.isPublic ? 
                <Globe size={14} className="text-primary" /> : 
                <Lock size={14} className="text-muted-foreground" />}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {note.isPublic ? 'Make private' : 'Make public'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost"
            size="sm"
            className="gap-1"
            disabled={isTogglingPublic}
          >
            <Share size={16} />
            <span>Share</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Share Research Note</h3>
            {shareContent}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SocialSharingControls;
