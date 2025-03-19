/**
 * Feature flags for controlled rollout of features
 * 
 * This module provides a centralized way to manage feature flags,
 * allowing for gradual rollout of new features to beta users.
 */
import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react';

// Define available features
export enum Feature {
  // Existing features
  ADVANCED_CHARTS = 'advanced_charts',
  AI_MARKET_INSIGHTS = 'ai_market_insights',
  WATCHLIST_COLLABORATION = 'watchlist_collaboration',
  PORTFOLIO_TRACKING = 'portfolio_tracking',
  RESEARCH_ASSISTANT = 'research_assistant',
  NEWS_SENTIMENT_ANALYSIS = 'news_sentiment_analysis',
  REAL_TIME_UPDATES = 'real_time_updates',
  
  // New features for beta release
  BULK_IMPORTS = 'bulk_imports',                       // Import stocks in bulk
  CUSTOM_WATCHLIST_VIEWS = 'custom_watchlist_views',   // User-defined watchlist views
  ENHANCED_ANALYTICS = 'enhanced_analytics',           // Advanced analytics for stocks
  MARKET_ALERTS = 'market_alerts',                     // Price and news alerts
  EXPORT_CAPABILITIES = 'export_capabilities',         // Export data to CSV/PDF
  SOCIAL_SHARING = 'social_sharing',                   // Share watchlists/research
  PERFORMANCE_TRACKING = 'performance_tracking',       // Track portfolio performance over time
  MOBILE_OPTIMIZATIONS = 'mobile_optimizations',       // Mobile-specific optimizations
  DARK_MODE = 'dark_mode',                             // Dark mode support
  INVESTMENT_IDEAS = 'investment_ideas'                // AI-generated investment ideas
}

// Feature flag configuration
export interface FeatureConfig {
  // Whether the feature is enabled
  enabled: boolean;
  
  // Percentage of users who should see this feature (0-100)
  rolloutPercentage?: number;
  
  // User IDs that should always see this feature
  enabledFor?: string[];
  
  // User IDs that should never see this feature
  disabledFor?: string[];
  
  // Whether the feature is in development, staging, or production
  environment?: 'development' | 'staging' | 'production' | 'all';
}

// Default configurations for all features
const defaultFeatureFlags: Record<Feature, FeatureConfig> = {
  // Existing features with updated rollout percentages for beta
  [Feature.ADVANCED_CHARTS]: {
    enabled: true,
    rolloutPercentage: 100, // Available to all beta users
    environment: 'all'
  },
  [Feature.AI_MARKET_INSIGHTS]: {
    enabled: true,
    rolloutPercentage: 75, // Increased from 50% to 75% for beta
    environment: 'all'
  },
  [Feature.WATCHLIST_COLLABORATION]: {
    enabled: true,
    rolloutPercentage: 100, // Available to all beta users
    environment: 'all'
  },
  [Feature.PORTFOLIO_TRACKING]: {
    enabled: true, // Enabled for beta
    rolloutPercentage: 50, // 50% of beta users
    environment: 'all'
  },
  [Feature.RESEARCH_ASSISTANT]: {
    enabled: true,
    rolloutPercentage: 80, // Increased from 75% to 80% for beta
    environment: 'all'
  },
  [Feature.NEWS_SENTIMENT_ANALYSIS]: {
    enabled: true,
    rolloutPercentage: 100, // Available to all beta users
    environment: 'all'
  },
  [Feature.REAL_TIME_UPDATES]: {
    enabled: true, // Enabled for beta
    rolloutPercentage: 25, // Limited rollout for beta testing
    environment: 'all'
  },
  
  // New features for beta with carefully controlled rollout
  [Feature.BULK_IMPORTS]: {
    enabled: true,
    rolloutPercentage: 30, // Limited initial rollout
    environment: 'all'
  },
  [Feature.CUSTOM_WATCHLIST_VIEWS]: {
    enabled: true,
    rolloutPercentage: 25, // Very limited rollout
    environment: 'all'
  },
  [Feature.ENHANCED_ANALYTICS]: {
    enabled: true,
    rolloutPercentage: 50, // Half of beta users
    environment: 'all'
  },
  [Feature.MARKET_ALERTS]: {
    enabled: true,
    rolloutPercentage: 40, // Medium rollout
    environment: 'all'
  },
  [Feature.EXPORT_CAPABILITIES]: {
    enabled: true,
    rolloutPercentage: 75, // Wider rollout
    environment: 'all'
  },
  [Feature.SOCIAL_SHARING]: {
    enabled: true,
    rolloutPercentage: 50, // Half of beta users
    environment: 'all'
  },
  [Feature.PERFORMANCE_TRACKING]: {
    enabled: true,
    rolloutPercentage: 35, // Limited rollout
    environment: 'all'
  },
  [Feature.MOBILE_OPTIMIZATIONS]: {
    enabled: true,
    rolloutPercentage: 100, // Available to all beta users
    environment: 'all'
  },
  [Feature.DARK_MODE]: {
    enabled: true,
    rolloutPercentage: 100, // Available to all beta users
    environment: 'all'
  },
  [Feature.INVESTMENT_IDEAS]: {
    enabled: true,
    rolloutPercentage: 20, // Very limited rollout
    environment: 'all'
  }
};

