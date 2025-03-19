// Supabase client for MizuchiAI Chrome Extension
// This file handles Supabase initialization, authentication, and data syncing

// Supabase configuration for production
const SUPABASE_URL = 'https://etdwazrfnwyelabncagn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZHdhenJmbnd5ZWxhYm5jYWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NDEzMjAsImV4cCI6MjA1NzMxNzMyMH0.r8iQExMetKvUU0GMFkbeECaYTCB_VM-zXSkZGySVDkw';
const APP_URL = 'https://app.mizuchiai.com';


// Initialize the Supabase client
let supabase;

// Initialize Supabase client
function initSupabase() {
  if (!supabase && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
    return true;
  } else if (!window.supabase) {
    console.error('Supabase library not loaded');
    return false;
  }
  return !!supabase;
}

// Get current session
async function getSession() {
  if (!initSupabase()) return null;
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Sign in with email and password
async function signInWithEmail(email, password) {
  if (!initSupabase()) return { error: 'Supabase not initialized' };
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Store auth state in chrome.storage if available
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 
          authState: {
            user: data.user,
            lastLogin: new Date().toISOString()
          }
        });
      }
    } catch (storageError) {
      console.warn('Could not store auth state in chrome.storage:', storageError);
    }
    
    return { user: data.user };
  } catch (error) {
    console.error('Error signing in:', error);
    return { error: error.message };
  }
}

// Sign up with email and password
async function signUpWithEmail(email, password) {
  if (!initSupabase()) return { error: 'Supabase not initialized' };
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (error) throw error;
    
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Error signing up:', error);
    return { error: error.message };
  }
}

// Sign out
async function signOut() {
  if (!initSupabase()) return { error: 'Supabase not initialized' };
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear auth state from chrome.storage if available
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove('authState');
      }
    } catch (storageError) {
      console.warn('Could not clear auth state from chrome.storage:', storageError);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error.message };
  }
}

// Check if tables exist
async function checkTablesExist() {
  const session = await getSession();
  if (!session) return { watchlistExists: false, notesExists: false };
  
  try {
    console.log('Checking if tables exist...');
    
    // Try to query the information_schema to check if tables exist
    const { data: watchlistCheck, error: watchlistError } = await supabase
      .from('watchlist')
      .select('id')
      .limit(1);
      
    const { data: notesCheck, error: notesError } = await supabase
      .from('notes')
      .select('id')
      .limit(1);
    
    const watchlistExists = !watchlistError || watchlistError.code !== '42P01';
    const notesExists = !notesError || notesError.code !== '42P01';
    
    console.log(`Tables exist check: watchlist=${watchlistExists}, notes=${notesExists}`);
    
    return { watchlistExists, notesExists };
  } catch (error) {
    console.error('Error checking if tables exist:', error);
    return { watchlistExists: false, notesExists: false };
  }
}

// Show required SQL for table creation
function getTableCreationSQL() {
  return `
-- Run these SQL commands in your Supabase SQL Editor to create the required tables

-- Create watchlist table
CREATE TABLE IF NOT EXISTS public.watchlist (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticker TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Set up RLS (Row Level Security) for watchlist
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist items" 
  ON public.watchlist FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist items" 
  ON public.watchlist FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist items" 
  ON public.watchlist FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items" 
  ON public.watchlist FOR DELETE 
  USING (auth.uid() = user_id);

-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticker TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Set up RLS for notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes" 
  ON public.notes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" 
  ON public.notes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
  ON public.notes FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
  ON public.notes FOR DELETE 
  USING (auth.uid() = user_id);
`;
}

