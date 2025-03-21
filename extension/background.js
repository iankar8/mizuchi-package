// Background script for MizuchiAI Extension (ES Module)
// Handles context menu creation and API requests

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

// Log service worker initialization
logDebug('Service worker initialized', 'Background script starting');

// API Keys should be stored securely and not hardcoded
// For development purposes, we're loading from storage or .env.development
// In production, consider using environment variables or a secure backend
let FMP_API_KEY = "";
let PERPLEXITY_API_KEY = "";
let MISTRAL_API_KEY = "";

// Default keys from .env.development - these match the development environment
// but should be replaced with user's own keys in production
// Note: Default keys may have usage limits or may be expired - users should add their own
const DEFAULT_FMP_API_KEY = "UbZlYJcx4PqoEkPAzJ2twhb2cU835qYn";
const DEFAULT_PERPLEXITY_API_KEY = "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";
const DEFAULT_MISTRAL_API_KEY = "e1pMnRuEfCCJt1hQPfXEYGHckBzLrBpn";

// Get API keys from storage if available
chrome.storage.local.get(['apiKeys'], (result) => {
  if (result.apiKeys) {
    // User has configured custom API keys - use these
    FMP_API_KEY = result.apiKeys.fmp || DEFAULT_FMP_API_KEY;
    PERPLEXITY_API_KEY = result.apiKeys.perplexity || DEFAULT_PERPLEXITY_API_KEY;
    MISTRAL_API_KEY = result.apiKeys.mistral || DEFAULT_MISTRAL_API_KEY;
    
    logDebug('API Keys loaded from storage', {
      FMP: result.apiKeys.fmp ? '✓ Custom' : '✓ Default',
      PERPLEXITY: result.apiKeys.perplexity ? '✓ Custom' : '✓ Default',
      MISTRAL: result.apiKeys.mistral ? '✓ Custom' : '✓ Default'
    });
  } else {
    // No custom keys - use defaults from .env.development
    FMP_API_KEY = DEFAULT_FMP_API_KEY;
    PERPLEXITY_API_KEY = DEFAULT_PERPLEXITY_API_KEY;
    MISTRAL_API_KEY = DEFAULT_MISTRAL_API_KEY;
    
    // Create empty apiKeys object in storage for future updates
    chrome.storage.local.set({ 
      apiKeys: {
        fmp: '',
        perplexity: '',
        mistral: ''
      }
    });
    
    logDebug('Using default API keys from .env.development', 'Consider adding your own keys through the API settings', true);
  }
  
  // Log the current API key status
  logDebug('API Keys status', {
    FMP: FMP_API_KEY ? '✓ Available' : '✗ Missing',
    PERPLEXITY: PERPLEXITY_API_KEY ? '✓ Available' : '✗ Missing',
    MISTRAL: MISTRAL_API_KEY ? '✓ Available' : '✗ Missing'
  });
});

// We already log API key status inside the chrome.storage.local.get callback

// Key data types to fetch
const DATA_TYPES = {
  SYMBOL: 'symbol',
  PROFILE: 'profile',
  METRICS: 'metrics',
  PEERS: 'peers',
  SEC_FILINGS: 'secFilings',
  NEWS: 'news',
  AI_SUMMARY: 'aiSummary'
};

// Status tracking for data loading
let dataStatus = {};

// Initialize data status tracking
function initDataStatus() {
  logDebug('Initializing data status tracking', DATA_TYPES);
  Object.values(DATA_TYPES).forEach(type => {
    dataStatus[type] = { loading: false, loaded: false, error: null };
  });
  logDebug('Data status initialized', dataStatus);
}

// Reset data status for a new search
function resetDataStatus() {
  logDebug('Resetting data status', 'All data status will be reset');
  initDataStatus();
  return dataStatus;
}