// Override default flags with environment-specific ones
const getEnvironmentFlags = (): Record<Feature, FeatureConfig> => {
  const flags = { ...defaultFeatureFlags };
  
  // Get environment-specific overrides if any
  const env = import.meta.env.MODE || 'development';
  
  // Override flags from environment variables
  Object.values(Feature).forEach(feature => {
    const envVar = `VITE_FEATURE_${feature.toUpperCase()}`;
    if (import.meta.env[envVar] !== undefined) {
      flags[feature].enabled = import.meta.env[envVar] === 'true';
    }
    
    // Apply environment restrictions
    if (flags[feature].environment !== 'all' && flags[feature].environment !== env) {
      flags[feature].enabled = false;
    }
  });
  
  return flags;
};

// Context for feature flags
interface FeatureFlagsContextValue {
  flags: Record<Feature, FeatureConfig>;
  isEnabled: (feature: Feature, userId?: string) => boolean;
  setUserIdentity: (id: string) => void;
  overrideFlag: (feature: Feature, enabled: boolean) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

// Provider component
interface FeatureFlagsProviderProps {
  children: ReactNode;
  initialFlags?: Record<Feature, FeatureConfig>;
  userId?: string;
}

export const FeatureFlagsProvider: React.FC<FeatureFlagsProviderProps> = ({
  children,
  initialFlags,
  userId: initialUserId
}) => {
  const [flags, setFlags] = useState<Record<Feature, FeatureConfig>>(
    initialFlags || getEnvironmentFlags()
  );
  const [userId, setUserId] = useState<string | undefined>(initialUserId);
  
  // Check if a feature is enabled for the current user
  const isEnabled = (feature: Feature, userIdOverride?: string): boolean => {
    const userToCheck = userIdOverride || userId;
    const featureConfig = flags[feature];
    
    // If the feature is disabled globally, it's disabled for everyone
    if (!featureConfig.enabled) {
      return false;
    }
    
    // If the user is specifically disabled for this feature
    if (userToCheck && featureConfig.disabledFor?.includes(userToCheck)) {
      return false;
    }
    
    // If the user is specifically enabled for this feature
    if (userToCheck && featureConfig.enabledFor?.includes(userToCheck)) {
      return true;
    }
    
    // If there's a rollout percentage, check if the user falls within it
    if (featureConfig.rolloutPercentage !== undefined && userToCheck) {
      // Create a deterministic hash of the user ID + feature name
      // This ensures a user consistently gets the same features
      const hash = hashString(`${userToCheck}-${feature}`);
      const normalizedHash = (hash % 100) + 100; // Ensure positive 0-99 range
      return normalizedHash % 100 < featureConfig.rolloutPercentage;
    }
    
    // Default to the feature's enabled status
    return featureConfig.enabled;
  };
  
  // Set user identity for targeted feature flags
  const setUserIdentity = (id: string): void => {
    setUserId(id);
  };
  
  // Override a flag (for development/testing)
  const overrideFlag = (feature: Feature, enabled: boolean): void => {
    setFlags(prevFlags => ({
      ...prevFlags,
      [feature]: {
        ...prevFlags[feature],
        enabled
      }
    }));
  };
  
  // Create simple hash function for deterministic feature assignment
  const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return hash;
  };
  
  const value = {
    flags,
    isEnabled,
    setUserIdentity,
    overrideFlag
  };
  
  // @ts-ignore - This is valid JSX but esbuild is having issues parsing it
  return React.createElement(
    FeatureFlagsContext.Provider,
    { value },
    children
  );
};

// Hook for using feature flags
export const useFeatureFlags = (): FeatureFlagsContextValue => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};

// Custom hook for checking individual features
export const useFeature = (feature: Feature, userId?: string): boolean => {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(feature, userId);
};