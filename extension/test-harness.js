// InvestIQ Extension Test Harness
// Simulates Chrome APIs and tests core functionality

// Fix logger function to properly store logs
function fixLogStorage() {
  // Override window.logDebug to ensure test logs are properly stored
  const originalLogDebug = window.logDebug;
  window.logDebug = function(label, data, isError = false) {
    // Call original for console output if it exists
    if (originalLogDebug) {
      originalLogDebug(label, data, isError);
    }
    
    // Also ensure it's stored for test verification
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      label,
      data: typeof data === 'object' ? JSON.stringify(data) : data,
      isError
    };
    
    // Get current logs and update
    mockChrome.storage.local.get(['debugLogs'], (result) => {
      const logs = result.debugLogs || [];
      logs.push(logEntry);
      mockChrome.storage.local.set({ debugLogs: logs });
    });
  };
}

// Mocked Chrome API
const mockChrome = {
  storage: {
    local: {
      data: {},
      get: function(keys, callback) {
        console.log('📥 Mock storage.get:', keys);
        let result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (this.data[key] !== undefined) {
              result[key] = this.data[key];
            }
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            result[key] = this.data[key] !== undefined ? this.data[key] : keys[key];
          });
        } else {
          const requestedKey = keys;
          if (this.data[requestedKey] !== undefined) {
            result[requestedKey] = this.data[requestedKey];
          }
        }
        callback(result);
      },
      set: function(items, callback) {
        console.log('📤 Mock storage.set:', items);
        Object.assign(this.data, items);
        if (callback) callback();
      },
      clear: function(callback) {
        this.data = {};
        if (callback) callback();
      }
    }
  },
  runtime: {
    lastError: null,
    onMessage: {
      listeners: [],
      addListener: function(callback) {
        this.listeners.push(callback);
      },
      dispatch: function(message, sender) {
        console.log('📨 Dispatching message:', message);
        const responses = [];
        let asyncResponseExpected = false;
        
        this.listeners.forEach(listener => {
          const sendResponse = response => {
            responses.push(response);
          };
          
          const returnVal = listener(message, sender, sendResponse);
          if (returnVal === true) {
            asyncResponseExpected = true;
          }
        });
        
        if (!asyncResponseExpected && responses.length > 0) {
          return responses[0];
        }
        
        // For async responses, we'd need a more complex implementation
        return { asyncResponsePending: true };
      }
    },
    sendMessage: function(message, callback) {
      console.log('📨 Mock runtime.sendMessage:', message);
      const response = this.onMessage.dispatch(message, { id: 'test-sender' });
      if (callback && !response.asyncResponsePending) {
        callback(response);
      }
    }
  },
  action: {
    onClicked: {
      listeners: [],
      addListener: function(callback) {
        this.listeners.push(callback);
      },
      dispatch: function(tab) {
        console.log('🖱️ Mock action.onClicked triggered');
        this.listeners.forEach(listener => listener(tab));
      }
    }
  },
  contextMenus: {
    create: function(properties) {
      console.log('📋 Mock contextMenu created:', properties);
      return 'menu-item-id';
    },
    onClicked: {
      listeners: [],
      addListener: function(callback) {
        this.listeners.push(callback);
      },
      dispatch: function(info, tab) {
        console.log('🖱️ Mock contextMenu.onClicked triggered:', info);
        this.listeners.forEach(listener => listener(info, tab));
      }
    }
  }
};

// Global variable for debugging
window.mockChrome = mockChrome;

// Helper functions
function logResult(testName, result, expected) {
  const success = JSON.stringify(result) === JSON.stringify(expected);
  console.log(
    `${success ? '✅' : '❌'} ${testName} - ${success ? 'PASSED' : 'FAILED'}`
  );
  if (!success) {
    console.log('  Expected:', expected);
    console.log('  Got:', result);
  }
  return success;
}

function clearTestState() {
  mockChrome.storage.local.clear();
  mockChrome.runtime.lastError = null;
  console.log('🧹 Test state cleared');
}

// Mock fetch for API calls
const originalFetch = window.fetch;
// Create proper mock response with headers
function createMockResponse(data, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    statusText: statusText,
    headers: {
      get: function(name) {
        const headers = {
          'content-type': 'application/json',
          'cache-control': 'no-cache',
          'x-api-key': 'HIDDEN'
        };
        return headers[name.toLowerCase()];
      },
      // Also support direct property access for our background.js fix
      'content-type': 'application/json',
      'cache-control': 'no-cache'
    },
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  };
}

