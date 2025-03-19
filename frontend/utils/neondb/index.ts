// NeonDB module exports
// This is the main entry point for NeonDB utilities

import connectionManager, { NeonDBConnectionManager } from './connection-manager';
import rlsHelper from './rls-helper';

// Re-export from the config module
export * from './config';

// Export the connection manager
export { 
  NeonDBConnectionManager,
  connectionManager
};

// Export RLS helper functions
export const {
  setCurrentUser,
  queryWithUser,
  withUserTransaction,
  canAccessWatchlist,
  isWatchlistOwner
} = rlsHelper;

// Export a default object with all utilities
export default {
  connectionManager,
  ...rlsHelper
};