// Initialize status on load
initDataStatus();

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "investiq-analyze",
    title: "Analyze with MizuchiAI",
    contexts: ["selection"]
  });
  logDebug('Context menu created', 'MizuchiAI analyze option added to right-click menu');
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  logDebug('Context menu clicked', info);
  if (info.menuItemId === "investiq-analyze") {
    const selectedText = info.selectionText.trim();
    if (selectedText) {
      logDebug('Starting analysis for', selectedText);
      
      // First, store the company name and reset status
      resetDataStatus();
      chrome.storage.local.set({ 
        selectedCompany: selectedText,
        dataStatus: dataStatus,
        dataLoaded: false,
        lastUpdate: Date.now()
      }, () => {
        // Start data fetch process immediately (don't wait for window to open)
        processCompanySearch(selectedText)
          .then(() => logDebug('Data fetch completed for', selectedText))
          .catch((error) => logDebug('Data fetch error for', { company: selectedText, error: error.message }, true));
        
        // Create the popup window after initiating the data load
        try {
          chrome.windows.create({
            url: chrome.runtime.getURL("popup.html?source=contextmenu"),
            type: "popup",
            width: 380,
            height: 500,
            focused: true
          }, (window) => {
            if (chrome.runtime.lastError) {
              logDebug('Error creating popup window', chrome.runtime.lastError.message, true);
            } else {
              logDebug('Created popup window', window);
            }
          });
        } catch (error) {
          logDebug('Exception creating popup window', error.message, true);
          
          // Fallback to opening the popup in a less ideal way
          try {
            chrome.tabs.create({
              url: chrome.runtime.getURL("popup.html?source=contextmenu-fallback"),
              active: true
            }, (tab) => {
              logDebug('Created fallback tab', tab);
            });
          } catch (tabError) {
            logDebug('Exception creating fallback tab', tabError.message, true);
          }
        }
      });
    }
  }
});

// Main function to process a company search
async function processCompanySearch(companyName) {
  try {
    logDebug(`Processing search for company`, companyName);
    // Update status to loading for symbol search
    updateDataStatus(DATA_TYPES.SYMBOL, true, false);
    
    // Step 1: Get company symbol
    const symbolData = await fetchCompanySymbol(companyName);
    if (!symbolData || !symbolData.symbol) {
      throw new Error(`Could not find symbol for "${companyName}". Please try a different company name.`);
    }
    
    // Symbol found, save it
    updateDataStatus(DATA_TYPES.SYMBOL, false, true, null, symbolData);
    const symbol = symbolData.symbol;
    logDebug(`Found symbol for company`, { symbol, company: companyName });
    
    // Step 2: Fetch all data in parallel
    // Start all fetch operations and track their promises
    const fetchOperations = [
      fetchWithStatus(DATA_TYPES.PROFILE, () => fetchCompanyProfile(symbol)),
      fetchWithStatus(DATA_TYPES.METRICS, () => fetchKeyMetrics(symbol)),
      fetchWithStatus(DATA_TYPES.PEERS, () => fetchPeers(symbol)),
      fetchWithStatus(DATA_TYPES.SEC_FILINGS, () => fetchSECFilings(symbol)),
      fetchWithStatus(DATA_TYPES.NEWS, () => fetchCompanyNews(symbol)),
      fetchWithStatus(DATA_TYPES.AI_SUMMARY, () => fetchAISummary(companyName, symbol))
    ];
    
    // Let all fetch operations complete (or fail) independently
    const results = await Promise.allSettled(fetchOperations);
    
    // Log which operations succeeded and which failed
    const operationStatus = {
      succeeded: [],
      failed: []
    };
    
    results.forEach((result, index) => {
      const dataType = Object.values(DATA_TYPES)[index + 1]; // +1 because symbol is already processed
      if (result.status === 'fulfilled') {
        operationStatus.succeeded.push(dataType);
      } else {
        operationStatus.failed.push({ dataType, reason: result.reason?.message || 'Unknown error' });
      }
    });
    
    logDebug('Fetch operations completion status', operationStatus);
    
    // Step 3: Mark overall data as loaded regardless of individual fetch results
    chrome.storage.local.set({ dataLoaded: true, lastUpdate: Date.now() });
    logDebug('All data fetch operations completed', { timestamp: Date.now() });
    
  } catch (error) {
    logDebug('Error in processCompanySearch', { error: error.message, stack: error.stack }, true);
    try {
      chrome.storage.local.set({ 
        error: error.message,
        dataLoaded: true 
      });
    } catch (storageError) {
      logDebug('Error saving error to storage', storageError, true);
    }
  }
}

