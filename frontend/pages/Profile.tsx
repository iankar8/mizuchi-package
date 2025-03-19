
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save } from "lucide-react";
import AuthNavbar from "@/components/layout/AuthNavbar";
import { AnalyticsSettings } from "@/components/analytics/AnalyticsSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Profile = () => {
  const { user, isLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);
  
  const handleSave = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <AuthNavbar />
      
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>
        
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal">
            <div className="bg-white rounded-xl shadow-sm border border-border p-6">
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-medium">Personal Information</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                  >
                    {isEditing ? (
                      <>
                        <Save size={16} />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Edit size={16} />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-md"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your email cannot be changed
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fullName || ""}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <input
                      type="text"
                      value={user?.full_name || ""}
                      disabled
                      className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-md"
                    />
                  )}
                </div>
                
                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preferences">
            <div className="space-y-6">
              <AnalyticsSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