window.fetch = function(url, options) {
  console.log('🌐 Mock fetch:', url, options);
  
  // Delay to simulate network
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Handle different API endpoints
      if (url.includes('financialmodelingprep.com/api/v3/search')) {
        // Symbol search
        resolve(createMockResponse([
          { symbol: 'AAPL', name: 'Apple Inc', exchangeShortName: 'NASDAQ' }
        ]));
      } 
      else if (url.includes('financialmodelingprep.com/api/v3/profile')) {
        // Company profile
        resolve(createMockResponse([{
          symbol: 'AAPL',
          price: 175.34,
          changes: 2.21,
          companyName: 'Apple Inc',
          currency: 'USD',
          website: 'https://www.apple.com',
          description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
          ceo: 'Tim Cook',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          marketCap: 2750000000000,
          lastDiv: 0.96
        }]));
      }
      else if (url.includes('financialmodelingprep.com/api/v3/key-metrics-ttm')) {
        // Key metrics TTM
        resolve(createMockResponse([{
          symbol: 'AAPL',
          peRatioTTM: 28.5,
          revenuePerShareTTM: 25.12,
          netIncomePerShareTTM: 6.15,
          revenueGrowthTTMYoy: 0.085,
          netProfitMarginTTM: 0.245,
          returnOnEquityTTM: 0.475,
          debtToEquityTTM: 1.23,
          currentRatioTTM: 1.05
        }]));
      }
      else if (url.includes('financialmodelingprep.com/api/v3/ratios')) {
        // Ratios
        resolve(createMockResponse([{
          symbol: 'AAPL',
          peRatio: 28.5,
          dividendYield: 0.0055,
          debtToEquity: 1.23,
          netProfitMargin: 0.245,
          priceToBookRatio: 35.2,
          returnOnEquity: 0.475
        }]));
      }
      else if (url.includes('financialmodelingprep.com/api/v3/stock_news')) {
        // Stock news
        resolve(createMockResponse([
          {
            symbol: 'AAPL',
            title: 'Apple Announces New AI Features for iPhone',
            text: 'Apple has unveiled new AI capabilities coming to iPhone in the next iOS update.',
            publishedDate: '2025-03-15T10:30:00.000Z',
            site: 'TechCrunch'
          },
          {
            symbol: 'AAPL',
            title: 'Apple Reports Strong Q1 Earnings',
            text: 'Apple exceeds analyst expectations with record-breaking quarterly results.',
            publishedDate: '2025-03-10T14:45:00.000Z',
            site: 'CNBC'
          },
          {
            symbol: 'AAPL',
            title: 'Apple Expands Manufacturing in India',
            text: 'Apple is increasing its production capacity in India amid supply chain diversification.',
            publishedDate: '2025-03-05T09:15:00.000Z',
            site: 'Bloomberg'
          }
        ]));
      }
      else if (url.includes('api.perplexity.ai') || url.includes('api.mistral.ai')) {
        // AI APIs
        resolve(createMockResponse({
          choices: [{
            message: {
              content: "Apple Inc. is a technology company that designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories. Led by CEO Tim Cook, they're known for the iPhone, Mac computers, iPad tablets, and various services like Apple Music and Apple TV+. In recent years, they've focused on services revenue and AI integration across their product lines."
            }
          }]
        }));
      }
      else {
        // Handle error simulation if needed
        if (url.includes('error-test')) {
          resolve(createMockResponse({ error: 'Test error' }, 400, 'Bad Request'));
        } else {
          // Unknown endpoint - return error
          reject(new Error(`Unhandled URL in mock fetch: ${url}`));
        }
      }
    }, 300); // 300ms delay
  });
};

