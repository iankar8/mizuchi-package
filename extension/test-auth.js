// Test script for Supabase authentication
console.log('Starting Supabase authentication test...');

// Test variables
const testEmail = 'test@example.com';
const testPassword = 'password123';
let authSuccess = false;

// SQL commands for table creation
const createTablesSql = `
-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Create RLS policies for watchlist
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own watchlist" ON watchlist
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own watchlist items" ON watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watchlist items" ON watchlist
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watchlist items" ON watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- Create RLS policies for notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);
`;

// Test functions
async function testSupabaseAuth() {
  console.log('Initializing Supabase client...');
  if (!window.supabaseClient) {
    console.error('Supabase client not available');
    return false;
  }
  
  // Initialize Supabase
  const initResult = window.supabaseClient.initSupabase();
  console.log('Supabase initialization result:', initResult);
  
  // Check current session
  console.log('Checking current session...');
  const session = await window.supabaseClient.getSession();
  console.log('Current session:', session ? 'Active' : 'None');
  
  if (session) {
    console.log('User already signed in:', session.user.email);
    authSuccess = true;
    return true;
  }
  
  // Test sign up
  console.log(`Testing sign up with ${testEmail}...`);
  const signUpResult = await window.supabaseClient.signUpWithEmail(testEmail, testPassword);
  console.log('Sign up result:', signUpResult);
  
  if (signUpResult.error) {
    // If user already exists, try signing in
    if (signUpResult.error.includes('already registered')) {
      console.log('User already exists, trying sign in...');
    } else {
      console.error('Sign up failed:', signUpResult.error);
      return false;
    }
  } else {
    console.log('Sign up successful!');
    authSuccess = true;
    return true;
  }
  
  // Test sign in
  console.log(`Testing sign in with ${testEmail}...`);
  const signInResult = await window.supabaseClient.signInWithEmail(testEmail, testPassword);
  console.log('Sign in result:', signInResult);
  
  if (signInResult.error) {
    console.error('Sign in failed:', signInResult.error);
    return false;
  }
  
  console.log('Sign in successful!');
  authSuccess = true;
  
  // Add test data to local storage
  console.log('Adding test data to local storage...');
  chrome.storage.local.set({
    watchlist: ['AAPL', 'MSFT', 'GOOGL'],
    stockNotes: {
      'AAPL': {
        content: 'Test note for Apple',
        timestamp: new Date().toISOString()
      }
    }
  });
  
  // Test data syncing
  console.log('Testing data syncing...');
  const syncResult = await window.supabaseClient.syncLocalDataWithSupabase();
  console.log('Data sync result:', syncResult ? 'Success' : 'Failed');
  
  if (syncResult) {
    // Verify the synced data
    const watchlist = await window.supabaseClient.fetchWatchlist();
    const notes = await window.supabaseClient.fetchNotes();
    console.log('Synced watchlist:', watchlist);
    console.log('Synced notes:', notes);
  }
  
  return true;
}

// Test sign out (only if auth was successful)
async function testSignOut() {
  if (!authSuccess) {
    console.log('Skipping sign out test as authentication was not successful');
    return false;
  }
  
  console.log('Testing sign out...');
  const signOutResult = await window.supabaseClient.signOut();
  console.log('Sign out result:', signOutResult);
  
  if (signOutResult.error) {
    console.error('Sign out failed:', signOutResult.error);
    return false;
  }
  
  console.log('Sign out successful!');
  
  // Verify session is gone
  const session = await window.supabaseClient.getSession();
  console.log('Session after sign out:', session ? 'Still active (error)' : 'None (correct)');
  
  return !session;
}

// Display SQL for table creation
function displaySqlCommands() {
  const sqlContainer = document.getElementById('sql-container');
  if (sqlContainer) {
    const sqlPre = document.createElement('pre');
    sqlPre.textContent = createTablesSql;
    sqlPre.className = 'sql-code';
    
    // Clear previous content
    sqlContainer.innerHTML = '';
    
    // Add a copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy SQL';
    copyButton.className = 'copy-button';
    copyButton.onclick = () => {
      navigator.clipboard.writeText(createTablesSql)
        .then(() => {
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy SQL';
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy SQL:', err);
          copyButton.textContent = 'Copy failed';
        });
    };
    
    sqlContainer.appendChild(copyButton);
    sqlContainer.appendChild(sqlPre);
  }
}

// Run tests
async function runTests() {
  try {
    // Display SQL commands first
    displaySqlCommands();
    
    const authResult = await testSupabaseAuth();
    console.log('Authentication test result:', authResult ? 'PASSED' : 'FAILED');
    
    // Wait a bit before testing sign out
    setTimeout(async () => {
      const signOutResult = await testSignOut();
      console.log('Sign out test result:', signOutResult ? 'PASSED' : 'FAILED');
      
      console.log('All tests completed!');
    }, 2000);
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Start tests when DOM is loaded
document.addEventListener('DOMContentLoaded', runTests);
