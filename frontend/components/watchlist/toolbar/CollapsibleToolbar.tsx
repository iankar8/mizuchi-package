
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CollapsibleToolbarProps {
  children: React.ReactNode;
}

const CollapsibleToolbar = ({ children }: CollapsibleToolbarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => setIsCollapsed(!isCollapsed)}>
      <div className="flex justify-end mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      <CollapsibleContent>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CollapsibleToolbar;
