import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Feature, useFeatureFlags } from '@/lib/feature-flags';
import { supabase } from '@/utils/supabase/client';

export function FeatureFlagDashboard() {
  const { flags, overrideFlag } = useFeatureFlags();
  const [featureStats, setFeatureStats] = useState<Record<string, { 
    enabled_count: number; 
    total_users: number;
    usage_count: number;
  }>>({});
  
  const [editMode, setEditMode] = useState(false);
  const [editedFlags, setEditedFlags] = useState<typeof flags>({...flags});
  
  // Fetch feature usage statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // This is a simplified version - in production, you'd call an API endpoint
        const { data, error } = await supabase
          .from('analytics_events')
          .select('feature, count(*)')
          .eq('event_type', 'feature_usage')
          .group('feature');
        
        if (error) throw error;
        
        const statsByFeature: Record<string, { 
          enabled_count: number; 
          total_users: number;
          usage_count: number;
        }> = {};
        
        // Process data
        data.forEach(item => {
          const feature = item.feature;
          if (feature) {
            statsByFeature[feature] = {
              enabled_count: 0, // This would come from real stats
              total_users: 100, // This is a placeholder
              usage_count: parseInt(item.count)
            };
          }
        });
        
        // Add placeholder stats for all features
        Object.values(Feature).forEach(feature => {
          if (!statsByFeature[feature]) {
            statsByFeature[feature] = {
              enabled_count: 0,
              total_users: 100,
              usage_count: 0
            };
          }
        });
        
        setFeatureStats(statsByFeature);
      } catch (err) {
        console.error("Error fetching feature stats:", err);
      }
    };
    
    fetchStats();
  }, []);
  
  const handleToggleFeature = (feature: Feature) => {
    const currentValue = editedFlags[feature].enabled;
    setEditedFlags({
      ...editedFlags,
      [feature]: {
        ...editedFlags[feature],
        enabled: !currentValue
      }
    });
  };
  
  const handleRolloutChange = (feature: Feature, value: number) => {
    setEditedFlags({
      ...editedFlags,
      [feature]: {
        ...editedFlags[feature],
        rolloutPercentage: value
      }
    });
  };
  
  const handleSaveChanges = () => {
    // Apply changes to feature flags
    Object.entries(editedFlags).forEach(([feature, config]) => {
      overrideFlag(feature as Feature, config.enabled);
    });
    
    setEditMode(false);
  };
  
  const handleCancel = () => {
    setEditedFlags({...flags});
    setEditMode(false);
  };
  
  const getFeatureUsageRate = (feature: string) => {
    const stats = featureStats[feature];
    if (!stats) return '0%';
    
    const enabledPercentage = stats.enabled_count / stats.total_users * 100;
    return `${enabledPercentage.toFixed(1)}%`;
  };
  
  const getFeatureUsageCount = (feature: string) => {
    return featureStats[feature]?.usage_count || 0;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Feature Flags Dashboard</CardTitle>
            <CardDescription>
              Manage and monitor feature rollout for beta users
            </CardDescription>
          </div>
          
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Edit Features</Button>
          ) : (
            <div className="space-x-2">
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSaveChanges}>Save Changes</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Features</TabsTrigger>
            <TabsTrigger value="active">Active Features</TabsTrigger>
            <TabsTrigger value="beta">Beta Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>Complete list of all available features</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Feature</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rollout</TableHead>
                    <TableHead>Usage</TableHead>
                    {editMode && <TableHead>Edit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(editMode ? editedFlags : flags).map(([feature, config]) => (
                    <TableRow key={feature}>
                      <TableCell className="font-medium">{feature.toLowerCase().replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        {config.enabled ? (
                          <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>{config.rolloutPercentage}%</TableCell>
                      <TableCell>
                        {getFeatureUsageCount(feature)} events
                      </TableCell>
                      {editMode && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={config.enabled}
                              onCheckedChange={() => handleToggleFeature(feature as Feature)}
                            />
                            <div className="w-[150px]">
                              <Slider
                                disabled={!config.enabled}
                                value={[config.rolloutPercentage || 0]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={(value) => handleRolloutChange(feature as Feature, value[0])}
                              />
                            </div>
                            <span className="text-xs w-12">{config.rolloutPercentage}%</span>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="active">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(flags)
                .filter(([_, config]) => config.enabled)
                .map(([feature, config]) => (
                  <Card key={feature} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base capitalize">
                        {feature.toLowerCase().replace(/_/g, ' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="grid gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Rollout:</span>
                          <Badge>{config.rolloutPercentage}%</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Usage:</span>
                          <Badge variant="outline">{getFeatureUsageCount(feature)} events</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="beta">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                These features are part of the controlled beta rollout. Monitor performance and user feedback
                before increasing rollout percentages.
              </p>
              
              {/* New beta features section */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  Feature.BULK_IMPORTS,
                  Feature.CUSTOM_WATCHLIST_VIEWS,
                  Feature.ENHANCED_ANALYTICS,
                  Feature.MARKET_ALERTS,
                  Feature.INVESTMENT_IDEAS
                ].map(feature => {
                  const config = flags[feature];
                  return (
                    <Card key={feature} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base capitalize">
                          {String(feature).toLowerCase().replace(/_/g, ' ')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="grid gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            {config.enabled ? (
                              <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                            ) : (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Rollout:</span>
                            <Badge>{config.rolloutPercentage}%</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Usage:</span>
                            <Badge variant="outline">{getFeatureUsageCount(feature)} events</Badge>
                          </div>
                        </div>
                      </CardContent>
                      {editMode && (
                        <CardFooter className="bg-muted/50 p-2">
                          <div className="flex items-center justify-between w-full">
                            <Switch 
                              checked={editedFlags[feature].enabled}
                              onCheckedChange={() => handleToggleFeature(feature)}
                            />
                            <div className="w-[150px]">
                              <Slider
                                disabled={!editedFlags[feature].enabled}
                                value={[editedFlags[feature].rolloutPercentage || 0]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={(value) => handleRolloutChange(feature, value[0])}
                              />
                            </div>
                            <span className="text-xs w-10 text-right">{editedFlags[feature].rolloutPercentage}%</span>
                          </div>
                        </CardFooter>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Feature flags are used to control the rollout of new features to beta users.
          Changes apply immediately and affect all users in the specified rollout percentage.
        </p>
      </CardFooter>
    </Card>
  );
}

export default FeatureFlagDashboard;