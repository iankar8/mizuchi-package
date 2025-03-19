
import { useState, useRef, useEffect } from "react";
import TagsManager from "./editor/TagsManager";
import StocksManager from "./editor/StocksManager";
import { Button } from "@/components/ui/button";
import { formatMarkdown } from "../utils/markdownUtils";
import { 
  Bold, Italic, List, ListOrdered, Code, Link as LinkIcon, 
  Heading1, Heading2, Heading3, Undo, Redo, Eye, EyeOff
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NoteEditorProps {
  content: string;
  tags: string[];
  relatedStocks: string[];
  availableTags?: string[];
  onContentChange: (content: string) => void;
  onTagsChange: (tags: string[]) => void;
  onStocksChange: (stocks: string[]) => void;
}

type FormatOperation = 
  | 'bold' 
  | 'italic' 
  | 'unorderedList' 
  | 'orderedList' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'code' 
  | 'link';

const NoteEditor = ({
  content,
  tags,
  relatedStocks,
  availableTags,
  onContentChange,
  onTagsChange,
  onStocksChange
}: NoteEditorProps) => {
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Save content to history when user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only add to history if content has changed
      if (history[historyIndex] !== content) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(content);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [content]);
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onContentChange(history[newIndex]);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onContentChange(history[newIndex]);
    }
  };
  
  const insertTextAtCursor = (before: string, after: string = "") => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    
    const newContent = `${beforeText}${before}${selectedText}${after}${afterText}`;
    onContentChange(newContent);
    
    // Set cursor position after the operation
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
    }, 0);
  };
  
  const insertNewLine = (text: string, isBlock: boolean = false) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    
    // Get text before cursor to check if we need to insert a new line
    const textBeforeCursor = content.substring(0, start);
    const cursorIsAtStartOfLine = textBeforeCursor.endsWith("\n") || textBeforeCursor === "";
    
    // If block (like code block), insert with new lines before and after
    if (isBlock) {
      const beforeInsert = cursorIsAtStartOfLine ? "" : "\n";
      const newContent = `${textBeforeCursor}${beforeInsert}${text}\n${content.substring(start)}`;
      onContentChange(newContent);
      
      // Set cursor position inside the block
      const cursorPos = textBeforeCursor.length + beforeInsert.length + text.indexOf("()") + 1;
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = cursorPos;
        textarea.selectionEnd = cursorPos;
      }, 0);
      return;
    }
    
    // Add formatting at the beginning of the line
    const beforeNewLine = cursorIsAtStartOfLine ? "" : "\n";
    const newContent = `${textBeforeCursor}${beforeNewLine}${text} ${content.substring(start)}`;
    onContentChange(newContent);
    
    // Set cursor position after the inserted text
    const cursorPos = textBeforeCursor.length + beforeNewLine.length + text.length + 1;
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
    }, 0);
  };
  
  const applyFormat = (format: FormatOperation) => {
    switch (format) {
      case 'bold':
        insertTextAtCursor('**', '**');
        break;
      case 'italic':
        insertTextAtCursor('*', '*');
        break;
      case 'unorderedList':
        insertNewLine('-');
        break;
      case 'orderedList':
        insertNewLine('1.');
        break;
      case 'h1':
        insertNewLine('#');
        break;
      case 'h2':
        insertNewLine('##');
        break;
      case 'h3':
        insertNewLine('###');
        break;
      case 'code':
        if (textareaRef.current && 
            textareaRef.current.selectionStart === textareaRef.current.selectionEnd) {
          // If no text is selected, insert a code block
          insertNewLine('```\n()\n```', true);
        } else {
          // If text is selected, wrap it in inline code
          insertTextAtCursor('`', '`');
        }
        break;
      case 'link':
        insertTextAtCursor('[', '](url)');
        break;
    }
  };
  
  return (
    <div className="mb-6">
      <div className="mb-4 space-y-4">
        <TagsManager 
          tags={tags} 
          availableTags={availableTags} 
          onTagsChange={onTagsChange} 
        />
        
        <StocksManager 
          stocks={relatedStocks} 
          onStocksChange={onStocksChange} 
        />
      </div>
      
      <Tabs 
        value={editorTab} 
        onValueChange={(value) => setEditorTab(value as "write" | "preview")}
        className="border rounded-md"
      >
        <div className="flex items-center justify-between px-2 py-1 border-b">
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('h1')}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('h2')}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('h3')}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('unorderedList')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('code')}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => applyFormat('link')}
              title="Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
            
            <TabsList className="ml-2">
              <TabsTrigger value="write" className="flex items-center gap-1">
                <EyeOff className="h-3.5 w-3.5" />
                Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                Preview
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <TabsContent value="write" className="p-0 m-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full p-4 rounded-b-md h-[calc(100vh-480px)] font-mono text-sm outline-none resize-none focus:ring-0 border-0"
            placeholder="Start writing your research note here..."
          />
        </TabsContent>
        
        <TabsContent value="preview" className="p-0 m-0">
          <div 
            className="w-full p-4 rounded-b-md h-[calc(100vh-480px)] overflow-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NoteEditor;