// Check if tables exist and provide guidance if they don't
async function checkTablesAndProvideGuidance() {
  const { watchlistExists, notesExists } = await checkTablesExist();
  
  if (!watchlistExists || !notesExists) {
    const missingTables = [];
    if (!watchlistExists) missingTables.push('watchlist');
    if (!notesExists) missingTables.push('notes');
    
    console.error(`Required tables are missing: ${missingTables.join(', ')}`);
    console.error('Please create the missing tables in your Supabase dashboard.');
    console.error('SQL to create tables:', getTableCreationSQL());
    
    // Display an alert in the test page
    if (typeof document !== 'undefined') {
      const alertDiv = document.createElement('div');
      alertDiv.style.backgroundColor = '#f8d7da';
      alertDiv.style.color = '#721c24';
      alertDiv.style.padding = '10px';
      alertDiv.style.margin = '10px 0';
      alertDiv.style.borderRadius = '4px';
      alertDiv.innerHTML = `
        <h3>Database Setup Required</h3>
        <p>The required database tables are missing: <strong>${missingTables.join(', ')}</strong></p>
        <p>Please create these tables in your Supabase dashboard SQL Editor.</p>
        <button id="showSqlBtn" style="background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Show SQL</button>
      `;
      
      document.body.insertBefore(alertDiv, document.body.firstChild);
      
      document.getElementById('showSqlBtn').addEventListener('click', function() {
        const sqlModal = document.createElement('div');
        sqlModal.style.position = 'fixed';
        sqlModal.style.top = '0';
        sqlModal.style.left = '0';
        sqlModal.style.width = '100%';
        sqlModal.style.height = '100%';
        sqlModal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        sqlModal.style.zIndex = '1000';
        sqlModal.style.display = 'flex';
        sqlModal.style.justifyContent = 'center';
        sqlModal.style.alignItems = 'center';
        
        const modalContent = document.createElement('div');
        modalContent.style.backgroundColor = 'white';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.maxWidth = '80%';
        modalContent.style.maxHeight = '80%';
        modalContent.style.overflow = 'auto';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.backgroundColor = '#dc3545';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.padding = '5px 10px';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.marginTop = '10px';
        
        const sqlPre = document.createElement('pre');
        sqlPre.style.backgroundColor = '#f8f9fa';
        sqlPre.style.padding = '10px';
        sqlPre.style.borderRadius = '4px';
        sqlPre.style.whiteSpace = 'pre-wrap';
        sqlPre.textContent = getTableCreationSQL();
        
        modalContent.appendChild(sqlPre);
        modalContent.appendChild(closeBtn);
        sqlModal.appendChild(modalContent);
        document.body.appendChild(sqlModal);
        
        closeBtn.addEventListener('click', function() {
          document.body.removeChild(sqlModal);
        });
      });
    }
    
    return false;
  }
  
  return true;
}

