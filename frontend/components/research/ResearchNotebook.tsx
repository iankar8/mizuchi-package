
import { forwardRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotebookLogic from "./notebook/NotebookLogic";
import NotebookNotes from "./notebook/NotebookNotes";
import NotebookCategories from "./notebook/NotebookCategories";
import { ResearchNotebookHandle } from "./types/handles";

interface ResearchNotebookProps {
  shareDialogTrigger?: boolean;
  onShareDialogClose?: () => void;
}

const ResearchNotebook = forwardRef<ResearchNotebookHandle, ResearchNotebookProps>(
  ({ shareDialogTrigger, onShareDialogClose }, ref) => {
    return (
      <NotebookLogic
        ref={ref}
        shareDialogTrigger={shareDialogTrigger}
        onShareDialogClose={onShareDialogClose}
      >
        {({
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
        }) => {
          if (isLoading) {
            return (
              <div className="bg-white rounded-xl shadow-sm border border-border p-10 flex justify-center items-center">
                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            );
          }
          
          return (
            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <Tabs defaultValue="notes" className="w-full">
                <TabsList className="w-full border-b border-border rounded-none bg-card/50 p-0">
                  <TabsTrigger value="notes" className="flex-1 py-3 rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    All Notes
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex-1 py-3 rounded-none data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    Categories
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="notes" className="p-0 border-none">
                  <NotebookNotes
                    notes={notes}
                    selectedNote={selectedNote}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    setSelectedNote={setSelectedNote}
                    onDeleteNote={handleDeleteNote}
                    onCreateNote={handleCreateNote}
                    onUpdateNote={handleUpdateNote}
                    availableTags={availableTags}
                  />
                </TabsContent>
                
                <TabsContent value="categories" className="p-0 border-none">
                  <NotebookCategories
                    notes={notes}
                    availableTags={availableTags}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    setSelectedNote={setSelectedNote}
                    onCreateNote={handleCreateNote}
                  />
                </TabsContent>
              </Tabs>
            </div>
          );
        }}
      </NotebookLogic>
    );
  }
);

ResearchNotebook.displayName = "ResearchNotebook";

export default ResearchNotebook;
