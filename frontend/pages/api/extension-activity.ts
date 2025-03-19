// API endpoint for handling extension activity
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
      return getExtensionActivity(req, res, session.user.id);
    case 'POST':
      return logExtensionActivity(req, res, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Get extension activity for the authenticated user
async function getExtensionActivity(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    
    const activity = await recentSearchesService.getExtensionActivity(userId, limit);
    
    return res.status(200).json({ activity });
  } catch (error) {
    console.error('Error getting extension activity:', error);
    return res.status(500).json({ error: 'Failed to get activity' });
  }
}

// Log extension activity
async function logExtensionActivity(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { activities } = req.body;
    
    // Check if we have a single activity or an array
    if (Array.isArray(activities)) {
      // Bulk insert
      const results = await Promise.all(
        activities.map(activity => 
          recentSearchesService.logExtensionActivity(
            userId,
            activity.activityType,
            activity.url,
            activity.details || {}
          )
        )
      );
      
      // Check if any activities failed to log
      if (results.some(id => !id)) {
        return res.status(500).json({ error: 'Some activities failed to log' });
      }
      
      return res.status(200).json({ success: true });
    } else {
      // Single activity
      const { activityType, url, details } = req.body;
      
      if (!activityType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const activityId = await recentSearchesService.logExtensionActivity(
        userId,
        activityType,
        url,
        details || {}
      );
      
      if (!activityId) {
        return res.status(500).json({ error: 'Failed to log activity' });
      }
      
      return res.status(200).json({ id: activityId });
    }
  } catch (error) {
    console.error('Error logging extension activity:', error);
    return res.status(500).json({ error: 'Failed to log activity' });
  }
}