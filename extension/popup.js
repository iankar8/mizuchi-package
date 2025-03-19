// MizuchiAI Extension Popup Script
// Handles the popup UI and data display

// Debug logging utility
function logDebug(label, data, isError = false) {
  const method = isError ? console.error : console.log;
  const timestamp = new Date().toISOString();
  const prefix = isError ? '🔴 ERROR' : '🔵 INFO';
  
  try {
    method(`${prefix} [${timestamp}] ${label}:`, data);
  } catch (e) {
    console.error('Error in logging:', e);
  }
}

// Authentication state variables
let isSignupMode = false;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase and check authentication state
  initializeSupabaseSync();
  
  // Set up authentication event listeners
  setupAuthEventListeners();
  // Check if we were launched from the context menu
  const urlParams = new URLSearchParams(window.location.search);
  const source = urlParams.get('source');
  logDebug('Popup source', source || 'direct popup');
  
  // Immediately check for data if opened from context menu
  if (source && source.includes('contextmenu')) {
    logDebug('Context menu launch detected', source);
    // Special handling for context menu launches
    chrome.storage.local.get(['selectedCompany', 'dataLoaded'], (result) => {
      if (result.selectedCompany) {
        logDebug('Company detected from context menu', result.selectedCompany);
        
        // Show the company being analyzed
        const contentDiv = document.getElementById('content');
        if (contentDiv) {
          contentDiv.classList.add('loading');
          const loadingElem = document.createElement('div');
          loadingElem.className = 'loading-indicator';
          loadingElem.innerHTML = `
            <div class="spinner"></div>
            <p>Analyzing <strong>${result.selectedCompany}</strong>...</p>
          `;
          contentDiv.innerHTML = '';
          contentDiv.appendChild(loadingElem);
        }
      }
    });
  }
  
  // Function to show the API keys dialog
  window.showAPIKeysDialog = function() {
    const dialog = document.getElementById('api-keys-dialog');
    if (!dialog) return;
    
    // Load current API keys
    chrome.storage.local.get(['apiKeys'], (result) => {
      const apiKeys = result.apiKeys || { fmp: '', perplexity: '', mistral: '' };
      
      // Populate form fields
      document.getElementById('fmp-api-key').value = apiKeys.fmp || '';
      document.getElementById('perplexity-api-key').value = apiKeys.perplexity || '';
      document.getElementById('mistral-api-key').value = apiKeys.mistral || '';
      
      // Set placeholder text to indicate default keys are being used
      if (!apiKeys.fmp) {
        document.getElementById('fmp-api-key').placeholder = "Using default key from .env.development";
      }
      if (!apiKeys.perplexity) {
        document.getElementById('perplexity-api-key').placeholder = "Using default key from .env.development";
      }
      if (!apiKeys.mistral) {
        document.getElementById('mistral-api-key').placeholder = "Using default key from .env.development";
      }
      
      // Show dialog
      dialog.classList.add('show');
    });
  };
  
  // Function to save API keys
  function saveAPIKeys() {
    const fmpKey = document.getElementById('fmp-api-key').value.trim();
    const perplexityKey = document.getElementById('perplexity-api-key').value.trim();
    const mistralKey = document.getElementById('mistral-api-key').value.trim();
    
    const apiKeys = {
      fmp: fmpKey,
      perplexity: perplexityKey,
      mistral: mistralKey
    };
    
    chrome.storage.local.set({ apiKeys }, () => {
      if (chrome.runtime.lastError) {
        logDebug('Error saving API keys', chrome.runtime.lastError, true);
        alert('Error saving API keys: ' + chrome.runtime.lastError.message);
      } else {
        logDebug('API keys saved successfully', { keysProvided: Object.values(apiKeys).filter(Boolean).length });
        
        // Close the dialog
        document.getElementById('api-keys-dialog').classList.remove('show');
        
        // Notify the background script that API keys have changed
        chrome.runtime.sendMessage({ action: "apiKeysUpdated" });
        
        // Show success message
        alert('API keys saved successfully');
      }
    });
  }
  
  // Set up API keys dialog event listeners
  const apiKeysDialog = document.getElementById('api-keys-dialog');
  const closeApiDialogBtn = document.getElementById('close-api-dialog');
  const saveApiKeysBtn = document.getElementById('save-api-keys');
  
  if (closeApiDialogBtn) {
    closeApiDialogBtn.addEventListener('click', () => {
      apiKeysDialog.classList.remove('show');
    });
  }
  
  if (saveApiKeysBtn) {
    saveApiKeysBtn.addEventListener('click', saveAPIKeys);
  }
  logDebug('Popup initialized', 'DOM content loaded');
  
  // Debug panel elements
  const debugToggle = document.getElementById('debug-toggle');
  const debugPanel = document.getElementById('debug-panel');
  const refreshLogsBtn = document.getElementById('refresh-logs');
  const copyLogsBtn = document.getElementById('copy-logs');
  const closeDebugBtn = document.getElementById('close-debug');
  const extensionStatusEl = document.getElementById('extension-status');
  const debugLogsEl = document.getElementById('debug-logs');
  // Get UI element references
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessage = document.getElementById('error-message');
  const stockInfo = document.getElementById('stock-info');
  const companyTag = document.getElementById('company-tag');
  const stockSymbol = document.getElementById('stock-symbol');
  const companyName = document.getElementById('company-name');
  const price = document.getElementById('price');
  const priceChange = document.getElementById('price-change');
  const marketCap = document.getElementById('market-cap');
  const peRatio = document.getElementById('pe-ratio');
  const dividend = document.getElementById('dividend');
  const aiSummary = document.getElementById('ai-summary');
  const revenue = document.getElementById('revenue');
  const eps = document.getElementById('eps');
  const revenueGrowth = document.getElementById('revenue-growth');
  const netMargin = document.getElementById('net-margin');
  const newsList = document.getElementById('news-list');
  const btnWatch = document.getElementById('btn-watch');
  
  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // Signal the background script that the popup is opened
  chrome.runtime.sendMessage({action: "popupOpened"}, (response) => {
    logDebug("Popup opened, background notified", response);
    // Check for runtime errors
    if (chrome.runtime.lastError) {
      logDebug("Runtime error in popupOpened message", chrome.runtime.lastError, true);
    }
    
    // If we have a symbol but no loaded data, show loading state
    if (response && response.hasCompany && !response.dataLoaded) {
      showLoadingState();
    }
  });
  
  // Initialize
  loadData();
  setupEventListeners();
  
  // Load data from storage
  function loadData() {
    logDebug('Loading data from storage', 'Started');
    // Show loading initially
    showLoadingState();
    
    // Check if launched from context menu
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    const isFromContextMenu = source && source.includes('contextmenu');
    
    // Get all data from storage including the new data types
    chrome.storage.local.get([
      'selectedCompany',
      'symbolData',
      'dataStatus',
      'profileData',    // company profile 
      'metricsData',    // financial metrics
      'peersData',      // competitors
      'secFilingsData',  // SEC filings
      'newsData',       // news articles
      'aiSummaryData',  // AI generated summary
      'dataLoaded',
      'error',
      'watchlist',
      'lastUpdate'      // when data was last updated
    ], (result) => {
      if (chrome.runtime.lastError) {
        logDebug('Error retrieving data from storage', chrome.runtime.lastError, true);
        displayError('Failed to load data from storage: ' + chrome.runtime.lastError.message);
        return;
      }
      
      // If launched from context menu but data isn't loaded yet, show more specific loading message
      if (isFromContextMenu && result.selectedCompany && !result.dataLoaded) {
        logDebug('Context menu data loading', { company: result.selectedCompany, lastUpdate: result.lastUpdate });
        const loadingMessage = document.querySelector('.loading-indicator p');
        if (loadingMessage) {
          loadingMessage.innerHTML = `Analyzing <strong>${result.selectedCompany}</strong>...<br>
            <span class="loading-subtext">Please wait while we gather financial data</span>`;
        }
      }
      
      logDebug('Retrieved data from storage', result);
      
      // Debug which keys are actually present
      const keys = Object.keys(result);
      logDebug('Keys in storage result', keys);
      
      if (result.error) {
        // Show error message
        logDebug('Error from storage', result.error, true);
        displayError(result.error);
        return;
      }
      
      // Update loading status with progress if data is still loading
      if (!result.dataLoaded && result.dataStatus) {
        updateLoadingProgress(result.dataStatus);
        return;
      }
      
      // If we have the minimum required data, display it
      if (result.dataLoaded && (result.profileData || result.symbolData)) {
        // Hide loading, show stock info
        loadingIndicator.style.display = 'none';
        stockInfo.style.display = 'block';
        
        // Display the data - using the new data structure names
        displayCompanyData({
          selectedCompany: result.selectedCompany,
          symbolData: result.symbolData,
          profile: result.profileData,
          metrics: result.metricsData,
          peers: result.peersData,
          secFilings: result.secFilingsData,
          news: result.newsData,
          aiSummary: result.aiSummaryData,
          watchlist: result.watchlist || []
        });
      } else if (result.selectedCompany) {
        // We have a company but not all data loaded yet
        showLoadingState();
      } else {
        // No company selected, show search form
        showEmptyState();
      }
    });
  }
  
  // Display company data in the UI
  function displayCompanyData(data) {
    logDebug('Displaying company data', data);
    const { selectedCompany, symbolData, profile, metrics, peers, secFilings, news, aiSummary, watchlist } = data;
    
    // Company Tag and Name - will be moved under ticker
    companyTag.textContent = selectedCompany || (profile?.companyName) || (symbolData?.name) || 'Unknown Company';
    companyTag.style.display = 'inline-block';
    
    // Set link to company website if available
    if (profile?.website) {
      companyTag.dataset.website = profile.website; // Save website for click handler
    }
    
    // Symbol and Company Name
    stockSymbol.textContent = symbolData?.symbol || profile?.symbol || 'N/A';
    companyName.textContent = profile?.companyName || profile?.name || selectedCompany;
    
    // Price and Change - handle cases where data might be missing
    const stockPrice = profile?.price !== undefined ? profile.price : 0;
    price.textContent = stockPrice ? `$${Number(stockPrice).toFixed(2)}` : 'N/A';
    
    // Calculate change percentage display
    let changeText = 'N/A';
    let changeClass = 'neutral';
    
    if (profile?.changes !== undefined) {
      const changes = Number(profile.changes).toFixed(2);
      const changesPercentage = profile.changesPercentage !== undefined 
        ? Number(profile.changesPercentage).toFixed(2) 
        : (profile.changes * 100 / (profile.price - profile.changes)).toFixed(2);
        
      changeText = `${profile.changes > 0 ? '+' : ''}${changes} (${changesPercentage}%)`;
      changeClass = profile.changes >= 0 ? 'positive' : 'negative';
      
      // Add arrow icon
      const arrowIcon = profile.changes >= 0 
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12L12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 12L12 19L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        
      changeText = arrowIcon + ' ' + changeText;
    }
    
    priceChange.innerHTML = `<span class="${changeClass}">${changeText}</span>`;
    
    // Format metrics values - handle cases where data might be missing
    marketCap.textContent = profile?.marketCap ? formatMarketCap(profile.marketCap) : 'N/A';
    
    if (metrics?.peRatio !== undefined) {
      peRatio.textContent = metrics.peRatio.toFixed(2);
    } else {
      peRatio.textContent = 'N/A';
    }
    
    // Log metrics data for debugging
    logDebug('Metrics data details', { metrics });
    logDebug('Profile data details', { profile });
    
    
    // Handle dividend display
    if (profile?.lastDiv > 0) {
      const dividendValue = Number(profile.lastDiv).toFixed(2);
      const dividendYield = profile.price ? ((profile.lastDiv / profile.price) * 100).toFixed(2) : '0.00';
      dividend.textContent = `$${dividendValue} (${dividendYield}%)`;
    } else {
      dividend.textContent = '$0.00 (0.00%)';
    }
    
    // Key financial metrics - with null/undefined checks
    if (metrics?.revenue) {
      revenue.textContent = `$${formatLargeNumber(metrics.revenue)}`;
    } else {
      revenue.textContent = 'N/A';
    }
    
    // EPS display
    eps.textContent = metrics?.eps !== undefined 
      ? `$${Number(metrics.eps).toFixed(2)}` 
      : 'N/A';
    
    // Revenue growth
    if (metrics?.revenueGrowth !== undefined) {
      const growthValue = Number(metrics.revenueGrowth).toFixed(1);
      const arrowIcon = metrics.revenueGrowth >= 0 
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12L12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> '
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 12L12 19L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ';
      revenueGrowth.innerHTML = `${arrowIcon}${metrics.revenueGrowth > 0 ? '+' : ''}${growthValue}%`;
      revenueGrowth.className = `metric-item-value ${metrics.revenueGrowth >= 0 ? 'positive' : 'negative'}`;
    } else {
      revenueGrowth.textContent = 'N/A';
      revenueGrowth.className = 'metric-item-value';
    }
    
    // Net margin
    if (metrics?.netMargin !== undefined) {
      const marginValue = Number(metrics.netMargin).toFixed(1);
      const arrowIcon = metrics.netMargin >= 0 
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12L12 5L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> '
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 12L12 19L5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ';
      netMargin.innerHTML = `${arrowIcon}${marginValue}%`;
      netMargin.className = `metric-item-value ${metrics.netMargin >= 0 ? 'positive' : 'negative'}`;
    } else {
      netMargin.textContent = 'N/A';
      netMargin.className = 'metric-item-value';
    }
    
    // AI Summary
    const aiSummaryElement = document.getElementById('ai-summary');
    if (aiSummary?.summary) {
      aiSummaryElement.innerHTML = `
        <div class="ai-content">${aiSummary.summary}</div>
        <div class="ai-source small">Source: ${aiSummary.source || 'MizuchiAI'}</div>
      `;
    } else {
      aiSummaryElement.textContent = 'No AI summary available at this time.';
    }
    
    // News list
    newsList.innerHTML = '';
    if (news && news.length > 0) {
      news.forEach(item => {
        const li = document.createElement('li');
        li.className = 'news-item clickable';
        
        // Make all news items clickable, using URL if available or search if not, and close popup
        li.addEventListener('click', function(e) {
          e.preventDefault(); // Prevent default behavior
          
          try {
            if (item.url) {
              // Use both chrome.tabs.create and window.open for redundancy
              window.open(item.url, '_blank');
              chrome.tabs.create({url: item.url}, () => {
                if (chrome.runtime.lastError) {
                  console.error("Error opening tab:", chrome.runtime.lastError);
                }
              });
            } else {
              // If no URL, search for the news title on Google
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;
              window.open(searchUrl, '_blank');
              chrome.tabs.create({url: searchUrl}, () => {
                if (chrome.runtime.lastError) {
                  console.error("Error opening tab:", chrome.runtime.lastError);
                }
              });
            }
          } catch (error) {
            console.error("Error with link click:", error);
          }
          
          // Close the popup
          setTimeout(() => window.close(), 100);
        });
        
        li.innerHTML = `
          <div class="news-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="news-content">
            <p class="news-title">${item.title}</p>
            <p class="news-meta">${formatDate(item.date)}</p>
          </div>
        `;
        newsList.appendChild(li);
      });
    } else {
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = 'No recent news available.';
      newsList.appendChild(emptyMsg);
    }
    
    // Create peers tab only
    createPeersTab(peers);
    
    // Watch button state - use symbol from symbolData or profile
    const symbol = symbolData?.symbol || profile?.symbol;
    if (symbol) {
      updateWatchButtonState(watchlist.includes(symbol), symbol);
    }
  }
  
  // Display error message
  function displayError(message) {
    logDebug('Displaying error', message, true);
    loadingIndicator.style.display = 'none';
    errorMessage.textContent = message;
    errorMessage.classList.add('has-error');
    errorMessage.style.display = 'block';
    stockInfo.style.display = 'none';
  }
  
  // Show empty state (no company selected)
  function showEmptyState() {
    logDebug('Showing empty state', 'No company selected');
    loadingIndicator.style.display = 'none';
    errorMessage.classList.remove('has-error');
    errorMessage.innerHTML = `
      <div class="empty-state">
        <h3>Welcome to MizuchiAI! 🔍</h3>
        <p>To analyze a company:</p>
        <ol>
          <li>Find a company name on any webpage</li>
          <li>Select the text</li>
          <li>Right-click and choose "Analyze with MizuchiAI"</li>
        </ol>
        <p>Or enter a company name below:</p>
        <div class="search-form">
          <input type="text" id="company-search" placeholder="Enter company name (e.g., Apple)">
          <button id="search-btn">Analyze</button>
        </div>
      </div>
    `;
    errorMessage.style.display = 'block';
    stockInfo.style.display = 'none';
    
    // Add event listener for the search button
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('company-search');
    
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        const companyName = searchInput.value.trim();
        if (companyName) {
          chrome.runtime.sendMessage({
            action: "searchCompany",
            companyName: companyName
          });
        }
      });
      
      // Also allow pressing Enter in the input
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const companyName = searchInput.value.trim();
          if (companyName) {
            chrome.runtime.sendMessage({
              action: "searchCompany",
              companyName: companyName
            });
          }
        }
      });
    }
  }
  
  // Show loading state
  function showLoadingState() {
    logDebug('Showing loading state', 'Loading...');
    loadingIndicator.style.display = 'flex';
    errorMessage.style.display = 'none';
    stockInfo.style.display = 'none';
  }
  
  // Update loading progress based on data status
  function updateLoadingProgress(dataStatus) {
    if (!dataStatus) return;
    
    const statusText = document.querySelector('#loading-indicator p');
    if (!statusText) return;
    
    // Count how many data types are loaded/loading
    let loadedCount = 0;
    let totalCount = 0;
    let currentlyLoading = [];
    
    Object.entries(dataStatus).forEach(([type, status]) => {
      totalCount++;
      if (status.loaded) loadedCount++;
      if (status.loading) currentlyLoading.push(formatDataTypeName(type));
    });
    
    // Show progress
    const percent = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 0;
    statusText.innerHTML = `Loading data: ${percent}%<br/><small>${currentlyLoading.join(', ') || 'Initializing...'}</small>`;
  }
  
  // Format data type name for display
  function formatDataTypeName(type) {
    switch (type) {
      case 'symbol': return 'Company Symbol';
      case 'profile': return 'Company Profile';
      case 'metrics': return 'Financial Metrics';
      case 'peers': return 'Competitors';
      case 'secFilings': return 'SEC Filings';
      case 'news': return 'News';
      case 'ai_summary': case 'aiSummary': return 'AI Analysis';
      default: return type;
    }
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Add event listener to company tag to open website if available
    companyTag.addEventListener('click', (e) => {
      e.preventDefault();
      
      const website = companyTag.dataset.website;
      if (website) {
        try {
          // Try both methods for redundancy
          window.open(website, '_blank');
          
          chrome.tabs.create({url: website}, () => {
            if (chrome.runtime.lastError) {
              console.error("Error opening tab:", chrome.runtime.lastError);
            }
          });
        } catch (error) {
          console.error("Error opening website:", error);
        }
        
        // Close the popup after a short delay
        setTimeout(() => window.close(), 100);
      }
    });
    // Listen for chrome.storage changes to update UI in real-time
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      
      logDebug('Storage changes detected', Object.keys(changes));
      
      // Check if data status changed
      if (changes.dataStatus) {
        updateLoadingProgress(changes.dataStatus.newValue);
      }
      
      // Check if data is fully loaded
      if (changes.dataLoaded && changes.dataLoaded.newValue === true) {
        logDebug('Data fully loaded', { timestamp: new Date().toISOString() });
        // Reload all data to display the latest
        loadData();
      }
      
      // Check if there was an error
      if (changes.error && changes.error.newValue) {
        displayError(changes.error.newValue);
      }
      
      // Check for right-click context menu selection updates
      if (changes.selectedCompany && !changes.dataLoaded) {
        const urlParams = new URLSearchParams(window.location.search);
        const source = urlParams.get('source');
        if (source && source.includes('contextmenu')) {
          logDebug('Context menu company updated', changes.selectedCompany.newValue);
          const loadingMessage = document.querySelector('.loading-indicator p');
          if (loadingMessage) {
            loadingMessage.innerHTML = `Analyzing <strong>${changes.selectedCompany.newValue}</strong>...<br>
              <span class="loading-subtext">Please wait while we gather financial data</span>`;
          }
        }
      }
    });
    
    // Tab navigation
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        if (tabId && document.getElementById(tabId)) {
          document.getElementById(tabId).classList.add('active');
        } else {
          logDebug('Tab target not found', { tabId }, true);
        }
      });
    });
    
    // Watch button
    btnWatch.addEventListener('click', toggleWatchStatus);
    
    // Add note button
    document.getElementById('btn-add-note').addEventListener('click', () => {
      // Get current symbol
      const symbol = document.getElementById('stock-symbol').textContent;
      if (!symbol) {
        alert('Unable to add note: No stock selected');
        return;
      }
      
      // Create a notes dialog
      const notesDialog = document.createElement('div');
      notesDialog.className = 'modal-dialog';
      notesDialog.id = 'notes-dialog';
      
      notesDialog.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Note for ${symbol}</h3>
            <button id="close-notes-dialog" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <textarea id="note-content" placeholder="Enter your notes about this stock..." rows="5" style="width: 100%; padding: 8px; border: 1px solid var(--border-light); border-radius: var(--radius-sm);"></textarea>
          </div>
          <div class="modal-footer">
            <button id="save-notes" class="btn-primary">Save Note</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(notesDialog);
      notesDialog.classList.add('show');
      
      // Setup event listeners for the notes dialog
      document.getElementById('close-notes-dialog').addEventListener('click', () => {
        notesDialog.classList.remove('show');
        setTimeout(() => notesDialog.remove(), 300);
      });
      
      document.getElementById('save-notes').addEventListener('click', () => {
        const noteContent = document.getElementById('note-content').value.trim();
        if (noteContent) {
          // Save the note
          chrome.storage.local.get(['stockNotes'], (result) => {
            const notes = result.stockNotes || {};
            notes[symbol] = {
              content: noteContent,
              timestamp: new Date().toISOString()
            };
            
            chrome.storage.local.set({ stockNotes: notes }, () => {
              notesDialog.classList.remove('show');
              setTimeout(() => notesDialog.remove(), 300);
              
              // This would sync with Supabase in a real implementation
              syncNoteToSupabase(symbol, noteContent);
              
              alert('Note saved successfully!');
            });
          });
        } else {
          alert('Please enter some content for your note.');
        }
      });
    });
    
    // Add API Key button
    document.getElementById('btn-add-api-keys').addEventListener('click', () => {
      showAPIKeysDialog();
    });
    
    // Open Platform button - open in new tab and close popup
    document.getElementById('open-platform').addEventListener('click', (e) => {
      e.preventDefault();
      
      const symbol = document.getElementById('stock-symbol').textContent;
      const url = symbol ? 
        `https://app.mizuchiai.com/stock/${symbol}` : 
        'https://app.mizuchiai.com';
      
      try {
        // Try both window.open and chrome.tabs.create for redundancy
        window.open(url, '_blank');
        
        chrome.tabs.create({url: url}, () => {
          if (chrome.runtime.lastError) {
            console.error("Error opening tab:", chrome.runtime.lastError);
          }
        });
      } catch (error) {
        console.error("Error opening platform:", error);
      }
      
      // Close the popup after a short delay
      setTimeout(() => window.close(), 100);
    });

    // Debug panel functionality
    const debugToggle = document.getElementById('debug-toggle');
    const debugPanel = document.getElementById('debug-panel');
    const refreshLogsBtn = document.getElementById('refresh-logs');
    const copyLogsBtn = document.getElementById('copy-logs');
    const closeDebugBtn = document.getElementById('close-debug');
    const extensionStatusEl = document.getElementById('extension-status');
    const debugLogsEl = document.getElementById('debug-logs');
    
    if (debugToggle) {
      // Toggle debug panel
      debugToggle.addEventListener('click', () => {
        debugPanel.classList.toggle('show');
        if (debugPanel.classList.contains('show')) {
          loadDebugInfo();
        }
      });
      
      // Close debug panel
      closeDebugBtn.addEventListener('click', () => {
        debugPanel.classList.remove('show');
      });
      
      // Refresh logs
      refreshLogsBtn.addEventListener('click', loadDebugInfo);
      
      // Copy logs to clipboard
      copyLogsBtn.addEventListener('click', () => {
        const logs = extensionStatusEl.textContent + '\n\n' + debugLogsEl.textContent;
        navigator.clipboard.writeText(logs)
          .then(() => {
            logDebug('Debug logs copied', 'To clipboard');
            alert('Debug logs copied to clipboard');
          })
          .catch(err => {
            logDebug('Failed to copy logs', err.message, true);
            console.error('Failed to copy logs:', err);
          });
      });
      
      // Add clear logs button functionality
      const clearLogsBtn = document.getElementById('clear-logs');
      if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to clear all debug logs?')) {
            chrome.runtime.sendMessage({action: "clearDebugLogs"}, (response) => {
              if (chrome.runtime.lastError) {
                logDebug('Failed to clear logs', chrome.runtime.lastError, true);
                return;
              }
              
              if (response && response.success) {
                debugLogsEl.innerHTML = 'Logs cleared';
                logDebug('Debug logs cleared', 'User initiated');
              }
            });
          }
        });
      }
    }
  }
  
  // Function to load and display debug information
  function loadDebugInfo() {
    logDebug('Loading debug info', 'Started');
    // Get extension status data
    chrome.storage.local.get(['dataStatus', 'symbolData', 'profileData', 'selectedCompany', 'dataLoaded', 'lastUpdate'], (result) => {
      // Format and display status
      const statusText = JSON.stringify(result, null, 2);
      document.getElementById('extension-status').textContent = statusText;
      
      // Get debug logs from background script
      chrome.runtime.sendMessage({action: "getDebugLogs"}, (response) => {
        if (chrome.runtime.lastError) {
          logDebug('Error fetching debug logs', chrome.runtime.lastError, true);
          document.getElementById('debug-logs').textContent = 'Error fetching logs: ' + chrome.runtime.lastError.message;
          return;
        }
        
        if (response && response.logs) {
          // Format and display logs
          const logsHtml = response.logs.map(log => {
            const timestamp = log.timestamp.substring(11, 19);
            const cssClass = log.isError ? 'log-error' : '';
            return `<div class="log-item ${cssClass}">
              <span class="log-timestamp">[${timestamp}]</span>
              <strong>${log.label}:</strong> ${log.data}
            </div>`;
          }).join('');
          
          document.getElementById('debug-logs').innerHTML = logsHtml || 'No logs available';
        } else {
          document.getElementById('debug-logs').textContent = 'No logs available';
        }
      });
    });
  }
  
  // Toggle watch status
  function toggleWatchStatus() {
    logDebug('Toggle watch status', 'Started');
    // Get the symbol from the button's data attribute
    const symbol = btnWatch.dataset.symbol;
    if (!symbol) return;
    
    chrome.storage.local.get(['watchlist'], (result) => {
      const watchlist = result.watchlist || [];
      
      let newWatchlist;
      const isCurrentlyWatched = watchlist.includes(symbol);
      
      if (isCurrentlyWatched) {
        // Remove from watchlist
        newWatchlist = watchlist.filter(item => item !== symbol);
        
        // This would sync with Supabase in a real implementation
        syncWatchlistToSupabase(symbol, false);
      } else {
        // Add to watchlist
        newWatchlist = [...watchlist, symbol];
        
        // This would sync with Supabase in a real implementation
        syncWatchlistToSupabase(symbol, true);
        
        // Show micro-interaction for adding to watchlist
        showWatchlistAddedFeedback();
      }
      
      // Update storage and button state
      chrome.storage.local.set({ watchlist: newWatchlist }, () => {
        updateWatchButtonState(newWatchlist.includes(symbol), symbol);
      });
    });
  }
  
  // Supabase integration for syncing watchlist and notes data
  
  // Sync watchlist items to Supabase
  async function syncWatchlistToSupabase(symbol, addToWatchlist = true) {
    if (!window.supabaseClient) {
      console.error('Supabase client not initialized');
      return;
    }
    
    try {
      // Call the supabase client function
      await window.supabaseClient.syncWatchlistToSupabase(symbol, addToWatchlist);
      logDebug('Supabase sync', `${addToWatchlist ? 'Added' : 'Removed'} ${symbol} ${addToWatchlist ? 'to' : 'from'} watchlist in Supabase`);
    } catch (error) {
      console.error('Error syncing watchlist to Supabase:', error);
      logDebug('Supabase error', `Failed to sync watchlist for ${symbol}: ${error.message}`);
    }
  }
  
  // Sync notes to Supabase
  async function syncNoteToSupabase(symbol, noteContent) {
    if (!window.supabaseClient) {
      console.error('Supabase client not initialized');
      return;
    }
    
    try {
      // Call the supabase client function
      await window.supabaseClient.syncNoteToSupabase(symbol, noteContent);
      logDebug('Supabase sync', `Saved note for ${symbol} to Supabase`);
    } catch (error) {
      console.error('Error syncing note to Supabase:', error);
      logDebug('Supabase error', `Failed to sync note for ${symbol}: ${error.message}`);
    }
  }
  
  // Initialize Supabase and sync data
  async function initializeSupabaseSync() {
    if (!window.supabaseClient) {
      console.error('Supabase client not available');
      return;
    }
    
    try {
      // Initialize Supabase client
      window.supabaseClient.initSupabase();
      
      // Check if user is logged in
      const session = await window.supabaseClient.getSession();
      
      if (session) {
        currentUser = session.user;
        logDebug('Supabase auth', `User logged in: ${session.user.email}`);
        
        // Sync local data with Supabase
        const syncResult = await window.supabaseClient.syncLocalDataWithSupabase();
        logDebug('Supabase sync', `Data sync ${syncResult ? 'successful' : 'failed'}`);
        
        // Update UI to show logged-in state
        updateAuthUI(true);
      } else {
        currentUser = null;
        logDebug('Supabase auth', 'User not logged in');
        updateAuthUI(false);
      }
    } catch (error) {
      console.error('Error initializing Supabase:', error);
      logDebug('Supabase error', `Initialization failed: ${error.message}`);
      updateAuthUI(false);
    }
  }
  
  // Set up authentication event listeners
  function setupAuthEventListeners() {
    // Initialize the auth form mode
    updateAuthFormMode();
    // Sign in button
    const btnSignIn = document.getElementById('btn-signin');
    if (btnSignIn) {
      btnSignIn.addEventListener('click', handleSignIn);
    }
    
    // Sign up button
    const btnSignUp = document.getElementById('btn-signup');
    if (btnSignUp) {
      btnSignUp.addEventListener('click', handleSignUp);
    }
    
    // Toggle between sign in and sign up modes
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    if (toggleAuthMode) {
      toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        updateAuthFormMode();
      });
    }
    
    // User profile menu toggle
    const userProfile = document.getElementById('user-profile');
    if (userProfile) {
      userProfile.addEventListener('click', toggleUserMenu);
    }
    
    // Menu items
    const menuAccount = document.getElementById('menu-account');
    if (menuAccount) {
      menuAccount.addEventListener('click', showAccountSettings);
    }
    
    const menuSync = document.getElementById('menu-sync');
    if (menuSync) {
      menuSync.addEventListener('click', syncDataManually);
    }
    
    const menuSignout = document.getElementById('menu-signout');
    if (menuSignout) {
      menuSignout.addEventListener('click', handleSignOut);
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      const userMenu = document.getElementById('user-menu');
      const userProfile = document.getElementById('user-profile');
      
      if (userMenu && userMenu.classList.contains('show') && 
          !userProfile.contains(e.target)) {
        userMenu.classList.remove('show');
      }
    });
  }
  
  // Update the UI based on authentication state
  function updateAuthUI(isAuthenticated) {
    const authSection = document.getElementById('auth-section');
    const stockInfo = document.getElementById('stock-info');
    const userAvatar = document.getElementById('user-avatar');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (isAuthenticated && currentUser) {
      // Hide auth section
      if (authSection) {
        authSection.classList.remove('show');
      }
      
      // Show stock info if available
      if (stockInfo) {
        stockInfo.classList.add('visible');
      }
      
      // Update user avatar with first letter of email
      if (userAvatar && currentUser.email) {
        userAvatar.textContent = currentUser.email.charAt(0).toUpperCase();
      }
      
      // Hide loading indicator if visible
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    } else {
      // Check if we need to show auth section
      chrome.storage.local.get(['selectedCompany'], (result) => {
        if (!result.selectedCompany) {
          // No company selected, show auth section
          if (authSection) {
            authSection.classList.add('show');
          }
          
          // Hide stock info
          if (stockInfo) {
            stockInfo.classList.remove('visible');
          }
          
          // Hide loading indicator
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        } else {
          // Company selected, proceed with showing stock info
          if (stockInfo) {
            stockInfo.classList.add('visible');
          }
        }
      });
      
      // Reset user avatar
      if (userAvatar) {
        userAvatar.textContent = '?';
      }
    }
  }
  
  // Update the auth form based on the current mode (sign in or sign up)
  function updateAuthFormMode() {
    const btnSignIn = document.getElementById('btn-signin');
    const btnSignUp = document.getElementById('btn-signup');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    const authHeader = document.querySelector('.auth-header h2');
    
    if (isSignupMode) {
      // Switch to sign up mode
      if (btnSignIn) btnSignIn.style.display = 'none';
      if (btnSignUp) btnSignUp.style.display = 'block';
      if (toggleAuthMode) toggleAuthMode.textContent = 'Already have an account? Sign in';
      if (authHeader) authHeader.textContent = 'Create an account';
    } else {
      // Switch to sign in mode
      if (btnSignIn) btnSignIn.style.display = 'block';
      if (btnSignUp) btnSignUp.style.display = 'none';
      if (toggleAuthMode) toggleAuthMode.textContent = 'Create an account instead';
      if (authHeader) authHeader.textContent = 'Sign in to MizuchiAI';
    }
    
    // Clear any previous messages
    const authMessage = document.getElementById('auth-message');
    if (authMessage) {
      authMessage.textContent = '';
      authMessage.classList.remove('success');
    }
  }
  
  // Handle sign in button click
  async function handleSignIn() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const authMessage = document.getElementById('auth-message');
    
    // Basic validation
    if (!email || !password) {
      if (authMessage) {
        authMessage.textContent = 'Please enter both email and password';
      }
      return;
    }
    
    try {
      // Show loading state
      const btnSignIn = document.getElementById('btn-signin');
      if (btnSignIn) {
        btnSignIn.textContent = 'Signing in...';
        btnSignIn.disabled = true;
      }
      
      // Attempt to sign in
      const { user, error } = await window.supabaseClient.signInWithEmail(email, password);
      
      if (error) {
        throw new Error(error);
      }
      
      if (user) {
        // Success
        currentUser = user;
        logDebug('Auth success', `Signed in as ${email}`);
        
        if (authMessage) {
          authMessage.textContent = 'Sign in successful!';
          authMessage.classList.add('success');
        }
        
        // Sync data and update UI
        await window.supabaseClient.syncLocalDataWithSupabase();
        updateAuthUI(true);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      logDebug('Auth error', error.message, true);
      
      if (authMessage) {
        authMessage.textContent = `Sign in failed: ${error.message}`;
        authMessage.classList.remove('success');
      }
    } finally {
      // Reset button state
      const btnSignIn = document.getElementById('btn-signin');
      if (btnSignIn) {
        btnSignIn.textContent = 'Sign In';
        btnSignIn.disabled = false;
      }
    }
  }
  
  // Handle sign up button click
  async function handleSignUp() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const authMessage = document.getElementById('auth-message');
    
    // Basic validation
    if (!email || !password) {
      if (authMessage) {
        authMessage.textContent = 'Please enter both email and password';
      }
      return;
    }
    
    if (password.length < 6) {
      if (authMessage) {
        authMessage.textContent = 'Password must be at least 6 characters';
      }
      return;
    }
    
    try {
      // Show loading state
      const btnSignUp = document.getElementById('btn-signup');
      if (btnSignUp) {
        btnSignUp.textContent = 'Signing up...';
        btnSignUp.disabled = true;
      }
      
      // Attempt to sign up
      const { user, session, error } = await window.supabaseClient.signUpWithEmail(email, password);
      
      if (error) {
        throw new Error(error);
      }
      
      if (user) {
        // Success
        logDebug('Auth success', `Signed up as ${email}`);
        
        if (authMessage) {
          if (session) {
            // Auto-confirmed, user is signed in
            currentUser = user;
            authMessage.textContent = 'Account created and signed in!';
            authMessage.classList.add('success');
            
            // Sync data and update UI
            await window.supabaseClient.syncLocalDataWithSupabase();
            updateAuthUI(true);
          } else {
            // Email confirmation required
            authMessage.textContent = 'Please check your email to confirm your account';
            authMessage.classList.add('success');
          }
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      logDebug('Auth error', error.message, true);
      
      if (authMessage) {
        authMessage.textContent = `Sign up failed: ${error.message}`;
        authMessage.classList.remove('success');
      }
    } finally {
      // Reset button state
      const btnSignUp = document.getElementById('btn-signup');
      if (btnSignUp) {
        btnSignUp.textContent = 'Sign Up';
        btnSignUp.disabled = false;
      }
    }
  }
  
  // Handle sign out
  async function handleSignOut() {
    try {
      const { success, error } = await window.supabaseClient.signOut();
      
      if (error) {
        throw new Error(error);
      }
      
      if (success) {
        currentUser = null;
        logDebug('Auth success', 'Signed out');
        
        // Update UI
        updateAuthUI(false);
        
        // Close user menu
        const userMenu = document.getElementById('user-menu');
        if (userMenu) {
          userMenu.classList.remove('show');
        }
      }
    } catch (error) {
      console.error('Sign out error:', error);
      logDebug('Auth error', error.message, true);
    }
  }
  
  // Toggle user menu
  function toggleUserMenu(e) {
    e.stopPropagation();
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.classList.toggle('show');
    }
  }
  
  // Show account settings
  function showAccountSettings() {
    // For now, just show a simple alert
    alert(`Account: ${currentUser ? currentUser.email : 'Not signed in'}`);
    
    // Close user menu
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.classList.remove('show');
    }
  }
  
  // Manually sync data with Supabase
  async function syncDataManually() {
    if (!currentUser) {
      alert('Please sign in to sync data');
      return;
    }
    
    try {
      // Show sync indicator
      alert('Syncing data...');
      
      // Perform sync
      const syncResult = await window.supabaseClient.syncLocalDataWithSupabase();
      
      if (syncResult) {
        alert('Data synced successfully!');
        logDebug('Manual sync', 'Successful');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      logDebug('Sync error', error.message, true);
      alert(`Sync failed: ${error.message}`);
    } finally {
      // Close user menu
      const userMenu = document.getElementById('user-menu');
      if (userMenu) {
        userMenu.classList.remove('show');
      }
    }
  }
  
  // Show micro-interaction when item is added to watchlist
  function showWatchlistAddedFeedback() {
    const button = btnWatch;
    
    // Add pulse animation class
    button.classList.add('pulse-animation');
    
    // Show checkmark icon temporarily
    const originalText = button.innerHTML;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Added!
    `;
    
    // Reset after animation
    setTimeout(() => {
      button.classList.remove('pulse-animation');
      button.innerHTML = originalText;
    }, 1500);
  }
  
  // Update watch button state
  function updateWatchButtonState(isWatching, symbol) {
    if (isWatching) {
      btnWatch.textContent = 'Watching';
      btnWatch.classList.add('watching');
    } else {
      btnWatch.textContent = 'Watch';
      btnWatch.classList.remove('watching');
    }
    
    // Store current symbol for the toggle function
    btnWatch.dataset.symbol = symbol || '';
  }
  
  // Helper function: Format market cap
  function formatMarketCap(value) {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  }
  
  // Helper function: Format large numbers
  function formatLargeNumber(value) {
    if (value >= 1e12) {
      return `${(value / 1e12).toFixed(1)}T`;
    } else if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else {
      return value.toString();
    }
  }
  
  // Helper function: Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  }
  
  // Create peers tab content
  function createPeersTab(peers) {
    const peersTab = document.querySelector('.tab-btn[data-tab="peers"]');
    if (!peersTab) {
      // Create the tab button if it doesn't exist
      const tabsContainer = document.querySelector('.tabs');
      if (tabsContainer) {
        const newTab = document.createElement('button');
        newTab.className = 'tab-btn';
        newTab.textContent = 'Competitors';
        newTab.dataset.tab = 'peers';
        tabsContainer.appendChild(newTab);
        
        // Add event listener
        newTab.addEventListener('click', () => {
          document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
          document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
          newTab.classList.add('active');
          document.getElementById('peers').classList.add('active');
        });
      }
      
      // We don't need to create a tab pane as it already exists in HTML
      // Just ensure we're targeting the right element
    }
    
    // Populate peers data
    const peersPane = document.getElementById('peers');
    if (peersPane && peers && peers.length > 0) {
      // Get AI analysis of competitors
      const symbol = document.getElementById('stock-symbol').textContent;
      const companyName = document.getElementById('company-name').textContent;
      
      // Create a competitor names string
      const competitorNames = peers.map(peer => peer.name || peer.symbol).join(', ');
      
      // Generate competitors summary with Mistral
      generateCompetitorsSummary(symbol, companyName, competitorNames)
        .then(summary => {
          peersPane.innerHTML = `<h3>Competitors</h3>
                                <div class="competitors-summary">${summary}</div>`;
          
          const peersList = document.createElement('ul');
          peersList.className = 'peers-list';
          
          peers.forEach(peer => {
            const li = document.createElement('li');
            li.className = 'peer-item clickable';
            
            // Make peer clickable
            li.onclick = () => {
              chrome.runtime.sendMessage({
                action: "searchCompany",
                companyName: peer.name || peer.symbol
              });
            };
            
            // Format change with color
            const changeClass = !peer.changes ? 'neutral' : 
                              peer.changes > 0 ? 'positive' : 'negative';
            const changeText = peer.changes ? 
              `${peer.changes > 0 ? '+' : ''}${Number(peer.changes).toFixed(2)}%` : 'N/A';
            
            li.innerHTML = `
              <div class="peer-main">
                <span class="peer-symbol">${peer.symbol}</span>
                <span class="peer-name">${peer.name || ''}</span>
              </div>
              <div class="peer-data">
                <span class="peer-price">${peer.price ? '$' + Number(peer.price).toFixed(2) : 'N/A'}</span>
                <span class="peer-change ${changeClass}">${changeText}</span>
              </div>
            `;
            
            peersList.appendChild(li);
          });
          
          peersPane.appendChild(peersList);
        })
        .catch(error => {
          console.error('Error generating competitors summary:', error);
          
          // Fallback to regular display without AI summary
          peersPane.innerHTML = '<h3>Competitors</h3>';
          const peersList = document.createElement('ul');
          peersList.className = 'peers-list';
          
          peers.forEach(peer => {
            const li = document.createElement('li');
            li.className = 'peer-item clickable';
            
            // Make peer clickable
            li.onclick = () => {
              chrome.runtime.sendMessage({
                action: "searchCompany",
                companyName: peer.name || peer.symbol
              });
            };
            
            // Format change with color
            const changeClass = !peer.changes ? 'neutral' : 
                              peer.changes > 0 ? 'positive' : 'negative';
            const changeText = peer.changes ? 
              `${peer.changes > 0 ? '+' : ''}${Number(peer.changes).toFixed(2)}%` : 'N/A';
            
            li.innerHTML = `
              <div class="peer-main">
                <span class="peer-symbol">${peer.symbol}</span>
                <span class="peer-name">${peer.name || ''}</span>
              </div>
              <div class="peer-data">
                <span class="peer-price">${peer.price ? '$' + Number(peer.price).toFixed(2) : 'N/A'}</span>
                <span class="peer-change ${changeClass}">${changeText}</span>
              </div>
            `;
            
            peersList.appendChild(li);
          });
          
          peersPane.appendChild(peersList);
        });
    } else if (peersPane) {
      peersPane.innerHTML = '<h3>Competitors</h3><p class="empty-message">No competitor data available.</p>';
    }
  }
  
  // Generate AI summary for competitors
  async function generateCompetitorsSummary(symbol, companyName, competitors) {
    try {
      // Default response if there's an issue
      const defaultSummary = "Competitors listed below are key players in the same industry.";
      
      if (!competitors) return defaultSummary;
      
      // Get Mistral API key from storage
      let mistralApiKey = "";
      try {
        const apiKeysResult = await new Promise(resolve => {
          chrome.storage.local.get(['apiKeys'], resolve);
        });
        
        // Check if we have a custom API key
        if (apiKeysResult.apiKeys?.mistral) {
          mistralApiKey = apiKeysResult.apiKeys.mistral;
        } else {
          // Use the default key from background.js (won't work if rate limited)
          console.warn('No custom Mistral API key found in storage, competitors summary may be unavailable');
          // Skip API call and return default message
          return defaultSummary;
        }
      } catch (keyError) {
        console.error('Error retrieving Mistral API key:', keyError);
        return defaultSummary;
      }
      
      if (!mistralApiKey) {
        console.error('Error generating competitors summary: Mistral API key is not available');
        return defaultSummary;
      }
      
      // Use Mistral API to generate a one-liner about competitors
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralApiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst. Provide a ONE SENTENCE analysis of a company\'s competition.'
            },
            {
              role: 'user',
              content: `Write ONE SENTENCE describing the competitive landscape for ${companyName} (${symbol}) in relation to these competitors: ${competitors}. Be concise and insightful.`
            }
          ],
          max_tokens: 100
        })
      });
      
      if (!response.ok) {
        const errorStatus = response.status;
        console.error(`Mistral API returned status: ${errorStatus}`);
        
        if (errorStatus === 401) {
          console.error('Mistral API key is invalid or expired');
        } else if (errorStatus === 429) {
          console.error('Mistral API rate limit exceeded');
        }
        
        return defaultSummary;
      }
      
      const data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      
      return defaultSummary;
    } catch (error) {
      console.error('Error generating competitors summary:', error);
      return "Competitors listed below are key players in the same industry.";
    }
  }
  
  // No longer needed - SEC filings tab has been removed
});

// Add styles for the SEC filings and competitors summaries
const style = document.createElement('style');
style.textContent = `
  .filings-summary, .competitors-summary {
    font-size: 13px;
    color: var(--text-medium);
    margin-bottom: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--bg-light);
    border-radius: var(--radius-sm);
    line-height: 1.4;
  }
  
  .filings-list, .peers-list {
    list-style-type: none;
  }
  
  .filing-item {
    padding: 8px 0;
    border-bottom: 1px solid var(--border-light);
  }
  
  .filing-item.clickable {
    cursor: pointer;
  }
  
  .filing-item.clickable:hover {
    background-color: var(--bg-light);
  }
  
  .filing-form {
    font-weight: 600;
    font-size: 13px;
  }
  
  .filing-date, .filing-desc {
    font-size: 12px;
    color: var(--text-light);
  }
`;

document.head.appendChild(style);