// Extension Service Worker Tests - Diagnostic mode
// Test script for diagnosing right-click context menu issues

// Debug logging utility
function logDebug(label, data, isError = false) {
  const method = isError ? console.error : console.log;
  const timestamp = new Date().toISOString();
  const prefix = isError ? '🔴 ERROR' : '🔵 INFO';
  
  try {
    method(`${prefix} [${timestamp}] ${label}:`, data);
    
    // Also log to storage for popup debugging (keep last 20 logs)
    chrome.storage.local.get(['debugLogs'], (result) => {
      let logs = result.debugLogs || [];
      logs.push({
        timestamp,
        label,
        isError,
        data: typeof data === 'object' ? JSON.stringify(data) : String(data)
      });
      
      // Keep only last 20 logs
      if (logs.length > 20) {
        logs = logs.slice(-20);
      }
      
      chrome.storage.local.set({ debugLogs: logs });
    });
  } catch (e) {
    console.error('Error in logging:', e);
  }
}

// Initialize - Log service worker starts
logDebug('TEST SERVICE WORKER', 'Diagnostic service worker initialized');

// Clear and create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing items first to prevent duplicates
  chrome.contextMenus.removeAll(() => {
    // Create a simple test menu item
    chrome.contextMenus.create({
      id: "investiq-test",
      title: "InvestIQ TEST: Analyze Selection",
      contexts: ["selection"]
    });
    logDebug('TEST: Context menu created', 'InvestIQ test option added to right-click menu');
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  logDebug('TEST: Context menu clicked', info);
  if (info.menuItemId === "investiq-test") {
    const selectedText = info.selectionText.trim();
    logDebug('TEST: Selected text', selectedText);
    
    if (selectedText) {
      try {
        // Store the selection for testing
        chrome.storage.local.set({ 
          testSelection: selectedText,
          testTimestamp: Date.now()
        }, () => {
          logDebug('TEST: Selection stored', { text: selectedText, time: new Date().toISOString() });
        });
        
        // Test approach #1: Using chrome.windows.create
        chrome.windows.create({
          url: chrome.runtime.getURL("popup.html?test=windows"),
          type: "popup",
          width: 450,
          height: 600
        }, (window) => {
          logDebug('TEST: Created popup window', window);
        });
      } catch (error) {
        logDebug('TEST: Error creating popup window', error.message, true);
        
        // Test approach #2: Using chrome.action.openPopup as fallback
        try {
          logDebug('TEST: Trying fallback with chrome.action.openPopup');
          chrome.action.openPopup();
        } catch (popupError) {
          logDebug('TEST: Error with openPopup fallback', popupError.message, true);
        }
      }
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logDebug('TEST: Message received', { action: message.action, sender });
  
  if (message.action === "testContextMenu") {
    // Report context menu status
    chrome.contextMenus.getAll((items) => {
      sendResponse({
        success: true,
        menuItems: items,
        message: `Found ${items.length} context menu items`
      });
    });
    return true; // Async response
  }
  
  if (message.action === "testWindowsAPI") {
    // Test the windows API
    chrome.windows.getAll((windows) => {
      sendResponse({
        success: true,
        windowCount: windows.length,
        message: `Found ${windows.length} windows`
      });
    });
    return true; // Async response
  }
  
  if (message.action === "getTestLogs") {
    chrome.storage.local.get(['debugLogs', 'testSelection', 'testTimestamp'], (result) => {
      sendResponse({
        success: true,
        logs: result.debugLogs || [],
        testSelection: result.testSelection,
        testTimestamp: result.testTimestamp
      });
    });
    return true; // Async response
  }
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  logDebug('TEST: Extension icon clicked', { tabId: tab.id, url: tab.url });
});

// Log installation
logDebug('TEST SERVICE WORKER', 'Diagnostic service worker ready - right-click on text to test');