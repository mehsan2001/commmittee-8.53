import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, User, Calendar } from "lucide-react";
import { getPendingJoinRequests, approveJoinRequest, rejectJoinRequest, getCommitteeById, getUserById } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { JoinRequest } from "@shared/schema";

interface JoinRequestWithDetails extends JoinRequest {
  userName?: string;
  userEmail?: string;
  committeeName?: string;
  committeeAmount?: number;
}

export default function JoinRequests() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: joinRequests = [], isLoading, error } = useQuery({
    queryKey: ["/api/join-requests", "pending"],
    queryFn: async () => {
      const requests = await getPendingJoinRequests();
      
      // Enhance requests with user and committee details
      const enhancedRequests = await Promise.all(
        requests.map(async (request) => {
          try {
            const [user, committee] = await Promise.all([
              getUserById(request.userId),
              getCommitteeById(request.committeeId)
            ]);
            
            return {
              ...request,
              userName: user?.fullName || user?.username || "Unknown User",
              userEmail: user?.email || "Unknown Email",
              committeeName: committee?.name || "Unknown Committee",
              committeeAmount: committee?.amount || 0,
            };
          } catch (error) {
            console.error("Error fetching details for join request:", error);
            return {
              ...request,
              userName: "Unknown User",
              userEmail: "Unknown Email",
              committeeName: "Unknown Committee",
              committeeAmount: 0,
            };
          }
        })
      );
      
      return enhancedRequests;
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ requestId }: { requestId: string }) => 
      approveJoinRequest(requestId, userData!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
      toast({
        title: "Request Approved",
        description: "User has been added to the committee",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve join request",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId }: { requestId: string }) => 
      rejectJoinRequest(requestId, userData!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
      toast({
        title: "Request Rejected",
        description: "Join request has been rejected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject join request",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (requestId: string) => {
    approveMutation.mutate({ requestId });
  };

  const handleReject = (requestId: string) => {
    rejectMutation.mutate({ requestId });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading join requests...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading join requests: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Join Requests</h2>
        <div className="text-sm text-secondary">
          {joinRequests.length} pending request{joinRequests.length !== 1 ? 's' : ''}
        </div>
      </div>

      {joinRequests.length === 0 ? (
        <Card className="bg-secondary border-accent-orange/30">
          <CardContent className="p-8 text-center">
            <User className="mx-auto h-12 w-12 text-secondary mb-4" />
            <p className="text-secondary">No pending join requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {joinRequests.map((request) => (
            <Card key={request.id} className="bg-secondary border-accent-orange/30">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12 bg-accent-orange/20">
                      <AvatarFallback className="bg-accent-orange/20 text-accent-orange">
                        {getInitials(request.userName || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div>
                        <p className="font-semibold text-lg">{request.userName}</p>
                        <p className="text-sm text-secondary">{request.userEmail}</p>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-secondary">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{request.committeeName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{request.requestedAt.toLocaleDateString()}</span>
                        </div>
                        <Badge className="bg-accent-orange/20 text-accent-orange">
                          ${request.committeeAmount}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className="bg-accent-green/20 text-accent-green hover:bg-accent-green/30"
                      onClick={() => handleApprove(request.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      onClick={() => handleReject(request.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}