// Helper to fetch data with status updates
async function fetchWithStatus(dataType, fetchFunc) {
  try {
    logDebug(`Starting fetch for ${dataType}`, 'Loading');
    updateDataStatus(dataType, true, false);
    const data = await fetchFunc();
    logDebug(`Successfully fetched ${dataType}`, { dataSize: JSON.stringify(data).length });
    updateDataStatus(dataType, false, true, null, data);
    return data;
  } catch (error) {
    logDebug(`Error fetching ${dataType}`, { message: error.message, stack: error.stack }, true);
    updateDataStatus(dataType, false, false, error.message);
    throw error;
  }
}

// Update status for a specific data type
function updateDataStatus(dataType, loading, loaded, error = null, data = null) {
  logDebug(`Updating status for ${dataType}`, { loading, loaded, error: error ? error.substring(0, 50) : null });
  
  dataStatus[dataType] = { loading, loaded, error };
  
  // Store updated status and data if available
  const updateObj = { dataStatus };
  if (data !== null) {
    updateObj[dataType + 'Data'] = data;
  }
  
  try {
    chrome.storage.local.set(updateObj, () => {
      if (chrome.runtime.lastError) {
        logDebug(`Error storing ${dataType} data`, chrome.runtime.lastError, true);
      } else {
        logDebug(`Successfully stored ${dataType} data`, { timestamp: Date.now() });
      }
    });
  } catch (storageError) {
    logDebug(`Exception storing ${dataType} data`, storageError, true);
  }
}

// Listen for when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  logDebug('Extension icon clicked', { tabId: tab.id, url: tab.url });
  // Check if we have a selected company to analyze
  chrome.storage.local.get(['selectedCompany', 'dataLoaded'], (result) => {
    if (!result.selectedCompany || result.dataLoaded === undefined) {
      // No company selected yet, just reset status
      resetDataStatus();
      chrome.storage.local.set({ 
        dataStatus: dataStatus,
        dataLoaded: false,
        error: null
      });
    } else if (result.selectedCompany && !result.dataLoaded) {
      // Company selected but data not loaded, trigger fetch
      processCompanySearch(result.selectedCompany);
    }
    // If company selected and data loaded, popup will just show existing data
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logDebug('Message received from popup', { action: message.action, sender });
  
  // Handle debug logs request
  if (message.action === "getDebugLogs") {
    logDebug('Retrieving debug logs', 'From storage');  
    chrome.storage.local.get(['debugLogs'], (result) => {
      logDebug('Debug logs retrieved', `Found ${(result.debugLogs || []).length} logs`);
      sendResponse({ success: true, logs: result.debugLogs || [] });
    });
    return true; // Async response
  }
  
  // Handle clearing debug logs
  if (message.action === "clearDebugLogs") {
    logDebug('Clearing debug logs', 'User requested');
    chrome.storage.local.set({ debugLogs: [] }, () => {
      sendResponse({ success: true, message: "Logs cleared" });
    });
    return true; // Async response
  }
  if (message.action === "popupOpened") {
    // Send current data status to popup
    chrome.storage.local.get(
      ['selectedCompany', 'dataLoaded', 'dataStatus', 'symbolData'], 
      (result) => {
        if (result.selectedCompany && !result.dataLoaded) {
          // Data not fully loaded, trigger fetch
          processCompanySearch(result.selectedCompany);
        }
        sendResponse({
          success: true,
          hasCompany: !!result.selectedCompany,
          dataLoaded: !!result.dataLoaded,
          dataStatus: result.dataStatus || dataStatus,
          symbolData: result.symbolData
        });
      }
    );
    return true; // Async response
  }
  
  // Handle manual search request from popup
  if (message.action === "searchCompany" && message.companyName) {
    resetDataStatus();
    chrome.storage.local.set({ 
      selectedCompany: message.companyName,
      dataStatus: dataStatus,
      dataLoaded: false,
      lastUpdate: Date.now()
    }, () => {
      processCompanySearch(message.companyName);
      sendResponse({ success: true, message: "Search started" });
    });
    return true; // Async response
  }
  
  // Handle refresh data request
  if (message.action === "refreshData") {
    chrome.storage.local.get(['selectedCompany'], (result) => {
      if (result.selectedCompany) {
        resetDataStatus();
        chrome.storage.local.set({ 
          dataStatus: dataStatus,
          dataLoaded: false 
        }, () => {
          processCompanySearch(result.selectedCompany);
          sendResponse({ success: true, message: "Refresh started" });
        });
      } else {
        sendResponse({ success: false, message: "No company selected" });
      }
    });
    return true; // Async response
  }
  
  // Handle API keys updated
  if (message.action === "apiKeysUpdated") {
    logDebug('API keys updated', 'Reloading keys');
    
    // Reload API keys
    chrome.storage.local.get(['apiKeys'], (result) => {
      if (result.apiKeys) {
        // If a key is empty, use the default
        FMP_API_KEY = result.apiKeys.fmp || DEFAULT_FMP_API_KEY;
        PERPLEXITY_API_KEY = result.apiKeys.perplexity || DEFAULT_PERPLEXITY_API_KEY;
        MISTRAL_API_KEY = result.apiKeys.mistral || DEFAULT_MISTRAL_API_KEY;
        
        logDebug('API Keys reloaded', {
          FMP: result.apiKeys.fmp ? '✓ Custom' : '✓ Default',
          PERPLEXITY: result.apiKeys.perplexity ? '✓ Custom' : '✓ Default',
          MISTRAL: result.apiKeys.mistral ? '✓ Custom' : '✓ Default'
        });
        
        sendResponse({ success: true, message: "API keys updated" });
      } else {
        // Fallback to defaults if something went wrong
        FMP_API_KEY = DEFAULT_FMP_API_KEY;
        PERPLEXITY_API_KEY = DEFAULT_PERPLEXITY_API_KEY;
        MISTRAL_API_KEY = DEFAULT_MISTRAL_API_KEY;
        
        logDebug('No API keys found in storage', 'Using defaults from .env.development', true);
        sendResponse({ success: false, message: "No API keys found, using defaults" });
      }
    });
    return true; // Async response
  }
});

