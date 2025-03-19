import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAnalytics } from '@/hooks/use-analytics';
import { useToast } from '@/hooks/use-toast';

/**
 * Component to let users control their analytics preferences
 */
export function AnalyticsSettings() {
  const { isAnalyticsEnabled, setAnalyticsEnabled } = useAnalytics();
  const [enabled, setEnabled] = useState<boolean>(true);
  const { toast } = useToast();
  
  // Initialize with current setting
  useEffect(() => {
    setEnabled(isAnalyticsEnabled());
  }, [isAnalyticsEnabled]);
  
  // Handle toggling analytics
  const handleToggleAnalytics = (checked: boolean) => {
    setEnabled(checked);
    setAnalyticsEnabled(checked);
    
    toast({
      title: checked ? 'Analytics Enabled' : 'Analytics Disabled',
      description: checked 
        ? 'Your usage data will help us improve the app'
        : 'Your usage data will no longer be collected',
      duration: 3000,
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Analytics</CardTitle>
        <CardDescription>
          Control how we collect data about your app usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="analytics-toggle">Enable Analytics</Label>
            <p className="text-sm text-muted-foreground">
              Help us improve by sharing anonymous usage data
            </p>
          </div>
          <Switch
            id="analytics-toggle"
            checked={enabled}
            onCheckedChange={handleToggleAnalytics}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">When enabled, we collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pages you visit in the app</li>
            <li>Features you use</li>
            <li>App performance data</li>
            <li>Error information</li>
          </ul>
          <p className="mt-2">
            We never collect sensitive financial information or personal data beyond what's necessary
            for the service to function.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}