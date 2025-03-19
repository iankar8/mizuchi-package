# Mizuchi AI - Product Specification

## Executive Summary

Mizuchi AI is a comprehensive financial research and analysis platform designed to empower retail investors with professional-grade tools previously only available to institutional investors. Named after the Japanese water dragon symbolizing prosperity and abundance, Mizuchi combines cutting-edge AI technology with financial data to provide actionable insights, collaborative research capabilities, and streamlined investment workflows.

## Problem Statement

Retail investors face several key challenges in today's market:

1. **Information Overload**: The volume of financial news, data, and social media content is overwhelming and difficult to process efficiently.

2. **Research Fragmentation**: Investors must juggle multiple tools and platforms to conduct comprehensive research, leading to inefficient workflows.

3. **Knowledge Gap**: Most retail investors lack the specialized knowledge and tools that institutional investors leverage.

4. **Collaboration Barriers**: Individual investors struggle to collaborate effectively on research and investment ideas.

5. **Cognitive Biases**: Emotional decision-making and cognitive biases often lead to suboptimal investment outcomes.

## Target Users

### Primary User Personas

1. **Active Retail Investor**
   - Demographics: 30-55 years old, middle to high income
   - Behavior: Trades multiple times per month, follows financial news closely
   - Needs: Efficient research tools, actionable insights, portfolio tracking

2. **Research-Focused Investor**
   - Demographics: 25-65 years old, analytical mindset
   - Behavior: Conducts deep research before investing, values fundamental analysis
   - Needs: Comprehensive data, AI-powered insights, collaborative tools

3. **Investment Group Member**
   - Demographics: Part of investment clubs or informal groups
   - Behavior: Shares research with peers, makes collaborative decisions
   - Needs: Shared watchlists, collaborative note-taking, discussion tools

### Secondary User Personas

1. **Casual Investor**
   - Demographics: Limited time for research, invests periodically
   - Behavior: Seeks simplified insights and recommendations
   - Needs: Digestible summaries, clear visualizations, guided workflows

2. **Financial Content Creator**
   - Demographics: Produces investment content on YouTube, blogs, or social media
   - Behavior: Researches companies to create educational content
   - Needs: Exportable insights, citation tools, comprehensive data

## Core Product Vision

Mizuchi AI aims to be the all-in-one financial research platform that democratizes institutional-grade investment tools through AI-powered insights, collaborative features, and seamless integration with the investor's workflow.

Our platform will serve as the central hub for an investor's research process, from initial discovery to final investment decision, while facilitating collaboration and reducing cognitive biases.

## Key Features and Components

### 1. Web Application (Core Platform)

#### Current Features

- **User Authentication and Management**
  - Secure login via Supabase authentication
  - User profile management
  - Role-based access control

- **Watchlist Management**
  - Create and manage multiple watchlists
  - Add/remove securities with real-time data
  - Collaborative watchlists with shared access
  - Activity tracking for collaborative lists

- **Research Dashboard**
  - Company overview with key metrics
  - Financial data visualization
  - News aggregation and sentiment analysis
  - AI-powered company summaries

- **Notes and Analysis**
  - Rich text editor for research notes
  - Attachment support for documents and images
  - Tagging and categorization
  - Collaborative editing and commenting

- **Financial Data Integration**
  - Real-time and historical price data
  - Fundamental financial metrics
  - SEC filings and earnings reports
  - Economic indicators and market data

#### Planned Features (Near-term)

- **Portfolio Management**
  - Portfolio tracking and performance metrics
  - Position sizing recommendations
  - Risk analysis and diversification insights
  - Tax-efficient trading suggestions

- **Advanced Screening**
  - Multi-factor stock screening
  - Custom screening templates
  - Saved screens with notifications
  - Peer comparison tools

- **Research Workflow Automation**
  - Customizable research templates
  - Automated data collection
  - Research checklists and frameworks
  - Progress tracking for research projects

