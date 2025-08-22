import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, UserMinus, Key, UserPlus } from "lucide-react";
import { getAllUsers, getUserCommittees, updateUser } from "@/services/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { User } from "@shared/schema";

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: getAllUsers,
  });

  const activeUsers = users.filter(user => user.role === 'user');

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<User> }) =>
      updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleRemoveUser = (userId: string) => {
    updateUserMutation.mutate({
      userId,
      updates: { role: 'inactive' } // Change role instead of deleting
    });
  };

  const handleResetPin = (userId: string) => {
    // Generate a new random PIN
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    updateUserMutation.mutate({
      userId,
      updates: { pin: newPin }
    });
    toast({
      title: "PIN Reset",
      description: `New PIN generated: ${newPin}`,
    });
  };

  const getStatusBadge = (user: User) => {
    // For demo purposes, assume all users are active
    return <Badge className="bg-accent-green/20 text-accent-green">Active</Badge>;
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map(name => name.charAt(0))
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="flex space-x-2">
          <Button
            className="bg-accent-green/20 text-accent-green hover:bg-accent-green/30"
            data-testid="button-approve-requests"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Approve Requests
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-secondary border-accent-orange/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-accent-orange/10">
                  <TableHead className="text-secondary">User</TableHead>
                  <TableHead className="text-secondary">Committees</TableHead>
                  <TableHead className="text-secondary">Status</TableHead>
                  <TableHead className="text-secondary">Joined</TableHead>
                  <TableHead className="text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-secondary" data-testid="text-no-users">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  activeUsers.map((user) => (
                    <UserRow 
                      key={user.id} 
                      user={user}
                      onViewUser={setSelectedUser}
                      onRemoveUser={handleRemoveUser}
                      onResetPin={handleResetPin}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl bg-primary border-accent-orange/30">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Full Name:</span> {selectedUser.fullName}</p>
                    <p><span className="font-medium">Username:</span> {selectedUser.username}</p>
                    <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedUser.phoneNumber || 'Not provided'}</p>
                    <p><span className="font-medium">CNIC:</span> {selectedUser.cnicNumber || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Role:</span> {selectedUser.role}</p>
                    <p><span className="font-medium">Status:</span> Active</p>
                    <p><span className="font-medium">Joined:</span> {selectedUser.createdAt.toLocaleDateString()}</p>
                    <p><span className="font-medium">Last Updated:</span> {selectedUser.updatedAt.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {selectedUser.verificationStatus && (
                <div>
                  <h4 className="font-semibold">Verification Status</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Verified:</span> {selectedUser.verificationStatus.isVerified ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium">Documents Submitted:</span> {selectedUser.verificationStatus.documentsSubmitted ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium">Admin Reviewed:</span> {selectedUser.verificationStatus.adminReviewed ? 'Yes' : 'No'}</p>
                    {selectedUser.verificationStatus.remarks && (
                      <p><span className="font-medium">Remarks:</span> {selectedUser.verificationStatus.remarks}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UserRowProps {
  user: User;
  onViewUser: (user: User) => void;
  onRemoveUser: (userId: string) => void;
  onResetPin: (userId: string) => void;
}

function UserRow({ user, onViewUser, onRemoveUser, onResetPin }: UserRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userCommittees = [] } = useQuery({
    queryKey: ["/api/users", user.id, "committees"],
    queryFn: () => getUserCommittees(user.id),
  });

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map(name => name.charAt(0))
      .join("")
      .toUpperCase();
  };

  const getStatusBadge = () => {
    return <Badge className="bg-accent-green/20 text-accent-green">Active</Badge>;
  };

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // For now, we'll just disable the user instead of deleting
      await updateUser(userId, { status: 'disabled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Disabled",
        description: "User has been disabled successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disable user",
        variant: "destructive",
      });
    },
  });

  return (
    <TableRow className="border-accent-orange/10" data-testid={`user-row-${user.id}`}>
      <TableCell>
        <div className="flex items-center">
          <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center text-black font-bold mr-3">
            {getInitials(user.fullName)}
          </div>
          <div>
            <div className="font-medium">{user.fullName}</div>
            <div className="text-secondary text-sm">{user.username}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm">
        {userCommittees.length} committees
      </TableCell>
      <TableCell>{getStatusBadge()}</TableCell>
      <TableCell className="text-sm text-secondary">
        {user.createdAt.toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-accent-cyan hover:text-accent-cyan/80"
            onClick={() => onViewUser(user)}
            data-testid={`button-view-${user.id}`}
            title="View User Details"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300"
                data-testid={`button-reset-pin-${user.id}`}
                title="Reset PIN"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Key className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-primary border-accent-orange/30">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset PIN</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to reset the PIN for {user.fullName}? A new PIN will be generated.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onResetPin(user.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reset PIN
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="border-red-500/30 hover:bg-red-500/20 text-red-400"
                data-testid={`button-remove-${user.id}`}
                title="Remove User"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-secondary border-accent-orange/30">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove User</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {user.fullName || user.username}? 
                  This action cannot be undone and will permanently remove all user data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  className="border-accent-orange/30"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    deleteUserMutation.mutate({ userId: user.id });
                    setDeleteDialogOpen(false);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}