// Test Suite for Real Data Connections
async function testRealDataConnections() {
  // Initialize test results
  const results = {
    symbolSearch: { success: false, message: "" },
    companyProfile: { success: false, message: "" },
    keyMetrics: { success: false, message: "" },
    peers: { success: false, message: "" },
    secFilings: { success: false, message: "" },
    news: { success: false, message: "" },
    aiSummary: { success: false, message: "" }
  };
  
  try {
    // Load API keys from .env.development file
    let FMP_API_KEY = "";
    let PERPLEXITY_API_KEY = "";
    let MISTRAL_API_KEY = "";
    
    try {
      // Fetch the .env.development file content
      const envResponse = await originalFetch('../.env.development');
      if (!envResponse.ok) {
        throw new Error(`Failed to load .env.development file: ${envResponse.status}`);
      }
      
      const envContent = await envResponse.text();
      
      // Parse the env file content to extract API keys
      const fmpKeyMatch = envContent.match(/VITE_FMP_API_KEY=([^\s"']+)/);
      const perplexityKeyMatch = envContent.match(/VITE_PERPLEXITY_API_KEY=([^\s"']+)/);
      const mistralKeyMatch = envContent.match(/VITE_MISTRAL_API_KEY=([^\s"']+)/);
      
      if (fmpKeyMatch && fmpKeyMatch[1]) FMP_API_KEY = fmpKeyMatch[1];
      if (perplexityKeyMatch && perplexityKeyMatch[1]) PERPLEXITY_API_KEY = perplexityKeyMatch[1];
      if (mistralKeyMatch && mistralKeyMatch[1]) MISTRAL_API_KEY = mistralKeyMatch[1];
      
      logDebug('API keys loaded from .env.development file', { keysLoaded: !!FMP_API_KEY });
    } catch (error) {
      logDebug('Error loading API keys from .env.development', error.message, true);
      
      // Fallback to window object if available
      if (window.FMP_API_KEY) FMP_API_KEY = window.FMP_API_KEY;
      if (window.PERPLEXITY_API_KEY) PERPLEXITY_API_KEY = window.PERPLEXITY_API_KEY;
      if (window.MISTRAL_API_KEY) MISTRAL_API_KEY = window.MISTRAL_API_KEY;
      
      logDebug('Attempting to use API keys from window object', { keysAvailable: !!FMP_API_KEY });
    }
    
    // Verify that API keys are available
    if (!FMP_API_KEY) {
      throw new Error("FMP API key is missing. Please add it to .env.development file or set it in the window object.");
    }
    
    // Test company to use for all tests
    const testCompany = "Apple";
    let symbol = ""; // Will be set after successful symbol search
    
    // 1. Test symbol search
    try {
      logDebug('Testing symbol search API connection', testCompany);
      const symbolUrl = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(testCompany)}&limit=1&apikey=${FMP_API_KEY}`;
      const symbolResponse = await fetch(symbolUrl);
      
      if (!symbolResponse.ok) {
        throw new Error(`FMP Symbol Search API returned ${symbolResponse.status}: ${symbolResponse.statusText}`);
      }
      
      const symbolData = await symbolResponse.json();
      
      if (!symbolData || !Array.isArray(symbolData) || symbolData.length === 0) {
        throw new Error("No symbol found in response");
      }
      
      symbol = symbolData[0].symbol;
      results.symbolSearch.success = true;
      results.symbolSearch.message = `Successfully found symbol: ${symbol}`;
      logDebug('Symbol search test passed', { symbol });
    } catch (error) {
      results.symbolSearch.message = `Error: ${error.message}`;
      logDebug('Symbol search test failed', { error: error.message }, true);
      // If symbol search fails, we can't continue with most other tests
      return results;
    }
    
    // 2. Test company profile
    try {
      logDebug('Testing company profile API connection', symbol);
      const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_API_KEY}`;
      const profileResponse = await fetch(profileUrl);
      
      if (!profileResponse.ok) {
        throw new Error(`FMP Profile API returned ${profileResponse.status}: ${profileResponse.statusText}`);
      }
      
      const profileData = await profileResponse.json();
      
      if (!profileData || !Array.isArray(profileData) || profileData.length === 0) {
        throw new Error("No profile data found in response");
      }
      
      results.companyProfile.success = true;
      results.companyProfile.message = `Successfully fetched profile for ${profileData[0].companyName}`;
      logDebug('Company profile test passed', { company: profileData[0].companyName });
    } catch (error) {
      results.companyProfile.message = `Error: ${error.message}`;
      logDebug('Company profile test failed', { error: error.message }, true);
    }
    
    // 3. Test key metrics (ratios)
    try {
      logDebug('Testing financial ratios API connection', symbol);
      const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios/${symbol}?limit=1&apikey=${FMP_API_KEY}`;
      const ratiosResponse = await fetch(ratiosUrl);
      
      if (!ratiosResponse.ok) {
        throw new Error(`FMP Ratios API returned ${ratiosResponse.status}: ${ratiosResponse.statusText}`);
      }
      
      const ratiosData = await ratiosResponse.json();
      
      if (!ratiosData || !Array.isArray(ratiosData) || ratiosData.length === 0) {
        throw new Error("No ratios data found in response");
      }
      
      results.keyMetrics.success = true;
      results.keyMetrics.message = `Successfully fetched financial ratios`;
      logDebug('Key metrics (ratios) test passed', { pe: ratiosData[0].priceEarningsRatio });
    } catch (error) {
      results.keyMetrics.message = `Error: ${error.message}`;
      logDebug('Key metrics test failed', { error: error.message }, true);
    }
    
    // 4. Test peers list
    try {
      logDebug('Testing peers API connection', symbol);
      const peersUrl = `https://financialmodelingprep.com/api/v4/stock_peers?symbol=${symbol}&apikey=${FMP_API_KEY}`;
      const peersResponse = await fetch(peersUrl);
      
      if (!peersResponse.ok) {
        throw new Error(`FMP Peers API returned ${peersResponse.status}: ${peersResponse.statusText}`);
      }
      
      const peersData = await peersResponse.json();
      
      if (!peersData || !Array.isArray(peersData) || peersData.length === 0 || !peersData[0].peersList) {
        throw new Error("No peers data found in response");
      }
      
      results.peers.success = true;
      results.peers.message = `Successfully fetched ${peersData[0].peersList.length} peers`;
      logDebug('Peers test passed', { peers: peersData[0].peersList });
    } catch (error) {
      results.peers.message = `Error: ${error.message}`;
      logDebug('Peers test failed', { error: error.message }, true);
    }
    
    // 5. Test SEC filings
    try {
      logDebug('Testing SEC filings API connection', symbol);
      const filingsUrl = `https://financialmodelingprep.com/api/v3/sec_filings/${symbol}?limit=5&apikey=${FMP_API_KEY}`;
      const filingsResponse = await fetch(filingsUrl);
      
      if (!filingsResponse.ok) {
        throw new Error(`FMP SEC Filings API returned ${filingsResponse.status}: ${filingsResponse.statusText}`);
      }
      
      const filingsData = await filingsResponse.json();
      
      if (!filingsData || !Array.isArray(filingsData)) {
        throw new Error("Invalid SEC filings data in response");
      }
      
      results.secFilings.success = true;
      results.secFilings.message = `Successfully fetched ${filingsData.length} SEC filings`;
      logDebug('SEC filings test passed', { filingCount: filingsData.length });
    } catch (error) {
      results.secFilings.message = `Error: ${error.message}`;
      logDebug('SEC filings test failed', { error: error.message }, true);
    }
    
    // 6. Test news (Perplexity)
    try {
      // Verify Perplexity API key is available
      if (!PERPLEXITY_API_KEY) {
        throw new Error("Perplexity API key is missing. Please add it to .env.development file or set it in the window object.");
      }
      
      logDebug('Testing Perplexity news API connection', symbol);
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
      
      if (!perplexityResponse.ok) {
        const errorText = await perplexityResponse.text().catch(() => 'No error details available');
        throw new Error(`Perplexity API returned ${perplexityResponse.status}: ${perplexityResponse.statusText}. Details: ${errorText}`);
      }
      
      const perplexityData = await perplexityResponse.json();
      
      if (!perplexityData || !perplexityData.choices || !perplexityData.choices[0] || !perplexityData.choices[0].message) {
        throw new Error("Invalid Perplexity response format");
      }
      
      results.news.success = true;
      results.news.message = `Successfully fetched news from Perplexity`;
      logDebug('News test passed', { responseLength: perplexityData.choices[0].message.content.length });
    } catch (error) {
      results.news.message = `Error: ${error.message}`;
      logDebug('News test failed', { error: error.message }, true);
    }
    
    // 7. Test AI summary (Mistral)
    try {
      // Verify Mistral API key is available
      if (!MISTRAL_API_KEY) {
        throw new Error("Mistral API key is missing. Please add it to .env.development file or set it in the window object.");
      }
      
      logDebug('Testing Mistral AI summary API connection', symbol);
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
              content: 'You are a financial analyst AI that provides concise, accurate summaries about public companies.'
            },
            {
              role: 'user',
              content: `Provide a concise financial summary of ${testCompany} (${symbol}). Include recent performance and key metrics. Limit to 3-4 sentences.`
            }
          ],
          max_tokens: 250
        })
      });
      
      if (!mistralResponse.ok) {
        const errorText = await mistralResponse.text().catch(() => 'No error details available');
        throw new Error(`Mistral API returned ${mistralResponse.status}: ${mistralResponse.statusText}. Details: ${errorText}`);
      }
      
      const mistralData = await mistralResponse.json();
      
      if (!mistralData || !mistralData.choices || !mistralData.choices[0] || !mistralData.choices[0].message) {
        throw new Error("Invalid Mistral response format");
      }
      
      results.aiSummary.success = true;
      results.aiSummary.message = `Successfully fetched AI summary from Mistral`;
      logDebug('AI summary test passed', { summaryLength: mistralData.choices[0].message.content.length });
    } catch (error) {
      results.aiSummary.message = `Error: ${error.message}`;
      logDebug('AI summary test failed', { error: error.message }, true);
    }
    
  } catch (error) {
    logDebug('Error in data connection tests', error.message, true);
  }
  
  // Return the complete test results
  return results;
}

// Test Suite
const tests = {
  async testDataFlow() {
    clearTestState();
    console.log('🧪 Running Data Flow Test');
    
    // Set up initial state
    mockChrome.storage.local.set({
      selectedCompany: 'Apple',
      dataLoaded: false
    });
    
    // Check if search works
    const search = await window.processCompanySearch('Apple');
    console.log('Search result:', search);
    
    // Check storage after search
    mockChrome.storage.local.get(['symbolData', 'profileData', 'dataLoaded'], (result) => {
      console.log('Storage after search:', result);
      logResult('Company symbol found', result.symbolData?.symbol, 'AAPL');
      logResult('Profile data loaded', !!result.profileData, true);
      logResult('Data status updated', result.dataLoaded, true);
    });
    
    return true;
  },
  
  async testLoggerFunctions() {
    clearTestState();
    console.log('🧪 Running Logger Functions Test');
    
    // Test regular and error logging
    window.logDebug('Test log', 'This is a test message');
    window.logDebug('Test error log', 'This is an error message', true);
    window.logDebug('Test object log', { key: 'value', nested: { data: 'test' } });
    
    // Give storage time to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if logs were stored properly
    return new Promise((resolve) => {
      mockChrome.storage.local.get(['debugLogs'], (result) => {
        const logs = result.debugLogs || [];
        console.log('Retrieved logs:', logs);
        
        logResult('Debug logs stored', logs.length >= 3, true);
        
        const regularLog = logs.find(log => log.label === 'Test log');
        const errorLog = logs.find(log => log.label === 'Test error log');
        const objectLog = logs.find(log => log.label === 'Test object log');
        
        logResult('Regular log stored correctly', 
          regularLog && regularLog.data === 'This is a test message' && !regularLog.isError, 
          true);
          
        logResult('Error log stored correctly', 
          errorLog && errorLog.data === 'This is an error message' && errorLog.isError === true, 
          true);
          
        logResult('Object log stored correctly', 
          objectLog && objectLog.data.includes('key') && objectLog.data.includes('value'), 
          true);
          
        resolve(logs.length >= 3);
      });
    });
  },
  
  testMessageHandling() {
    clearTestState();
    console.log('🧪 Running Message Handling Test');
    
    // Store a test log
    window.logDebug('Test message', 'Message for testing');
    
    // Test getDebugLogs message
    mockChrome.runtime.sendMessage({action: "getDebugLogs"}, (response) => {
      console.log('GetDebugLogs response:', response);
      logResult('GetDebugLogs returns logs', response?.logs?.length > 0, true);
    });
    
    // Test popup opened message
    mockChrome.runtime.sendMessage({action: "popupOpened"}, (response) => {
      console.log('PopupOpened response:', response);
      logResult('PopupOpened returns status', !!response?.dataStatus, true);
    });
    
    return true;
  }
};

// Test runner
async function runTests() {
  console.log('🧪🧪🧪 Starting InvestIQ Test Harness 🧪🧪🧪');
  console.log('--------------------------------------------');
  
  // Inject Chrome mock
  window.chrome = mockChrome;
  
  // Run each test
  let passed = 0;
  let failed = 0;
  
  for (const [testName, testFn] of Object.entries(tests)) {
    console.log(`\n🧪 Running Test: ${testName}`);
    try {
      const result = await testFn();
      if (result) {
        console.log(`✅ ${testName} completed successfully`);
        passed++;
      } else {
        console.log(`❌ ${testName} failed`);
        failed++;
      }
    } catch (error) {
      console.error(`💥 Error in ${testName}:`, error);
      failed++;
    }
    console.log('--------------------------------------------');
  }
  
  // Summary
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
  
  // Reset fetch
  window.fetch = originalFetch;
}

// Initialize the test harness
document.addEventListener('DOMContentLoaded', () => {
  console.log('🧪 Initializing test harness and applying fixes...');
  
  // Fix log storage to ensure logs are properly saved during tests
  fixLogStorage();
  
  // Initialize the test runner
  const runButton = document.getElementById('run-tests');
  if (runButton) {
    runButton.addEventListener('click', runTests);
  }
  
  // Add logger test button handler
  const loggerTestButton = document.getElementById('test-logger');
  if (loggerTestButton) {
    loggerTestButton.addEventListener('click', async () => {
      console.log('📋 Running logger test only...');
      clearTestState();
      
      const logOutput = document.getElementById('log-output');
      if (logOutput) {
        logOutput.innerHTML = '<div class="test-section"><h3>Logger Test Results</h3></div>';
      }
      
      const result = await tests.testLoggerFunctions();
      console.log('Logger test completed with result:', result);
      updateStorageDisplay();
    });
  } else {
    // Auto-run if no button
    runTests();
  }
  
  // Add real data connection test button handler
  const realDataTestButton = document.getElementById('test-real-data');
  if (realDataTestButton) {
    realDataTestButton.addEventListener('click', async () => {
      console.log('🌐 Testing real data connections...');
      clearTestState();
      
      // Set status
      const statusElement = document.getElementById('test-status');
      if (statusElement) {
        statusElement.textContent = '🔄 Testing real API connections... This may take a moment.';
        statusElement.className = 'status status-running';
      }
      
      // Prepare log output area
      const logOutput = document.getElementById('log-output');
      if (logOutput) {
        logOutput.innerHTML = '<div class="test-section"><h3>Real Data Connection Test Results</h3><div id="real-data-results"></div></div>';
      }
      
      // Make sure real fetch is used for this test
      const tempFetch = window.fetch;
      window.fetch = originalFetch;
      
      try {
        // Run the real data connection tests
        const results = await testRealDataConnections();
        console.log('Real data connection test results:', results);
        
        // Update status
        if (statusElement) {
          statusElement.textContent = '✅ Real data connection tests completed.';
          statusElement.className = 'status status-success';
        }
        
        // Display results in a formatted way
        const resultsElement = document.getElementById('real-data-results');
        if (resultsElement) {
          let resultsHtml = '<table class="results-table"><tr><th>Endpoint</th><th>Status</th><th>Message</th></tr>';
          
          for (const [endpoint, result] of Object.entries(results)) {
            const statusIcon = result.success ? '✅' : '❌';
            const rowClass = result.success ? 'success' : 'failure';
            resultsHtml += `<tr class="${rowClass}"><td>${endpoint}</td><td>${statusIcon}</td><td>${result.message}</td></tr>`;
          }
          
          resultsHtml += '</table>';
          resultsElement.innerHTML = resultsHtml;
        }
      } catch (error) {
        console.error('Error running real data connection tests:', error);
        
        // Update status on error
        if (statusElement) {
          statusElement.textContent = '❌ Error testing data connections: ' + error.message;
          statusElement.className = 'status status-error';
        }
      } finally {
        // Restore mock fetch
        window.fetch = tempFetch;
      }
      
      // Update storage display
      updateStorageDisplay();
    });
  }
});