- **Social Features**
  - Follow other investors
  - Share insights and analyses
  - Discussion forums for specific securities
  - Expert verification and reputation system

#### Future Vision Features

- **AI Investment Advisor**
  - Personalized investment recommendations
  - Portfolio optimization suggestions
  - Risk tolerance assessment
  - Goal-based investment planning

- **Advanced Visualization Tools**
  - Interactive charting with custom indicators
  - Correlation analysis
  - Scenario modeling and simulation
  - Visual pattern recognition

- **Alternative Data Integration**
  - Satellite imagery analysis
  - Social media sentiment tracking
  - Web traffic and app download metrics
  - Supply chain monitoring

- **Institutional-Grade Research Tools**
  - Discounted cash flow modeling
  - Comparable company analysis
  - Merger and acquisition analysis
  - Credit analysis tools

### 2. Chrome Extension

#### Current Features

- **YouTube Integration**
  - Extract and analyze financial content from videos
  - Add securities mentioned in videos to watchlists
  - Generate video summaries and key points
  - Save timestamps with notes

- **Web Research Assistant**
  - Extract relevant financial information from any webpage
  - Save web content to research notes
  - Highlight and annotate web content
  - Quick access to watchlists and portfolios

- **Quick Actions**
  - Rapid security lookup
  - Add to watchlist from any page
  - Capture screenshots to notes
  - Share content to collaboration spaces

#### Planned Features (Near-term)

- **Smart Reading Mode**
  - Distill lengthy financial articles into key points
  - Highlight important financial metrics in text
  - Provide context and explanations for complex terms
  - Compare mentioned data with official sources

- **Social Media Analysis**
  - Track sentiment on Twitter/X, Reddit, and other platforms
  - Identify trending securities in social discussions
  - Filter signal from noise in social investment discussions
  - Alert to unusual social activity around holdings

- **Research Workflow Integration**
  - Web content organization by research project
  - Automated tagging and categorization
  - Progress tracking across multiple sources
  - Research path visualization

#### Future Vision Features

- **AI Research Co-pilot**
  - Contextual research suggestions
  - Automated fact-checking
  - Contrarian viewpoint presentation
  - Cognitive bias detection and alerts

- **Cross-platform Data Aggregation**
  - Synchronize data across brokerage accounts
  - Import research from other platforms
  - Export insights to third-party tools
  - Universal watchlist synchronization

### 3. Marketing Website

#### Current Features

- **Product Overview**
  - Value proposition and key features
  - Visual demonstrations of platform capabilities
  - Pricing and subscription options
  - User testimonials

- **Educational Content**
  - Blog with investment education articles
  - Platform usage tutorials
  - Case studies of successful research
  - Market insights and analysis

#### Planned Features (Near-term)

- **Community Showcase**
  - Featured user research (with permission)
  - Success stories and case studies
  - Community-contributed templates
  - Expert contributor program

- **Learning Center**
  - Structured educational courses
  - Webinars and live events
  - Interactive demos
  - Certification program

## Technical Architecture

### Backend Infrastructure

- **Database**: Supabase (PostgreSQL)
  - Tables with Row Level Security:
    - watchlist
    - notes
    - watchlist_collaborators
    - watchlist_activity

- **Authentication**: Supabase Auth
  - Email/password authentication
  - OAuth providers (Google, Twitter)
  - Row-level security policies
  - Role-based access control

- **Storage**: Supabase Storage
  - Document and image storage
  - Secure access controls
  - Content delivery optimization

- **Hosting**: Vercel
  - Web application deployment
  - Marketing site hosting
  - Serverless functions
  - Edge caching

### Frontend Technologies

- **Framework**: React with TypeScript
- **State Management**: React Context API
- **UI Components**: Custom components with Shadcn UI
- **Styling**: Tailwind CSS
- **Data Visualization**: D3.js, Chart.js
- **Build Tools**: Vite

### AI and Data Services

#### Current Integrations

