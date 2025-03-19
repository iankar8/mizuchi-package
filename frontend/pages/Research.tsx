import React, { useState, useEffect, useRef } from "react";
import { Search, BookOpen, Plus, Sparkles, Share2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MotionContainer from "@/components/ui/MotionContainer";
import ResearchAssistant from "@/components/research/ResearchAssistant";
import ResearchNotebook from "@/components/research/ResearchNotebook";
import { ResearchNotebookHandle } from "@/components/research/types/handles";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import WatchlistHeader from "@/components/watchlist/WatchlistHeader";
import { supabase } from "@/utils/supabase/client";

const Research = () => {
  const [activeTab, setActiveTab] = useState<"assistant" | "notebook">("assistant");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const notebookRef = useRef<ResearchNotebookHandle>(null);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const handleShareResearch = () => {
    if (activeTab === "notebook") {
      setShowShareDialog(true);
    } else {
      toast({
        title: "Select a note first",
        description: "Please select a note from your notebook first to share it.",
      });
    }
  };

  const handleCreateNew = () => {
    setActiveTab("notebook");
    toast({
      title: "Creating New Research Note",
      description: "Your new research note is being created.",
    });
    setTimeout(() => {
      if (notebookRef.current) {
        notebookRef.current.createNote().catch(error => {
          console.error("Error creating note:", error);
          toast({
            title: "Creation Failed",
            description: "Could not create a new note",
            variant: "destructive",
          });
        });
      }
    }, 100);
  };
  
  useEffect(() => {
    const checkApiConfig = async () => {
      try {
        console.log("Checking Perplexity API configuration...");
        // Use Supabase Edge Function directly instead of relative URL
        const response = await supabase.functions.invoke("check-perplexity-key");
        console.log("API check response:", response);
        
        if (response.error || !response.data?.configured) {
          console.log("API key not configured:", response.data);
          toast({
            title: "API Configuration Required",
            description: "Please ask your administrator to configure the Perplexity API key.",
            variant: "destructive",
          });
        } else {
          console.log("API key successfully configured!");
        }
      } catch (error) {
        console.error("Error checking API configuration:", error);
      }
    };
    
    if (user) {
      checkApiConfig();
    }
  }, [user, toast]);
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <WatchlistHeader 
          setIsDialogOpen={setIsDialogOpen} 
          isDialogOpen={isDialogOpen}
          onShowShareOptions={handleShareResearch}
          title="Research"
          description="AI-powered investment research and analysis"
          actionButtonText="New Note"
          onActionButtonClick={handleCreateNew}
        />
        
        <div className="mb-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("assistant")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "assistant"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <Sparkles size={16} />
                <span className={isMobile ? "sr-only" : ""}>Research Assistant</span>
              </button>
              
              <button
                onClick={() => setActiveTab("notebook")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === "notebook"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <BookOpen size={16} />
                <span className={isMobile ? "sr-only" : ""}>Research Notebook</span>
              </button>
            </div>
          </div>
        </div>
        
        <MotionContainer animation="slide-in-up" delay={100}>
          {activeTab === "assistant" ? (
            <ResearchAssistant />
          ) : (
            <ResearchNotebook 
              ref={notebookRef}
              shareDialogTrigger={showShareDialog} 
              onShareDialogClose={() => setShowShareDialog(false)} 
            />
          )}
        </MotionContainer>
      </main>
    </div>
  );
};

export default Research;