// Sync watchlist item to Supabase
async function syncWatchlistToSupabase(symbol, addToWatchlist = true) {
  const session = await getSession();
  if (!session) {
    console.log('Not logged in, only saving locally');
    return null;
  }
  
  try {
    // Check if tables exist
    const tablesExist = await checkTablesAndProvideGuidance();
    if (!tablesExist) {
      console.log('Tables do not exist, skipping Supabase sync');
      return null;
    }
    
    // If we're removing from watchlist, delete the record
    if (!addToWatchlist) {
      const { data, error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', session.user.id)
        .eq('ticker', symbol);
      
      if (error) throw error;
      return data;
    }
    
    // Otherwise, insert the record if it doesn't exist
    const { data, error } = await supabase
      .from('watchlist')
      .upsert([
        {
          user_id: session.user.id,
          ticker: symbol,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error syncing watchlist:', error);
    // Continue with local storage operations even if Supabase sync fails
    return null;
  }
}

// Sync note to Supabase
async function syncNoteToSupabase(symbol, noteContent) {
  const session = await getSession();
  if (!session) {
    console.log('Not logged in, only saving locally');
    return null;
  }
  
  try {
    // Check if tables exist
    const tablesExist = await checkTablesAndProvideGuidance();
    if (!tablesExist) {
      console.log('Tables do not exist, skipping Supabase sync');
      return null;
    }
    
    // If note content is empty, delete the note
    if (!noteContent) {
      const { data, error } = await supabase
        .from('notes')
        .delete()
        .eq('user_id', session.user.id)
        .eq('ticker', symbol);
      
      if (error) throw error;
      return data;
    }
    
    // Otherwise, upsert the note
    const { data, error } = await supabase
      .from('notes')
      .upsert([
        {
          user_id: session.user.id,
          ticker: symbol,
          content: noteContent,
          updated_at: new Date().toISOString()
        }
      ]);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error syncing note:', error);
    // Continue with local storage operations even if Supabase sync fails
    return null;
  }
}

// Fetch all watchlist items for the current user
async function fetchWatchlist() {
  const session = await getSession();
  if (!session) {
    console.log('Not logged in, using local watchlist only');
    return null;
  }
  
  try {
    // Check if tables exist
    const tablesExist = await checkTablesAndProvideGuidance();
    if (!tablesExist) {
      console.log('Tables do not exist, using local watchlist only');
      return null;
    }
    
    const { data, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (error) throw error;
    
    // Transform to the format used by the extension (array of symbols)
    return data.map(item => item.ticker);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return null;
  }
}

// Fetch all notes for the current user
async function fetchNotes() {
  const session = await getSession();
  if (!session) {
    console.log('Not logged in, using local notes only');
    return null;
  }
  
  try {
    // Check if tables exist
    const tablesExist = await checkTablesAndProvideGuidance();
    if (!tablesExist) {
      console.log('Tables do not exist, using local notes only');
      return null;
    }
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (error) throw error;
    
    // Transform to the format used by the extension (object with symbol keys)
    const notes = {};
    data.forEach(note => {
      notes[note.ticker] = {
        content: note.content,
        timestamp: note.updated_at
      };
    });
    
    return notes;
  } catch (error) {
    console.error('Error fetching notes:', error);
    return null;
  }
}

// Sync local data with Supabase
async function syncLocalDataWithSupabase() {
  const session = await getSession();
  if (!session) {
    console.log('Not logged in, skipping sync');
    return false;
  }
  
  try {
    // Check if tables exist
    const tablesExist = await checkTablesAndProvideGuidance();
    if (!tablesExist) {
      console.log('Tables do not exist, skipping Supabase sync');
      return false;
    }
    
    // Get local data
    let localWatchlist = [];
    let localNotes = {};
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await new Promise(resolve => {
          chrome.storage.local.get(['watchlist', 'stockNotes'], resolve);
        });
        
        localWatchlist = result.watchlist || [];
        localNotes = result.stockNotes || {};
      } else {
        // For browser testing, use localStorage
        const watchlistStr = localStorage.getItem('watchlist');
        const notesStr = localStorage.getItem('stockNotes');
        
        if (watchlistStr) {
          try { localWatchlist = JSON.parse(watchlistStr); } catch (e) {}
        }
        
        if (notesStr) {
          try { localNotes = JSON.parse(notesStr); } catch (e) {}
        }
      }
    } catch (storageError) {
      console.warn('Error accessing storage:', storageError);
      // Continue with empty data
    }
    
    // Sync watchlist items
    const watchlistPromises = localWatchlist.map(symbol => 
      syncWatchlistToSupabase(symbol, true)
    );
    
    // Sync notes
    const notesPromises = Object.entries(localNotes).map(([symbol, note]) => 
      syncNoteToSupabase(symbol, note.content)
    );
    
    // Wait for all sync operations to complete
    await Promise.allSettled([...watchlistPromises, ...notesPromises]);
    
    // Now fetch the latest data from Supabase
    const [remoteWatchlist, remoteNotes] = await Promise.all([
      fetchWatchlist(),
      fetchNotes()
    ]);
    
    // Merge remote data with local data
    if (remoteWatchlist) {
      // Combine local and remote watchlists, removing duplicates
      const mergedWatchlist = [...new Set([...localWatchlist, ...remoteWatchlist])];
      
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ watchlist: mergedWatchlist });
        } else {
          localStorage.setItem('watchlist', JSON.stringify(mergedWatchlist));
        }
      } catch (storageError) {
        console.warn('Error saving watchlist to storage:', storageError);
      }
    }
    
    if (remoteNotes) {
      // Merge notes, preferring the one with the most recent timestamp
      const mergedNotes = { ...localNotes };
      
      Object.entries(remoteNotes).forEach(([symbol, remoteNote]) => {
        const localNote = localNotes[symbol];
        
        if (!localNote || new Date(remoteNote.timestamp) > new Date(localNote.timestamp)) {
          mergedNotes[symbol] = remoteNote;
        }
      });
      
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ stockNotes: mergedNotes });
        } else {
          localStorage.setItem('stockNotes', JSON.stringify(mergedNotes));
        }
      } catch (storageError) {
        console.warn('Error saving notes to storage:', storageError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing local data with Supabase:', error);
    return false;
  }
}

// Export functions
window.supabaseClient = {
  initSupabase,
  getSession,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  syncWatchlistToSupabase,
  syncNoteToSupabase,
  fetchWatchlist,
  fetchNotes,
  syncLocalDataWithSupabase
};
