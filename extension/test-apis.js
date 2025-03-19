// API Testing Script for InvestIQ Extension
// Used to verify API connections independently

const FMP_API_KEY = "UbZlYJcx4PqoEkPAzJ2twhb2cU835qYn";
const PERPLEXITY_API_KEY = "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";
const MISTRAL_API_KEY = "e1pMnRuEfCCJt1hQPfXEYGHckBzLrBpn";

// Test company
const testCompany = "Apple";
const testSymbol = "AAPL";

// Helper function to print results
function logResult(apiName, success, data) {
  console.log(`\n==== ${apiName} API Test ====`);
  console.log(`Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (success) {
    console.log('Response data:', data);
  }
}

// Test FMP Symbol Search
async function testFMPSymbolSearch() {
  try {
    console.log(`Testing FMP Symbol Search for "${testCompany}"...`);
    
    const response = await fetch(`https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(testCompany)}&limit=1&apikey=${FMP_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      logResult('FMP Symbol Search', true, data[0]);
      return true;
    } else {
      throw new Error('No results found');
    }
  } catch (error) {
    logResult('FMP Symbol Search', false, error.message);
    return false;
  }
}

// Test FMP Company Profile
async function testFMPCompanyProfile() {
  try {
    console.log(`Testing FMP Company Profile for "${testSymbol}"...`);
    
    const response = await fetch(`https://financialmodelingprep.com/api/v3/profile/${testSymbol}?apikey=${FMP_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      logResult('FMP Company Profile', true, {
        symbol: data[0].symbol,
        name: data[0].companyName,
        price: data[0].price,
        marketCap: data[0].mktCap
      });
      return true;
    } else {
      throw new Error('No profile data found');
    }
  } catch (error) {
    logResult('FMP Company Profile', false, error.message);
    return false;
  }
}

// Test FMP Key Metrics
async function testFMPKeyMetrics() {
  try {
    console.log(`Testing FMP Key Metrics for "${testSymbol}"...`);
    
    const ratiosResponse = await fetch(`https://financialmodelingprep.com/api/v3/ratios/${testSymbol}?limit=1&apikey=${FMP_API_KEY}`);
    
    if (!ratiosResponse.ok) {
      throw new Error(`FMP API responded with status: ${ratiosResponse.status}`);
    }
    
    const ratiosData = await ratiosResponse.json();
    
    if (ratiosData && ratiosData.length > 0) {
      logResult('FMP Key Metrics', true, {
        peRatio: ratiosData[0].priceEarningsRatio,
        dividendYield: ratiosData[0].dividendYield,
        dividendPerShare: ratiosData[0].dividendPerShare
      });
      return true;
    } else {
      throw new Error('No metrics data found');
    }
  } catch (error) {
    logResult('FMP Key Metrics', false, error.message);
    return false;
  }
}

// Test FMP News
async function testFMPNews() {
  try {
    console.log(`Testing FMP News for "${testSymbol}"...`);
    
    const response = await fetch(`https://financialmodelingprep.com/api/v3/stock_news?tickers=${testSymbol}&limit=2&apikey=${FMP_API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      logResult('FMP News', true, data.map(item => ({
        title: item.title,
        date: item.publishedDate,
        source: item.site
      })));
      return true;
    } else {
      throw new Error('No news data found');
    }
  } catch (error) {
    logResult('FMP News', false, error.message);
    return false;
  }
}

// Test Perplexity AI Summary
async function testPerplexityAI() {
  try {
    console.log('Testing Perplexity AI Summary...');
    
    // Checking available models first
    console.log('Available models in Perplexity API:');
    console.log('- llama-3-sonar-small-32k-chat');
    console.log('- llama-3-sonar-small-32k-online');
    console.log('- llama-3-sonar-large-32k-chat');
    console.log('- llama-3-sonar-large-32k-online');
    console.log('- sonar');
    console.log('- sonar-pro');
    
    const requestBody = {
      model: 'sonar',  // Using the simpler 'sonar' model which should be more available
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst that provides brief summaries. Keep responses short.'
        },
        {
          role: 'user',
          content: `Provide a very brief summary of ${testCompany} (${testSymbol}). Max 2 sentences.`
        }
      ],
      max_tokens: 100
    };
    
    console.log('Request payload:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Perplexity API responded with status: ${response.status}. Details: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data && data.choices && data.choices.length > 0) {
      logResult('Perplexity AI', true, {
        summary: data.choices[0].message.content
      });
      return true;
    } else {
      throw new Error('No valid response from Perplexity API');
    }
  } catch (error) {
    logResult('Perplexity AI', false, error.message);
    return false;
  }
}

// Test Mistral AI Summary
async function testMistralAI() {
  try {
    console.log('Testing Mistral AI Summary...');
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
            content: 'You are a financial analyst that provides brief summaries. Keep responses short.'
          },
          {
            role: 'user',
            content: `Provide a very brief summary of ${testCompany} (${testSymbol}). Max 2 sentences.`
          }
        ],
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.choices && data.choices.length > 0) {
      logResult('Mistral AI', true, {
        summary: data.choices[0].message.content
      });
      return true;
    } else {
      throw new Error('No valid response from Mistral API');
    }
  } catch (error) {
    logResult('Mistral AI', false, error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('=================================');
  console.log('INVESTIQ EXTENSION API TEST SUITE');
  console.log('=================================');
  
  const fmpSymbolSuccess = await testFMPSymbolSearch();
  const fmpProfileSuccess = await testFMPCompanyProfile();
  const fmpMetricsSuccess = await testFMPKeyMetrics();
  const fmpNewsSuccess = await testFMPNews();
  const perplexitySuccess = await testPerplexityAI();
  const mistralSuccess = await testMistralAI();
  
  console.log('\n=================================');
  console.log('TEST SUMMARY');
  console.log('=================================');
  console.log(`FMP Symbol Search: ${fmpSymbolSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FMP Company Profile: ${fmpProfileSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FMP Key Metrics: ${fmpMetricsSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`FMP News: ${fmpNewsSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Perplexity AI: ${perplexitySuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Mistral AI: ${mistralSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallSuccess = fmpSymbolSuccess && fmpProfileSuccess && fmpMetricsSuccess && 
                         fmpNewsSuccess && (perplexitySuccess || mistralSuccess);
  
  console.log('\nOVERALL STATUS: ' + (overallSuccess ? '✅ PASS' : '❌ FAIL'));
  console.log('Note: Extension requires at least FMP APIs to work, and either Perplexity OR Mistral for AI summaries.');
}

// Run the tests
runAllTests();