// Function to fetch company symbol from name
async function fetchCompanySymbol(companyName) {
  logDebug('Fetching company symbol', companyName);
  try {
    const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(companyName)}&limit=1&apikey=${FMP_API_KEY}`;
    logDebug('Making API request', { url: url.replace(FMP_API_KEY, 'API_KEY_HIDDEN'), method: 'GET' });
    
    const response = await fetch(url);
    
    // Get response headers safely (handling both real and mock responses)
    const responseStatus = {
      status: response.status,
      statusText: response.statusText,
      headers: {}
    };
    
    // Try to get headers in different ways (for compatibility with test environment)
    try {
      if (response.headers && typeof response.headers.get === 'function') {
        // Real fetch response
        responseStatus.headers['content-type'] = response.headers.get('content-type') || 'unknown';
      } else if (response.headers && typeof response.headers === 'object') {
        // Mock response in test environment
        responseStatus.headers = {...response.headers};
      }
    } catch (e) {
      logDebug('Warning: Could not read response headers', e, false);
    }
    logDebug('API response details', responseStatus);
    
    if (!response.ok) {
      const errorText = await response.text().catch(e => 'Failed to get error text');
      logDebug('API error response', errorText, true);
      throw new Error(`FMP API responded with status: ${response.status}: ${errorText}`);
    }
    
    const data = await response.json().catch(e => {
      logDebug('Error parsing JSON', e, true);
      throw new Error(`Invalid JSON response: ${e.message}`);
    });
    
    logDebug('Symbol search response data', data);
    
    if (data && data.length > 0) {
      const result = {
        symbol: data[0].symbol,
        name: data[0].name,
        exchange: data[0].exchangeShortName
      };
      logDebug('Successfully found symbol', result);
      return result;
    } else {
      logDebug('No symbol found', { companyName }, true);
      throw new Error(`No symbol found for company: ${companyName}`);
    }
  } catch (error) {
    logDebug('Error fetching company symbol', { message: error.message, stack: error.stack }, true);
    throw error;
  }
}

// Function to fetch company profile
async function fetchCompanyProfile(symbol) {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        symbol: data[0].symbol,
        name: data[0].companyName,
        price: data[0].price,
        changes: data[0].changes,
        changesPercentage: data[0].changesPercentage,
        marketCap: data[0].mktCap,
        currency: data[0].currency,
        exchange: data[0].exchangeShortName,
        industry: data[0].industry
      };
    } else {
      throw new Error(`No profile data found for symbol: ${symbol}`);
    }
  } catch (error) {
    console.error('Error fetching company profile:', error);
    throw error;
  }
}

// Function to fetch key metrics
async function fetchKeyMetrics(symbol) {
  try {
    // Get ratios for PE, dividend, etc.
    logDebug(`Fetching ratios for ${symbol}`, 'Starting API request');
    const ratiosResponse = await fetch(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${FMP_API_KEY}`);
    
    if (!ratiosResponse.ok) {
      throw new Error(`FMP API ratios responded with status: ${ratiosResponse.status}`);
    }
    
    const ratiosData = await ratiosResponse.json().catch(e => {
      logDebug('Error parsing ratios JSON', e, true);
      throw new Error(`Invalid ratios JSON response: ${e.message}`);
    });
    logDebug('Ratios data received', ratiosData);
    
    // Get growth info
    logDebug(`Fetching growth data for ${symbol}`, 'Starting API request');
    const growthResponse = await fetch(`https://financialmodelingprep.com/api/v3/financial-growth/${symbol}?limit=1&apikey=${FMP_API_KEY}`);
    
    if (!growthResponse.ok) {
      throw new Error(`FMP API growth responded with status: ${growthResponse.status}`);
    }
    
    const growthData = await growthResponse.json().catch(e => {
      logDebug('Error parsing growth JSON', e, true);
      throw new Error(`Invalid growth JSON response: ${e.message}`);
    });
    logDebug('Growth data received', growthData);
    
    // Get income statement for revenue, etc.
    logDebug(`Fetching income statement for ${symbol}`, 'Starting API request');
    const incomeResponse = await fetch(`https://financialmodelingprep.com/api/v3/income-statement/${symbol}?limit=1&apikey=${FMP_API_KEY}`);
    
    if (!incomeResponse.ok) {
      throw new Error(`FMP API income statement responded with status: ${incomeResponse.status}`);
    }
    
    const incomeData = await incomeResponse.json().catch(e => {
      logDebug('Error parsing income statement JSON', e, true);
      throw new Error(`Invalid income statement JSON response: ${e.message}`);
    });
    logDebug('Income statement data received', incomeData);
    
    // Check if we have all the required data
    if (ratiosData && ratiosData.length > 0 && 
        growthData && growthData.length > 0 && 
        incomeData && incomeData.length > 0) {
        
      return {
        peRatio: ratiosData[0].priceEarningsRatio || 0,
        dividendYield: ratiosData[0].dividendYield * 100 || 0,
        dividendPerShare: ratiosData[0].dividendPerShare || 0,
        revenue: incomeData[0].revenue || 0,
        revenueGrowth: growthData[0].revenueGrowth * 100 || 0,
        eps: incomeData[0].eps || 0,
        netMargin: (incomeData[0].netIncome / incomeData[0].revenue) * 100 || 0
      };
    } else {
      throw new Error(`No metrics data found for symbol: ${symbol}`);
    }
  } catch (error) {
    logDebug('Error fetching key metrics', { message: error.message, stack: error.stack }, true);
    // Return a partial result instead of throwing - this allows the UI to at least show something
    return {
      peRatio: 0,
      dividendYield: 0,
      dividendPerShare: 0,
      revenue: 0,
      revenueGrowth: 0,
      eps: 0,
      netMargin: 0
    };
  }
}

