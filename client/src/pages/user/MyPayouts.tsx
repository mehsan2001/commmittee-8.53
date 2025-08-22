import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Calendar, CheckCircle, Clock, Trash2, Eye } from "lucide-react";
import { getUserPayouts, getUserCommittees, deletePayout } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/feeCalculations";
import type { Payout } from "@shared/schema";

export default function MyPayouts() {
  const { currentUser, userData } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["/api/users", userData?.id, "payouts"],
    queryFn: () => getUserPayouts(userData!.id),
    enabled: !!userData,
  });

  const deletePayoutMutation = useMutation({
    mutationFn: deletePayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userData?.id, "payouts"] });
      toast({
        title: "Payout deleted",
        description: "The payout has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting payout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (payout: Payout) => {
    setSelectedPayout(payout);
    setIsDetailsModalOpen(true);
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const handleDeletePayout = async (payoutId: string) => {
    if (window.confirm("Are you sure you want to delete this payout? This action cannot be undone.")) {
      deletePayoutMutation.mutate(payoutId);
    }
  };

  const { data: userCommittees = [] } = useQuery({
    queryKey: ["/api/users", userData?.id, "committees"],
    queryFn: () => getUserCommittees(userData!.id),
    enabled: !!userData,
  });

  const pendingPayouts = payouts.filter(payout => payout.status === 'pending');
  const completedPayouts = payouts.filter(payout => payout.status === 'completed');
  const totalReceived = completedPayouts.reduce((sum, payout) => sum + payout.amount, 0);
  const totalPending = pendingPayouts.reduce((sum, payout) => sum + payout.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent-green/20 text-accent-green">Completed</Badge>;
      case "pending":
        return <Badge className="bg-accent-orange/20 text-accent-orange">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div>Loading payouts...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">My Payouts</h2>

        {/* Payout Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-secondary border-accent-orange/30" data-testid="card-total-received">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm">Total Received</p>
                  <p className="text-2xl font-bold text-accent-green" data-testid="text-total-received">
                    Rs {totalReceived.toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-accent-green/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary border-accent-orange/30" data-testid="card-pending-amount">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm">Pending Amount</p>
                  <p className="text-2xl font-bold text-accent-orange" data-testid="text-pending-amount">
                    Rs {totalPending.toLocaleString()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-accent-orange/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary border-accent-orange/30" data-testid="card-total-payouts">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm">Total Payouts</p>
                  <p className="text-2xl font-bold text-primary" data-testid="text-total-payouts">
                    {payouts.length}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-secondary/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Payouts */}
        {pendingPayouts.length > 0 && (
          <Card className="bg-secondary border-accent-orange/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-accent-orange" />
                Upcoming Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayouts.map((payout) => {
                  const committee = userCommittees.find(c => c.id === payout.committeeId);
                  return (
                      <div key={payout.id} className="flex items-center justify-between p-4 bg-primary/50 rounded-lg" data-testid={`upcoming-payout-${payout.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-accent-orange/20 rounded-full flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-accent-orange" />
                          </div>
                          <div>
                            <p className="font-medium">{committee?.name || "Unknown Committee"}</p>
                            <p className="text-secondary text-sm">Round {payout.round} • Slot {payout.slotNumber}</p>
                            {payout.feeAmount > 0 && (
                              <p className="text-xs text-red-400">
                                Fee: Rs {formatCurrency(payout.feeAmount)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <p className="font-medium text-lg">Rs {formatCurrency(payout.amount)}</p>
                            {payout.originalAmount && payout.feeAmount > 0 && (
                              <p className="text-xs text-secondary">
                                Original: Rs {formatCurrency(payout.originalAmount)}
                              </p>
                            )}
                            <p className="text-secondary text-sm">
                              {payout.scheduledDate.toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            onClick={() => handleDeletePayout(payout.id)}
                            disabled={deletePayoutMutation.isPending}
                            data-testid={`delete-payout-${payout.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payout History */}
        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-accent-orange/10">
                    <TableHead className="text-secondary">Committee</TableHead>
                    <TableHead className="text-secondary">Round</TableHead>
                    <TableHead className="text-secondary">Slot</TableHead>
                    <TableHead className="text-secondary">Amount</TableHead>
                    <TableHead className="text-secondary">Fee</TableHead>
                    <TableHead className="text-secondary">Scheduled Date</TableHead>
                    <TableHead className="text-secondary">Status</TableHead>
                    <TableHead className="text-secondary">Completed Date</TableHead>
                    <TableHead className="text-secondary">Receipt</TableHead>
                    <TableHead className="text-secondary">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-secondary" data-testid="text-no-payouts">
                        No payout history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => {
                      const committee = userCommittees.find(c => c.id === payout.committeeId);
                      return (
                        <TableRow key={payout.id} className="border-accent-orange/10" data-testid={`payout-row-${payout.id}`}>
                          <TableCell className="font-medium">
                            {committee?.name || "Unknown Committee"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {payout.round}
                          </TableCell>
                          <TableCell className="text-sm">
                            {payout.slotNumber || 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            Rs {formatCurrency(payout.amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {payout.feeAmount > 0 ? (
                              <span className="text-red-400">
                                -Rs {formatCurrency(payout.feeAmount)}
                              </span>
                            ) : (
                              <span className="text-secondary">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {payout.scheduledDate.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payout.status)}
                          </TableCell>
                          <TableCell className="text-sm text-secondary">
                            {payout.completedDate ? payout.completedDate.toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            {payout.receiptImageUrl ? (
                              <img
                                src={payout.receiptImageUrl}
                                alt="Payout Receipt"
                                className="rounded-lg w-16 h-16 object-cover cursor-pointer"
                                onClick={() => handleImageClick(payout.receiptImageUrl!)}
                              />
                            ) : (
                              <span className="text-secondary">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-accent-cyan hover:text-accent-cyan/80 hover:bg-accent-cyan/10"
                                onClick={() => handleViewDetails(payout)}
                                data-testid={`view-payout-${payout.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                onClick={() => handleDeletePayout(payout.id)}
                                disabled={deletePayoutMutation.isPending}
                                data-testid={`delete-payout-${payout.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {payouts.length === 0 && (
          <Card className="bg-secondary border-accent-orange/30">
            <CardContent className="p-8 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-secondary/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payouts Yet</h3>
              <p className="text-secondary mb-4">
                You haven't received any payouts yet. Join committees and make payments to be eligible for payouts.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedPayout && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="bg-secondary border-accent-orange/30 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="gradient-text">Payout Details</DialogTitle>
              <DialogDescription>
                Complete payout information including fee breakdown
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Payout ID:</Label>
                    <p className="text-sm text-primary font-mono">{selectedPayout.id}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Status:</Label>
                    <div className="mt-1">{getStatusBadge(selectedPayout.status)}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Committee:</Label>
                    <p className="text-sm text-primary">
                      {userCommittees.find(c => c.id === selectedPayout.committeeId)?.name || "Unknown Committee"}
                    </p>
                  </div>
                  <div>
                    <Label className="font-semibold">Round:</Label>
                    <p className="text-sm text-primary">{selectedPayout.round}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Payout Slot:</Label>
                    <p className="text-sm text-primary">#{selectedPayout.slotNumber}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Scheduled Date:</Label>
                    <p className="text-sm text-primary">
                      {selectedPayout.scheduledDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div className="bg-primary/30 p-4 rounded-lg space-y-3">
                  <h4 className="font-medium text-sm">Payout Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Original Amount:</span>
                      <span className="font-medium">
                        Rs {formatCurrency(selectedPayout.originalAmount || selectedPayout.amount)}
                      </span>
                    </div>
                    {selectedPayout.feeAmount > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Early Payout Fee:</span>
                          <span className="text-red-400 font-medium">
                            - Rs {formatCurrency(selectedPayout.feeAmount)}
                          </span>
                        </div>
                        <div className="border-t border-accent-orange/20 pt-2">
                          <div className="flex justify-between font-medium">
                            <span>Net Amount Received:</span>
                            <span className="text-accent-cyan">
                              Rs {formatCurrency(selectedPayout.amount)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    {selectedPayout.feeAmount === 0 && (
                      <div className="flex justify-between font-medium">
                        <span>Full Amount:</span>
                        <span className="text-accent-cyan">
                          Rs {formatCurrency(selectedPayout.amount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                {selectedPayout.completedDate && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Completed Date:</Label>
                      <p className="text-sm text-primary">
                        {selectedPayout.completedDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
				{selectedPayout.receiptImageUrl && (
                  <div className="mt-4">
                    <Label className="font-semibold">Payout Receipt:</Label>
                    <img
                      src={selectedPayout.receiptImageUrl}
                      alt="Payout Receipt"
                      className="rounded-lg w-full h-auto object-cover cursor-pointer mt-2"
                      onClick={() => handleImageClick(selectedPayout.receiptImageUrl!)}
                    />
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      )}
	  <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30 max-w-3xl">
          <img src={selectedImage} alt="Payout Receipt" className="max-w-full h-auto" />
        </DialogContent>
      </Dialog>
    </>
  );
}
