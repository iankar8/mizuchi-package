# Mizuchi AI - Packaged Components

This package contains the essential frontend UI and Chrome extension components from the Mizuchi AI project.

## Structure

```
mizuchi-package/
├── frontend/        # React frontend application
│   ├── components/  # UI components
│   ├── context/     # React context providers
│   ├── hooks/       # Custom React hooks
│   ├── lib/         # Utility libraries
│   ├── pages/       # Page components
│   ├── services/    # API and integration services
│   ├── types/       # TypeScript type definitions
│   ├── utils/       # Utility functions
│   └── public/      # Static assets
│
├── extension/       # Chrome extension
│   ├── background.js    # Service worker / background script
│   ├── popup.html       # Extension popup UI
│   ├── popup.js         # Popup functionality
│   ├── manifest.json    # Extension manifest
│   ├── styles.css       # Extension styles
│   └── images/          # Extension icons and images
│
└── marketing/       # Marketing website
    ├── index.html       # Landing page
    ├── assets/          # Images and other assets
    └── vercel.json      # Vercel deployment configuration
```

## Frontend Setup

The frontend is a React application built with:
- TypeScript
- Vite
- Tailwind CSS
- Shadcn UI components

To set up the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Chrome Extension Setup

The Chrome extension uses Manifest V3 and integrates with the Mizuchi AI backend.

To load the extension in Chrome:
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension` directory

## Marketing Site Setup

The marketing site is a static HTML site designed to be deployed to Vercel.

To run the marketing site locally:
```bash
cd marketing
python -m http.server 3000
```

To deploy to Vercel:
```bash
cd marketing
vercel
```

## Supabase Integration

This package is designed to work with a Supabase backend. You'll need to set up your own Supabase project and update the configuration in:
- Frontend: Create a `.env` file based on `.env.example`
- Extension: Update the Supabase client configuration in `supabase-client.js`

## Features

### Frontend
- User authentication
- Watchlist management
- Research tools
- Notes and collaboration
- Financial data visualization

### Chrome Extension
- YouTube integration
- Web page analysis
- Quick access to watchlists
- Research tools integration

### Marketing Site
- Landing page with product information
- Feature highlights
- Visual branding elements
- Call-to-action sections
- Responsive design
