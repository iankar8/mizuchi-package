# InvestIQ Extension

A Chrome extension that allows users to analyze companies and stocks by right-clicking on company names, providing real-time financial data and AI insights.

## Features

- Context menu integration: Highlight a company name, right-click, and select "Analyze with InvestIQ"
- Real-time company data visualization with clean UI
- Financial metrics display (Market Cap, P/E Ratio, Dividend Yield)
- AI-powered summaries using state-of-the-art LLMs
- Recent news integration with live updates
- Watchlist functionality to track favorite companies

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable Developer Mode by toggling the switch in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed and ready to use

## Usage

1. Find a company name on any webpage
2. Highlight the text (e.g., "Apple Inc.", "Microsoft", "Tesla")
3. Right-click and select "Analyze with InvestIQ" from the context menu
4. View the company's financial information, AI summary, and recent news

## API Integration

This extension integrates with the following APIs for real-time data:

- **Financial Modeling Prep (FMP) API**: Provides company profiles, financial metrics, and news.
  - Used for: Symbol lookup, company profiles, key financial metrics, and recent news articles
  - API Key is pre-configured (UbZlYJcx4PqoEkPAzJ2twhb2cU835qYn)

- **Mistral AI API**: Primary provider for AI-generated company summaries.
  - Used for: Generating concise financial analysis of companies
  - API Key is pre-configured (e1pMnRuEfCCJt1hQPfXEYGHckBzLrBpn)

- **Perplexity API**: Secondary provider for AI-generated company summaries.
  - Used as: Alternative AI provider with web search capabilities
  - API Key is pre-configured (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)
  - Uses the `sonar` model which provides web-grounded responses with citations

## Testing API Connections

A test script `test-apis.js` is included to verify API connectivity. Run it using Node.js:

```
node test-apis.js
```

This will test all API endpoints and report which ones are functioning correctly.

## Notes

- This extension uses real-time data from various financial APIs
- The SEC Filings and Peers tabs are placeholders for future functionality
- Error handling is implemented to ensure graceful degradation if APIs are unavailable