// Function to fetch company news
async function fetchCompanyNews(symbol) {
  try {
    // Try using Perplexity for recent news first
    try {
      console.log(`Fetching news with Perplexity API for ${symbol}...`);
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a financial news assistant. Provide only factual, recent news about companies. Format as JSON array with title, date, and source properties.'
            },
            {
              role: 'user',
              content: `Find the 3 most recent and important news articles for ${symbol}. Return ONLY a JSON array with format: [{"title": "Article Title", "date": "YYYY-MM-DD", "source": "Source Name"}]. Do not include any explanation, just return valid JSON.`
            }
          ],
          max_tokens: 500
        })
      });
      
      if (perplexityResponse.ok) {
        const perplexityData = await perplexityResponse.json();
        if (perplexityData?.choices?.[0]?.message?.content) {
          try {
            // Extract JSON from the response text
            const contentText = perplexityData.choices[0].message.content;
            const jsonMatch = contentText.match(/\[\s*\{.*\}\s*\]/s);
            if (jsonMatch) {
              const parsedNews = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsedNews) && parsedNews.length > 0) {
                console.log('Successfully fetched news from Perplexity');
                return parsedNews;
              }
            }
          } catch (parseError) {
            console.error('Error parsing Perplexity news response:', parseError);
          }
        }
      }
      console.log('Perplexity news retrieval failed, falling back to FMP');
    } catch (perplexityError) {
      console.error('Error with Perplexity news:', perplexityError);
    }
    
    // Fallback to FMP news API
    const response = await fetch(`https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=3&apikey=${FMP_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map(item => ({
        title: item.title,
        date: item.publishedDate,
        source: item.site,
        url: item.url || ''
      }));
    } else {
      return [
        {
          title: "No recent news available for this company",
          date: new Date().toISOString(),
          source: "InvestIQ",
          url: ''
        }
      ];
    }
  } catch (error) {
    console.error('Error fetching company news:', error);
    // Return default message on error
    return [
      {
        title: "Error loading news. Please try again later.",
        date: new Date().toISOString(),
        source: "InvestIQ",
        url: ''
      }
    ];
  }
}

// Function to fetch company peers/competitors
async function fetchPeers(symbol) {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v4/stock_peers?symbol=${symbol}&apikey=${FMP_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0 && data[0].peersList && data[0].peersList.length > 0) {
      // Get company names for the peer symbols
      const peerSymbols = data[0].peersList.slice(0, 5); // Limit to top 5 peers
      
      try {
        // Try to get company name and basic data for each peer
        const peersWithData = await Promise.all(peerSymbols.map(async (peerSymbol) => {
          try {
            const profileResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${peerSymbol}?apikey=${FMP_API_KEY}`);
            if (!profileResponse.ok) {
              return { symbol: peerSymbol, name: peerSymbol };
            }
            const profileData = await profileResponse.json();
            if (profileData && profileData.length > 0) {
              return { 
                symbol: peerSymbol, 
                name: profileData[0].companyName || peerSymbol,
                price: profileData[0].price,
                changes: profileData[0].changes
              };
            }
            return { symbol: peerSymbol, name: peerSymbol };
          } catch (err) {
            return { symbol: peerSymbol, name: peerSymbol };
          }
        }));
        
        return peersWithData;
      } catch (nameError) {
        console.error('Error fetching peer names:', nameError);
        // Just return symbols if name fetch fails
        return peerSymbols.map(symbol => ({ symbol, name: symbol }));
      }
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching peers:', error);
    return [];
  }
}

