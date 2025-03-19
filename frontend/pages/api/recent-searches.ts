// API endpoint for handling recent searches from extension and web app
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import recentSearchesService from '@/services/recentSearches.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getRecentSearches(req, res, session.user.id);
    case 'POST':
      return addRecentSearches(req, res, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get recent searches for the authenticated user
async function getRecentSearches(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
    
    const searches = await recentSearchesService.getRecentSearches(userId, limit);
    
    return res.status(200).json({ searches });
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return res.status(500).json({ error: 'Failed to get recent searches' });
  }
}

// Add one or more recent searches
async function addRecentSearches(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { searches } = req.body;
    
    // Check if we have a single search or an array
    if (Array.isArray(searches)) {
      // Bulk insert
      const mappedSearches = searches.map(search => ({
        symbol: search.symbol,
        companyName: search.companyName,
        source: search.source || 'web',
        metadata: search.metadata || {}
      }));
      
      const success = await recentSearchesService.bulkInsertRecentSearches(userId, mappedSearches);
      
      if (!success) {
        return res.status(500).json({ error: 'Failed to add searches' });
      }
      
      return res.status(200).json({ success: true });
    } else {
      // Single search
      const { symbol, companyName, source, metadata } = req.body;
      
      if (!symbol || !companyName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const searchId = await recentSearchesService.addRecentSearch(
        userId,
        symbol,
        companyName,
        source || 'web',
        metadata || {}
      );
      
      if (!searchId) {
        return res.status(500).json({ error: 'Failed to add search' });
      }
      
      return res.status(200).json({ id: searchId });
    }
  } catch (error) {
    console.error('Error adding recent search:', error);
    return res.status(500).json({ error: 'Failed to add search' });
  }
}