- **Financial Modeling Prep (FMP)**
  - API Key: `UbZlYJcx4PqoEkPAzJ2twhb2cU835qYn`
  - Used for: Financial data, company profiles, market news, SEC filings

- **Perplexity AI**
  - API Key: `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`
  - Model: `sonar`
  - Used for: Market research, company analysis, web search capabilities

- **Mistral AI**
  - API Key: `e1pMnRuEfCCJt1hQPfXEYGHckBzLrBpn`
  - Used for: Research query processing, content summarization

#### AI Engine Components

1. **Research Synthesis Engine**
   - Combines data from multiple sources
   - Generates comprehensive company analyses
   - Identifies key metrics and trends
   - Produces human-readable summaries

2. **Content Analysis Engine**
   - Extracts financial information from text and video
   - Identifies securities, metrics, and key points
   - Performs sentiment analysis
   - Generates structured data from unstructured content

3. **Collaborative Intelligence System**
   - Aggregates insights across users (anonymized)
   - Identifies consensus and contrarian views
   - Highlights overlooked information
   - Suggests relevant research paths

## Development Roadmap

### Phase 1: Core Platform Enhancement (Q2 2025)
- Refine existing features based on user feedback
- Implement portfolio management functionality
- Enhance collaborative features
- Improve data visualization capabilities

### Phase 2: Advanced Research Tools (Q3 2025)
- Develop advanced screening capabilities
- Implement research workflow automation
- Expand AI-powered insights
- Enhance Chrome extension capabilities

### Phase 3: Social and Community Features (Q4 2025)
- Build social interaction capabilities
- Develop reputation and verification system
- Create community content sharing platform
- Implement discussion forums

### Phase 4: Institutional-Grade Tools (Q1 2026)
- Develop advanced financial modeling tools
- Implement alternative data integration
- Create scenario analysis capabilities
- Build advanced portfolio optimization tools

## Success Metrics

### User Engagement
- Daily active users (DAU)
- Average session duration
- Feature usage distribution
- Retention rates (7-day, 30-day, 90-day)

### Research Quality
- Number of notes created per user
- Watchlist activity metrics
- Cross-referencing of multiple sources
- Time spent on research vs. execution

### Collaboration Metrics
- Number of shared watchlists
- Collaborative note edits
- Comment and discussion activity
- User-to-user sharing actions

### Business Metrics
- User acquisition cost
- Conversion rate (free to paid)
- Monthly recurring revenue (MRR)
- Customer lifetime value (LTV)

## Competitive Landscape

### Direct Competitors
- **Seeking Alpha**: Strong community but limited AI capabilities
- **TipRanks**: Analyst-focused but limited collaboration
- **Yahoo Finance**: Broad reach but basic functionality
- **Stock Rover**: Comprehensive data but complex interface

### Indirect Competitors
- **Bloomberg Terminal**: Institutional-focused, prohibitively expensive
- **Robinhood**: Trading-focused with limited research capabilities
- **Reddit (r/wallstreetbets, etc.)**: Community-driven but unstructured
- **Traditional Brokerages**: Research tools tied to trading platforms

### Mizuchi AI's Competitive Advantage
- AI-powered insights integrated throughout the workflow
- Seamless collaboration capabilities
- Cross-platform research integration via Chrome extension
- Balance of sophisticated tools with accessible interface

## Appendix: Technical Integration Details

### Supabase Configuration
- Project URL: https://okqjdghepetummjrdsbe.supabase.co
- Database Schema: Available in `/scripts/fix-database-schema.sql`
- RLS Policies: Implemented for all tables

### API Integration Specifications
- FMP API: RESTful API with rate limits of 300 requests/minute
- Perplexity API: OpenAI-compatible endpoint with 50 requests/minute
- Mistral API: Streaming capabilities for real-time analysis

### Chrome Extension Technical Requirements
- Manifest V3 compliant
- Service worker architecture
- Cross-origin security handling
- YouTube DOM interaction specifications

---

*This product specification is a living document and will be updated as the product evolves based on user feedback and market conditions.*