// Function to fetch SEC filings
async function fetchSECFilings(symbol) {
  try {
    const response = await fetch(`https://financialmodelingprep.com/api/v3/sec_filings/${symbol}?limit=5&apikey=${FMP_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return data.map(filing => ({
        form: filing.form,
        filingDate: filing.filingDate,
        acceptedDate: filing.acceptedDate,
        cik: filing.cik,
        type: filing.type,
        link: filing.finalLink
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching SEC filings:', error);
    return [];
  }
}

// Function to fetch AI summary with priority on Mistral API
async function fetchAISummary(companyName, symbol) {
  // Validate API keys first to avoid unnecessary failed requests
  if (!MISTRAL_API_KEY && !PERPLEXITY_API_KEY) {
    logDebug('AI Summary Error', 'Both Mistral and Perplexity API keys are missing', true);
    return {
      summary: `Unable to generate AI summary for ${companyName} (${symbol}). Please configure API keys in the extension settings.`,
      source: "MizuchiAI"
    };
  }

  // Try Mistral first
  if (MISTRAL_API_KEY) {
    try {
      logDebug(`Fetching AI summary`, `Using Mistral API for ${symbol}`);
      const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst AI that provides concise, accurate summaries about public companies. Focus on recent performance, key metrics, and relevant business developments. Keep responses factual, balanced, and investor-focused.'
            },
            {
              role: 'user',
              content: `Provide a concise financial analysis of ${companyName} (${symbol}). Include recent performance, key growth metrics, and any significant developments or challenges. Limit to 3-4 sentences.`
            }
          ],
          max_tokens: 250
        })
      });
      
      if (!mistralResponse.ok) {
        const errorStatus = mistralResponse.status;
        logDebug('Mistral API Error', `Status: ${errorStatus}`, true);
        
        if (errorStatus === 401) {
          throw new Error('Mistral API key is invalid or expired');
        } else if (errorStatus === 429) {
          throw new Error('Mistral API rate limit exceeded');
        } else {
          throw new Error(`Mistral API responded with status: ${errorStatus}`);
        }
      }
      
      const mistralData = await mistralResponse.json().catch(e => {
        throw new Error(`Failed to parse Mistral response: ${e.message}`);
      });
      
      if (mistralData && mistralData.choices && mistralData.choices.length > 0 && 
          mistralData.choices[0].message && mistralData.choices[0].message.content) {
        return {
          summary: mistralData.choices[0].message.content,
          source: "MizuchiAI (powered by Mistral)"
        };
      }
      
      throw new Error('No valid content in Mistral API response');
    } catch (mistralError) {
      logDebug('Error with Mistral API', mistralError.message, true);
      // Continue to Perplexity as fallback
    }
  } else {
    logDebug('Mistral API', 'No API key configured, skipping', true);
  }
  
  // Try Perplexity as a fallback (or primary if Mistral key is missing)
  if (PERPLEXITY_API_KEY) {
    try {
      logDebug(`Using Perplexity API`, `For ${symbol}`);
      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst AI that provides concise, accurate summaries about public companies. Focus on recent performance, key metrics, and relevant business developments. Keep responses factual, balanced, and investor-focused.'
            },
            {
              role: 'user',
              content: `Provide a concise financial analysis of ${companyName} (${symbol}). Include recent performance, key growth metrics, and any significant developments or challenges. Limit to 3-4 sentences.`
            }
          ],
          max_tokens: 250
        })
      });
      
      if (!perplexityResponse.ok) {
        const errorStatus = perplexityResponse.status;
        logDebug('Perplexity API Error', `Status: ${errorStatus}`, true);
        
        if (errorStatus === 401) {
          throw new Error('Perplexity API key is invalid or expired');
        } else if (errorStatus === 429) {
          throw new Error('Perplexity API rate limit exceeded');
        } else {
          throw new Error(`Perplexity API responded with status: ${errorStatus}`);
        }
      }
      
      const perplexityData = await perplexityResponse.json().catch(e => {
        throw new Error(`Failed to parse Perplexity response: ${e.message}`);
      });
      
      if (perplexityData && perplexityData.choices && perplexityData.choices.length > 0 && 
          perplexityData.choices[0].message && perplexityData.choices[0].message.content) {
        return {
          summary: perplexityData.choices[0].message.content,
          source: "MizuchiAI (powered by Perplexity)"
        };
      }
      
      throw new Error('No valid content in Perplexity API response');
    } catch (perplexityError) {
      logDebug('Error with Perplexity API', perplexityError.message, true);
    }
  } else {
    logDebug('Perplexity API', 'No API key configured, skipping', true);
  }
  
  // If both APIs fail, return a generic message
  return {
    summary: `${companyName} (${symbol}) is currently being analyzed. Unable to generate an AI summary at this moment - the API keys may be expired or have reached their rate limits. Please consider adding your own API keys in the extension settings.`,
    source: "MizuchiAI"
  };
}
// Debug build created on Sat Mar 16 12:42:29 EDT 2024