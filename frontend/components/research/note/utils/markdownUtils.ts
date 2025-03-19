
/**
 * Format markdown text to HTML with enhanced styling
 */
export const formatMarkdown = (text: string) => {
  if (!text) return '';
  
  // Headers
  let formattedText = text.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-5 mb-3 text-left">$1</h1>');
  formattedText = formattedText.replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2 text-left">$1</h2>');
  formattedText = formattedText.replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mt-3 mb-1 text-left">$1</h3>');
  formattedText = formattedText.replace(/^#### (.*$)/gm, '<h4 class="text-base font-medium mt-3 mb-1 text-left">$1</h4>');
  
  // Bold and italic
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Lists - unordered
  // Replace bullet points, but wrap them in <ul> tags
  const ulLists: string[] = [];
  formattedText = formattedText.replace(/^- (.*$)(\n^- .*$)*/gm, (match) => {
    const id = `list-${ulLists.length}`;
    const listItems = match.split('\n').map(line => {
      const content = line.substring(2); // Remove "- " prefix
      return `<li class="ml-5 text-left">${content}</li>`;
    }).join('');
    
    const listHtml = `<ul class="list-disc my-2 pl-2">${listItems}</ul>`;
    ulLists.push(listHtml);
    return `<ul-placeholder id="${id}">`;
  });
  
  // Lists - ordered
  const olLists: string[] = [];
  formattedText = formattedText.replace(/^(\d+)\. (.*$)(\n^\d+\. .*$)*/gm, (match) => {
    const id = `list-${olLists.length}`;
    const listItems = match.split('\n').map(line => {
      const content = line.replace(/^\d+\.\s+/, ''); // Remove "1. " prefix
      return `<li class="ml-5 text-left">${content}</li>`;
    }).join('');
    
    const listHtml = `<ol class="list-decimal my-2 pl-2">${listItems}</ol>`;
    olLists.push(listHtml);
    return `<ol-placeholder id="${id}">`;
  });
  
  // Code blocks
  formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 my-3 rounded overflow-x-auto text-sm font-mono">$1</pre>');
  
  // Inline code
  formattedText = formattedText.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm font-mono">$1</code>');
  
  // Links
  formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Add paragraphs (to text not already in an HTML tag)
  formattedText = formattedText.replace(/^(?!<[a-z]|<ul-placeholder|<ol-placeholder)(.*$)/gm, function(match) {
    return match.trim() ? `<p class="my-2 text-left">${match}</p>` : '';
  });
  
  // Replace list placeholders with actual lists
  ulLists.forEach((list, index) => {
    formattedText = formattedText.replace(`<ul-placeholder id="list-${index}">`, list);
  });
  
  olLists.forEach((list, index) => {
    formattedText = formattedText.replace(`<ol-placeholder id="list-${index}">`, list);
  });
  
  // Add line breaks
  formattedText = formattedText.replace(/\n/g, '<br />');
  
  return formattedText;
};
