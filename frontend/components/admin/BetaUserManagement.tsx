import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Plus, RefreshCw, Mail, Download, Search } from "lucide-react";
import betaUserService, { BetaUser, BetaFeedback } from '@/services/betaUserService';

export function BetaUserManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [newInvite, setNewInvite] = useState({ name: '', email: '' });
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isBulkInviteDialogOpen, setIsBulkInviteDialogOpen] = useState(false);
  const [bulkInviteEmails, setBulkInviteEmails] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [feedbackPage, setFeedbackPage] = useState(1);

  useEffect(() => {
    fetchBetaUsers();
    fetchFeedback();
  }, [page, pageSize, feedbackPage]);

  const fetchBetaUsers = async () => {
    try {
      setLoading(true);
      const result = await betaUserService.getAllBetaUsers(page, pageSize);
      setUsers(result.users);
      setUserCount(result.count);
    } catch (error) {
      console.error("Error fetching beta users:", error);
      toast({
        title: "Failed to load users",
        description: "There was an error loading the beta users.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const result = await betaUserService.getAllFeedback(feedbackPage, pageSize);
      setFeedback(result.feedback);
      setFeedbackCount(result.count);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    }
  };

  const handleCreateInvite = async () => {
    try {
      if (!newInvite.name.trim() || !newInvite.email.trim()) {
        toast({
          title: "Missing information",
          description: "Please provide both name and email.",
          variant: "destructive"
        });
        return;
      }

      // Generate invite code - now an async function that ensures uniqueness
      const inviteCode = await betaUserService.generateInviteCode();
      
      // Create beta invite
      const result = await betaUserService.createBetaInvite({
        name: newInvite.name,
        email: newInvite.email,
        inviteCode
      });

      if (result) {
        toast({
          title: "Invite created",
          description: `Invite code ${inviteCode} created for ${newInvite.email}`,
          variant: "default"
        });
        
        // Reset form and close dialog
        setNewInvite({ name: '', email: '' });
        setIsInviteDialogOpen(false);
        
        // Refresh user list
        fetchBetaUsers();
      } else {
        throw new Error("Failed to create invite");
      }
    } catch (error) {
      console.error("Error creating invite:", error);
      toast({
        title: "Invite creation failed",
        description: "There was an error creating the invite.",
        variant: "destructive"
      });
    }
  };
  
  const handleCreateBulkInvites = async () => {
    try {
      if (!bulkInviteEmails.trim()) {
        toast({
          title: "Missing information",
          description: "Please provide at least one email address.",
          variant: "destructive"
        });
        return;
      }
      
      // Parse emails (format expected: Name <email@example.com>, one per line)
      const emailLines = bulkInviteEmails.split('\n').filter(line => line.trim());
      const invites: Array<{name: string, email: string}> = [];
      
      const emailRegex = /^([^<]+)?<?([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)>?$/;
      
      for (const line of emailLines) {
        const match = line.trim().match(emailRegex);
        
        if (match) {
          const name = match[1] ? match[1].trim() : match[2].split('@')[0];
          const email = match[2].trim();
          invites.push({ name, email });
        } else {
          toast({
            title: "Invalid email format",
            description: `Could not parse: ${line}`,
            variant: "destructive"
          });
          return;
        }
      }
      
      // Create bulk invites
      const result = await betaUserService.createBulkInvites(invites);
      
      toast({
        title: "Bulk invites created",
        description: `Successfully created ${result.success} invites. Failed: ${result.failed}`,
        variant: "default"
      });
      
      // Reset form and close dialog
      setBulkInviteEmails('');
      setIsBulkInviteDialogOpen(false);
      
      // Refresh user list
      fetchBetaUsers();
    } catch (error) {
      console.error("Error creating bulk invites:", error);
      toast({
        title: "Bulk invite creation failed",
        description: "There was an error creating the invites.",
        variant: "destructive"
      });
    }
  };

  const exportUsers = () => {
    try {
      // Convert users to CSV
      const headers = ["Name", "Email", "Status", "Invite Code", "Invited At", "Registered At", "Last Active"];
      const csvContent = [
        headers.join(","),
        ...users.map(user => [
          user.name,
          user.email,
          user.status,
          user.inviteCode,
          user.invitedAt,
          user.registeredAt || "",
          user.lastActiveAt || ""
        ].join(","))
      ].join("\n");
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `mizuchi-beta-users-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting users:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the user data.",
        variant: "destructive"
      });
    }
  };

  // Client-side filtering of the current page only
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.inviteCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle pagination changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  // Handle feedback pagination changes
  const handleFeedbackPageChange = (newPage: number) => {
    setFeedbackPage(newPage);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'invited':
        return <Badge variant="outline">Invited</Badge>;
      case 'registered':
        return <Badge variant="secondary">Registered</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Beta User Management</CardTitle>
            <CardDescription>Manage beta users and invitations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchBetaUsers}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportUsers}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
            
            {/* Single invite dialog */}
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus size={16} className="mr-2" />
                  New Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Beta Invite</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join the Mizuchi beta program.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input
                      id="name"
                      placeholder="Enter user's name"
                      value={newInvite.name}
                      onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter user's email"
                      value={newInvite.email}
                      onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvite}>
                    Create Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Bulk invite dialog */}
            <Dialog open={isBulkInviteDialogOpen} onOpenChange={setIsBulkInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus size={16} className="mr-2" />
                  Bulk Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Bulk Invites</DialogTitle>
                  <DialogDescription>
                    Invite multiple users to the Mizuchi beta program.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="bulkEmails" className="text-sm font-medium">
                      Email Addresses (one per line)
                    </label>
                    <div className="text-xs text-muted-foreground mb-2">
                      Format: Name &lt;email@example.com&gt; or just email@example.com
                    </div>
                    <textarea
                      id="bulkEmails"
                      rows={8}
                      className="w-full p-2 border rounded-md"
                      placeholder="John Doe <john@example.com>\njane@example.com"
                      value={bulkInviteEmails}
                      onChange={(e) => setBulkInviteEmails(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBulkInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBulkInvites}>
                    Create Invites
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <div className="flex mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1 py-0.5 text-sm">
                            {user.inviteCode}
                          </code>
                        </TableCell>
                        <TableCell>{new Date(user.invitedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {user.lastActiveAt 
                            ? new Date(user.lastActiveAt).toLocaleDateString() 
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Mail size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredUsers.length} of {userCount} users (page {page} of {Math.ceil(userCount / pageSize)})
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(page - 1)} 
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(page + 1)} 
                  disabled={page >= Math.ceil(userCount / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="feedback">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No feedback received yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedback.map((item) => {
                      const user = users.find(u => u.id === item.userId);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {user ? user.name : "Unknown User"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.rating >= 4 ? "default" : item.rating >= 3 ? "secondary" : "destructive"}>
                              {item.rating}/5
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.category}
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {item.feedback}
                          </TableCell>
                          <TableCell>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Feedback Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {feedback.length} of {feedbackCount} feedback items (page {feedbackPage} of {Math.ceil(feedbackCount / pageSize)})
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleFeedbackPageChange(feedbackPage - 1)} 
                  disabled={feedbackPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleFeedbackPageChange(feedbackPage + 1)} 
                  disabled={feedbackPage >= Math.ceil(feedbackCount / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default BetaUserManagement;
