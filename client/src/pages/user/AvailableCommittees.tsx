import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Eye, UserPlus, Upload } from "lucide-react";
import { getAvailableCommittees, createJoinRequest, getCommitteeById, getUserJoinRequests, createPayment } from "@/services/firestore";
import { UploadService } from "@/services/uploadService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { JoinRequestDialog } from "@/components/JoinRequestDialog";
import type { Committee, JoinRequest } from "@shared/schema";

export default function AvailableCommittees() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [amountFilter, setAmountFilter] = useState("all");
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCommitteeId, setPaymentCommitteeId] = useState<string>('');
  const [joinRequestDialogOpen, setJoinRequestDialogOpen] = useState(false);
  const [committeeForJoin, setCommitteeForJoin] = useState<Committee | null>(null);
  const [paymentImage, setPaymentImage] = useState<File | null>(null);
  const [paymentImageUrl, setPaymentImageUrl] = useState<string>('');
  const [uploadingPaymentImage, setUploadingPaymentImage] = useState(false);

  const userJoinRequestsQuery = useQuery({
    queryKey: ["/api/user-join-requests", userData?.id],
    queryFn: () => getUserJoinRequests(userData!.id),
    enabled: !!userData?.id,
  });

  const { data: committees = [], isLoading, error } = useQuery({
    queryKey: ["/api/committees", "available"],
    queryFn: getAvailableCommittees,
  });



  // Debug logging
  console.log("AvailableCommittees data:", committees);
  console.log("Loading:", isLoading);
  console.log("Error:", error);

  const joinRequestMutation = useMutation({
    mutationFn: ({ committeeId, preferredSlot }: { committeeId: string; preferredSlot: number }) => {
      if (!userData) {
        throw new Error("User data not available");
      }
      return createJoinRequest({
        userId: userData.id,
        committeeId,
        preferredPayoutSlot: preferredSlot,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-join-requests", userData?.id] });
      toast({
        title: "Join Request Sent",
        description: "Your request to join the committee has been submitted with your preferred payout slot",
      });
      setJoinRequestDialogOpen(false);
      setCommitteeForJoin(null);
    },
    onError: (error) => {
      console.error("Join request error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send join request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-payments"] });
      setIsPaymentModalOpen(false);
      toast({
        title: "Success!",
        description: "Your payment has been submitted for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOpenPaymentModal = (committeeId: string) => {
    setPaymentCommitteeId(committeeId);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentImageUpload = async (file: File) => {
    if (!file) return;

    const validation = UploadService.validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setUploadingPaymentImage(true);
    try {
      const response = await UploadService.uploadToLocal(file);
      setPaymentImageUrl(response.url);
      toast({
        title: "Success!",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingPaymentImage(false);
    }
  };

  const handleSubmitPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const paymentData = {
      userId: userData!.id,
      committeeId: paymentCommitteeId,
      amount: parseFloat(formData.get('amount') as string),
      remarks: formData.get('remarks') as string,
      receiptUrl: paymentImageUrl || (formData.get('receiptUrl') as string || ''),
    };

    paymentMutation.mutate(paymentData);
  };

  const getJoinRequestStatus = (committeeId: string): string => {
    const userRequests = userJoinRequestsQuery.data || [];
    const request = userRequests.find(req => req.committeeId === committeeId);
    return request?.status || 'none';
  };

  const isRequestApproved = (committeeId: string): boolean => {
    return getJoinRequestStatus(committeeId) === 'approved';
  };

  const filteredCommittees = committees.filter((committee) => {
    const matchesSearch = committee.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    let matchesAmount = true;
    
    if (amountFilter !== "all") {
      const amount = committee.amount;
      switch (amountFilter) {
        case "100-500":
          matchesAmount = amount >= 100 && amount <= 500;
          break;
        case "500-1000":
          matchesAmount = amount > 500 && amount <= 1000;
          break;
        case "1000+":
          matchesAmount = amount > 1000;
          break;
      }
    }
    
    return matchesSearch && matchesAmount;
  });

  const handleViewDetails = async (committee: Committee) => {
    setSelectedCommittee(committee);
    setDetailsModalOpen(true);
  };



  const handleJoinRequestSubmit = (committeeId: string, preferredSlot: number) => {
    joinRequestMutation.mutate({ committeeId, preferredSlot });
  };

  const handleJoinRequest = (committee: Committee) => {
    if (!userData) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send a join request",
        variant: "destructive",
      });
      return;
    }

    // Check user verification status
    const verificationStatus = userData.verificationStatus;
    const isVerified = verificationStatus?.isVerified === true && 
                      verificationStatus?.adminReviewed === true &&
                      verificationStatus?.documentsSubmitted === true;

    if (!isVerified) {
      toast({
        title: "Verification Required",
        description: "You must complete profile verification and get admin approval before joining committees. Please complete your profile in Settings.",
        variant: "destructive",
      });
      return;
    }

    setCommitteeForJoin(committee);
    setJoinRequestDialogOpen(true);
  };

  if (isLoading || authLoading) {
    return <div>Loading available committees...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-red-500">
          Error loading committees: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/committees", "available"] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verification Status Alert */}
      {userData && (!userData.verificationStatus?.isVerified || !userData.verificationStatus?.adminReviewed) && (
        <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent-orange rounded-full"></div>
            <span className="text-accent-orange font-medium">Verification Required</span>
          </div>
          <p className="text-secondary text-sm mt-1">
            Complete your profile verification in Settings to join committees. 
            {!userData.verificationStatus?.documentsSubmitted && " Upload required documents and"}
            {userData.verificationStatus?.documentsSubmitted && !userData.verificationStatus?.adminReviewed && " Wait for"}
            {" admin approval is needed."}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Available Committees</h2>
        <div className="flex space-x-2">
          <Input
            placeholder="Search committees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 bg-secondary border-accent-orange/30 focus:border-accent-cyan"
            data-testid="input-search-committees"
          />
          <Select value={amountFilter} onValueChange={setAmountFilter}>
            <SelectTrigger className="w-48 bg-secondary border-accent-orange/30" data-testid="select-amount-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Amounts</SelectItem>
              <SelectItem value="100-500">Rs 100-500</SelectItem>
              <SelectItem value="500-1000">Rs 500-1000</SelectItem>
              <SelectItem value="1000+">Rs 1000+</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/committees", "available"] })}
            variant="outline"
            className="border-accent-orange/30"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Available Committees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCommittees.length === 0 ? (
          <div className="col-span-full">
            <Card className="bg-secondary border-accent-orange/30">
              <CardContent className="p-8 text-center">
                <p className="text-secondary" data-testid="text-no-committees">
                  No committees available matching your criteria
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredCommittees.map((committee) => (
            <Card key={committee.id} className="bg-secondary border-accent-orange/30" data-testid={`committee-card-${committee.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{committee.name}</h3>
                  {isRequestApproved(committee.id) ? (
                    <Badge className="bg-accent-green/20 text-accent-green">Approved</Badge>
                  ) : getJoinRequestStatus(committee.id) === 'pending' ? (
                    <Badge className="bg-accent-orange/20 text-accent-orange">Pending</Badge>
                  ) : getJoinRequestStatus(committee.id) === 'rejected' ? (
                    <Badge className="bg-accent-red/20 text-accent-red">Rejected</Badge>
                  ) : (
                    <Badge className="bg-accent-green/20 text-accent-green">Open</Badge>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-secondary text-sm">
                    Monthly Payment: <span className="text-primary font-medium">Rs {committee.amount}</span>
                  </p>
                  <p className="text-secondary text-sm">
                    Duration: <span className="text-primary font-medium">{committee.duration} months</span>
                  </p>
                  <p className="text-secondary text-sm">
                    Members: <span className="text-primary font-medium">{committee.members.length}/{committee.memberCount}</span>
                  </p>
                  <p className="text-secondary text-sm">
                    Start Date: <span className="text-primary font-medium">{committee.startDate.toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="flex space-x-2">
                  {isRequestApproved(committee.id) ? (
                    <Button
                      variant="gradient"
                      className="flex-1"
                      onClick={() => handleOpenPaymentModal(committee.id)}
                      data-testid={`button-make-payment-${committee.id}`}
                    >
                      Make Payment
                    </Button>
                  ) : getJoinRequestStatus(committee.id) === 'pending' ? (
                    <Button
                      className="flex-1 bg-gray-500 text-white cursor-not-allowed"
                      disabled
                      data-testid={`button-pending-${committee.id}`}
                    >
                      Request Pending
                    </Button>
                  ) : getJoinRequestStatus(committee.id) === 'rejected' ? (
                    <Button
                      className="flex-1 bg-gray-500 text-white cursor-not-allowed"
                      disabled
                      data-testid={`button-rejected-${committee.id}`}
                    >
                      Request Rejected
                    </Button>
                  ) : (
                    <Button
                    className="flex-1 gradient-bg text-primary hover:opacity-90"
                    onClick={() => handleJoinRequest(committee)}
                    disabled={joinRequestMutation.isPending || !userData?.verificationStatus?.isVerified || !userData?.verificationStatus?.adminReviewed}
                    data-testid={`button-join-${committee.id}`}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {!userData?.verificationStatus?.isVerified || !userData?.verificationStatus?.adminReviewed 
                      ? "Verification Required" 
                      : joinRequestMutation.isPending ? "Requesting..." : "Request to Join"}
                  </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-accent-orange/30 hover:bg-primary/50"
                    onClick={() => handleViewDetails(committee)}
                    data-testid={`button-view-${committee.id}`}
                  >
                    <Eye className="h-4 w-4 text-accent-cyan" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Committee Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30">
          <DialogHeader>
            <DialogTitle className="gradient-text">Committee Details</DialogTitle>
            <DialogDescription>
              View detailed information about this committee and its members.
            </DialogDescription>
          </DialogHeader>
          {selectedCommittee && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedCommittee.name}</h3>
                {isRequestApproved(selectedCommittee.id) ? (
                  <Badge className="bg-accent-green/20 text-accent-green mt-2">Approved</Badge>
                ) : getJoinRequestStatus(selectedCommittee.id) === 'pending' ? (
                  <Badge className="bg-accent-orange/20 text-accent-orange mt-2">Pending Approval</Badge>
                ) : getJoinRequestStatus(selectedCommittee.id) === 'rejected' ? (
                  <Badge className="bg-accent-red/20 text-accent-red mt-2">Rejected</Badge>
                ) : (
                  <Badge className="bg-accent-green/20 text-accent-green mt-2">{selectedCommittee.status}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-secondary text-sm">Monthly Payment</p>
                  <p className="font-medium">Rs {selectedCommittee.amount}</p>
                </div>
                <div>
                  <p className="text-secondary text-sm">Duration</p>
                  <p className="font-medium">{selectedCommittee.duration} months</p>
                </div>
                <div>
                  <p className="text-secondary text-sm">Total Members</p>
                  <p className="font-medium">{selectedCommittee.memberCount}</p>
                </div>
                <div>
                  <p className="text-secondary text-sm">Current Members</p>
                  <p className="font-medium">{selectedCommittee.members.length}</p>
                </div>
                <div>
                  <p className="text-secondary text-sm">Start Date</p>
                  <p className="font-medium">{selectedCommittee.startDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-secondary text-sm">Current Round</p>
                  <p className="font-medium">{selectedCommittee.currentRound}</p>
                </div>
              </div>
              <div className="pt-4">
                {isRequestApproved(selectedCommittee.id) ? (
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={() => {
                      handleOpenPaymentModal(selectedCommittee.id);
                      setDetailsModalOpen(false);
                    }}
                    data-testid="button-make-payment-from-modal"
                  >
                    Make Payment
                  </Button>
                ) : getJoinRequestStatus(selectedCommittee.id) === 'pending' ? (
                  <Button
                    className="w-full bg-gray-500 text-white cursor-not-allowed"
                    disabled
                    data-testid="button-pending-from-modal"
                  >
                    Request Pending
                  </Button>
                ) : getJoinRequestStatus(selectedCommittee.id) === 'rejected' ? (
                  <Button
                    className="w-full bg-gray-500 text-white cursor-not-allowed"
                    disabled
                    data-testid="button-rejected-from-modal"
                  >
                    Request Rejected
                  </Button>
                ) : (
                  <Button
                    className="w-full gradient-bg text-primary hover:opacity-90"
                    onClick={() => {
                      handleJoinRequest(selectedCommittee);
                      setDetailsModalOpen(false);
                    }}
                    disabled={joinRequestMutation.isPending}
                    data-testid="button-join-from-modal"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {joinRequestMutation.isPending ? "Requesting..." : "Request to Join"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30">
          <DialogHeader>
            <DialogTitle className="gradient-text">Submit Payment</DialogTitle>
            <DialogDescription>
              Submit your payment details for verification by the admin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div>
              <Label htmlFor="payment-amount">Amount (Rs)</Label>
              <Input
                id="payment-amount"
                name="amount"
                type="number"
                step="0.01"
                required
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                data-testid="input-payment-amount"
              />
            </div>
            <div>
              <Label htmlFor="payment-details">Payment Details</Label>
              <Textarea
                id="payment-details"
                name="remarks"
                required
                placeholder="Enter payment details (e.g., transaction ID, payment method, date, etc.)"
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan min-h-[100px]"
                data-testid="input-payment-details"
              />
            </div>
            <div>
              <Label htmlFor="receipt-url">Receipt URL (optional)</Label>
              <Input
                id="receipt-url"
                name="receiptUrl"
                type="url"
                placeholder="https://example.com/receipt.jpg"
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                data-testid="input-receipt-url"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-accent-orange/30"
                onClick={() => setIsPaymentModalOpen(false)}
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 gradient-bg text-primary hover:opacity-90"
                disabled={paymentMutation.isPending}
                data-testid="button-confirm-payment"
              >
                {paymentMutation.isPending ? "Submitting..." : "Submit Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Request Dialog */}
      <JoinRequestDialog
        committee={committeeForJoin}
        open={joinRequestDialogOpen}
        onOpenChange={setJoinRequestDialogOpen}
        onSubmit={handleJoinRequestSubmit}
        isLoading={joinRequestMutation.isPending}
      />
    </div>
  );
}
