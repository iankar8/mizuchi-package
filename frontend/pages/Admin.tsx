import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/context/auth';
import BetaUserManagement from '@/components/admin/BetaUserManagement';
import FeatureFlagDashboard from '@/components/admin/FeatureFlagDashboard';

export function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect non-admin users
  useEffect(() => {
    if (user === null) {
      // User is not logged in
      navigate('/login');
    } else if (user && !isAdmin) {
      // User is logged in but not an admin
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  // If still checking auth status or user is not admin, don't render admin content
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage Mizuchi beta program</p>
      </div>

      <Tabs defaultValue="beta" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="beta">Beta Program</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="beta">
          <BetaUserManagement />
        </TabsContent>
        
        <TabsContent value="features">
          <FeatureFlagDashboard />
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground">
              Analytics dashboard will be available in the next update.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-lg font-medium mb-2">Admin Settings</h3>
            <p className="text-muted-foreground">
              Admin settings will be available in the next update.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Admin;
