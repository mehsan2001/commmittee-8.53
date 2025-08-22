import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Banknote, Plus, DollarSign, Check, Trash2, CheckCircle, Upload, Image as ImageIcon } from "lucide-react";
import { getAllPayouts, createPayout, getAllUsers, getAllCommittees, deletePayout, completePayout } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { calculateEarlyPayoutFee, formatCurrency } from "@/utils/feeCalculations";
import type { InsertPayout } from "@shared/schema";
import { UploadService } from "@/services/uploadService";

export default function Payouts() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["/api/payouts"],
    queryFn: getAllPayouts,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: getAllUsers,
  });

  const { data: committees = [] } = useQuery({
    queryKey: ["/api/committees"],
    queryFn: getAllCommittees,
  });

  const selectedCommittee = useMemo(() => {
    return committees.find(c => c.id === selectedCommitteeId);
  }, [committees, selectedCommitteeId]);

  const feeCalculation = useMemo(() => {
    if (!selectedCommittee || !payoutAmount) return null;
    
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount)) return null;

    const slotNumber = selectedCommittee.payoutSlots?.length + 1 || 1;
    const feePercentage = calculateEarlyPayoutFee(selectedCommittee.duration, slotNumber);
    const feeAmount = amount * feePercentage;
    
    return {
      originalAmount: amount,
      feeAmount: feeAmount,
      netAmount: amount - feeAmount,
      formattedFeeAmount: formatCurrency(feeAmount),
      formattedNetAmount: formatCurrency(amount - feeAmount),
      slotNumber
    };
  }, [selectedCommittee, payoutAmount]);

  const createPayoutMutation = useMutation({
    mutationFn: async (payoutData: InsertPayout) => {
      const committee = committees.find(c => c.id === payoutData.committeeId);
      if (!committee) throw new Error('Committee not found');

      const slotNumber = committee.payoutSlots?.length + 1 || 1;
      const feePercentage = calculateEarlyPayoutFee(committee.duration, slotNumber);
      const feeAmount = payoutData.amount * feePercentage;
      const netAmount = payoutData.amount - feeAmount;

      return createPayout({
        ...payoutData,
        amount: netAmount,
        originalAmount: payoutData.amount,
        feeAmount,
        slotNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts"] });
      setIsCreateModalOpen(false);
      setSelectedCommitteeId('');
      setPayoutAmount('');
      setReceiptImage(null);
      setReceiptImageUrl('');
      setUploading(false);
      toast({
        title: "Payout Created",
        description: "Payout has been scheduled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create payout",
        variant: "destructive",
      });
    },
  });

  const deletePayoutMutation = useMutation({
    mutationFn: deletePayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({
        title: "Success",
        description: "Payout deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete payout",
        variant: "destructive",
      });
    },
  });

  const completePayoutMutation = useMutation({
    mutationFn: completePayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({
        title: "Success",
        description: "Payout marked as completed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete payout",
        variant: "destructive",
      });
    },
  });

  const upcomingPayouts = payouts.filter(payout => payout.status === 'pending');
  const recentPayouts = payouts.filter(payout => payout.status === 'completed').slice(0, 10);



  const handleDeletePayout = async (payoutId: string) => {
    if (window.confirm("Are you sure you want to delete this payout? This action cannot be undone.")) {
      deletePayoutMutation.mutate(payoutId);
    }
  };

  const handleCompletePayout = async (payoutId: string) => {
    if (window.confirm("Are you sure you want to mark this payout as completed?")) {
      completePayoutMutation.mutate(payoutId);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!userData) return;
    
    setUploading(true);
    try {
      const validation = UploadService.validateFile(file);
      if (!validation.valid) {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      const url = await UploadService.uploadPaymentReceipt(file, userData.id);
      setReceiptImageUrl(url);
      toast({
        title: "Image uploaded",
        description: "Bank receipt image uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload receipt image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePayout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payoutData: InsertPayout = {
      userId: formData.get("userId") as string,
      committeeId: formData.get("committeeId") as string,
      amount: Number(formData.get("amount")),
      scheduledDate: new Date(formData.get("scheduledDate") as string),
      round: Number(formData.get("round")),
      initiatedBy: userData!.id,
      receiptImageUrl: receiptImageUrl || undefined,
    };

    createPayoutMutation.mutate(payoutData);
  };

  if (isLoading) {
    return <div>Loading payouts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Payout Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-black hover:opacity-90" data-testid="button-initiate-payout">
              <Banknote className="mr-2 h-4 w-4" />
              Initiate Payout
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-secondary border-accent-orange/30 overflow-y-auto max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="gradient-text">Initiate New Payout</DialogTitle>
              <DialogDescription>
                Create a new payout for a user in a specific committee.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePayout} className="space-y-4">
              <div>
                <Label htmlFor="userId">Select User</Label>
                <Select name="userId" required>
                  <SelectTrigger className="bg-primary border-accent-orange/30" data-testid="select-payout-user">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(user => user.role === 'user')
                      .map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="committeeId"> Select Committee</Label>
                <Select 
                  name="committeeId" 
                  required
                  onValueChange={setSelectedCommitteeId}
                >
                  <SelectTrigger className="bg-primary border-accent-orange/30" data-testid="select-payout-committee">
                    <SelectValue placeholder="Select committee" />
                  </SelectTrigger>
                  <SelectContent>
                    {committees
                      .filter(committee => committee.status === 'active')
                      .map(committee => (
                        <SelectItem key={committee.id} value={committee.id}>
                          {committee.name} - Rs {committee.amount} ({committee.duration} months)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount"> Payout Amount (Rs)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-payout-amount"
                />
              </div>
              <div>
                <Label htmlFor="round">Round Number</Label>
                <Input
                  id="round"
                  name="round"
                  type="number"
                  min="1"
                  required
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-payout-round"
                />
              </div>
              {feeCalculation && (
                <div className="bg-primary/30 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Fee Calculation</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Original Amount:</span>
                      <span>Rs {formatCurrency(feeCalculation.originalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Early Payout Fee:</span>
                      <span className="text-red-400">- Rs {feeCalculation.formattedFeeAmount}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t border-accent-orange/20 pt-1">
                      <span>Net Amount:</span>
                      <span className="text-accent-cyan">Rs {feeCalculation.formattedNetAmount}</span>
                    </div>
                    <div className="text-xs text-secondary">
                      Payout Slot: {feeCalculation.slotNumber}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="date"
                  required
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-payout-date"
                />
              </div>
              
              <div>
                <Label htmlFor="receiptImage">Bank Receipt Image</Label>
                <div className="space-y-2">
                  <Input
                    id="receiptImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setReceiptImage(file);
                        handleImageUpload(file);
                      }
                    }}
                    className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                    data-testid="input-receipt-image"
                  />
                  {uploading && (
                    <div className="text-sm text-secondary flex items-center">
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </div>
                  )}
                  {receiptImageUrl && (
                    <div className="mt-2">
                      <img 
                        src={receiptImageUrl} 
                        alt="Bank receipt" 
                        className="max-w-full h-32 object-contain rounded border border-accent-orange/30"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-accent-orange/30"
                  onClick={() => setIsCreateModalOpen(false)}
                  data-testid="button-cancel-payout"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gradient-bg text-primary hover:opacity-90"
                  disabled={createPayoutMutation.isPending}
                  data-testid="button-submit-payout"
                >
                  {createPayoutMutation.isPending ? "Creating..." : "Initiate Payout"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payout Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Banknote className="mr-2 h-5 w-5 text-accent-orange" />
              Upcoming Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPayouts.length === 0 ? (
                <p className="text-secondary text-center py-4" data-testid="text-no-upcoming-payouts">
                  No upcoming payouts scheduled
                </p>
              ) : (
                upcomingPayouts.map((payout) => {
                  const user = users.find(u => u.id === payout.userId);
                  const committee = committees.find(c => c.id === payout.committeeId);
                  
                  return (
                    <div key={payout.id} className="flex items-center justify-between p-3 bg-primary/50 rounded-lg" data-testid={`upcoming-payout-${payout.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center text-primary font-bold">
                          {user?.fullName.split(" ").map(n => n.charAt(0)).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user?.fullName}</p>
                          <p className="text-secondary text-sm">{committee?.name}</p>
                          <p className="text-xs text-secondary">
                            Slot {payout.slotNumber} • {committee?.duration} months
                          </p>
                          {payout.receiptImageUrl && (
                            <p className="text-xs text-accent-cyan">
                              Receipt uploaded
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="font-medium">Rs {formatCurrency(payout.amount)}</p>
                          {payout.feeAmount > 0 && (
                            <p className="text-xs text-red-400">
                              (Fee: -Rs {formatCurrency(payout.feeAmount)})
                            </p>
                          )}
                          <p className="text-secondary text-sm">
                            {payout.scheduledDate.toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                          onClick={() => handleCompletePayout(payout.id)}
                          disabled={completePayoutMutation.isPending}
                          data-testid={`complete-payout-${payout.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
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
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Check className="mr-2 h-5 w-5 text-accent-green" />
              Recent Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayouts.length === 0 ? (
                <p className="text-secondary text-center py-4" data-testid="text-no-recent-payouts">
                  No recent payouts
                </p>
              ) : (
                recentPayouts.map((payout) => {
                  const user = users.find(u => u.id === payout.userId);
                  const committee = committees.find(c => c.id === payout.committeeId);
                  
                  return (
                    <div key={payout.id} className="flex items-center justify-between p-3 bg-primary/50 rounded-lg" data-testid={`recent-payout-${payout.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent-green/20 rounded-full flex items-center justify-center text-accent-green">
                          <Check className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{user?.fullName}</p>
                          <p className="text-secondary text-sm">{committee?.name}</p>
                          <p className="text-xs text-secondary">
                            Slot {payout.slotNumber} • {committee?.duration} months
                          </p>
                          {payout.receiptImageUrl && (
                            <p className="text-xs text-accent-cyan">
                              Receipt uploaded
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="font-medium">Rs {formatCurrency(payout.amount)}</p>
                          {payout.feeAmount > 0 && (
                            <p className="text-xs text-red-400">
                              (Fee: -Rs {formatCurrency(payout.feeAmount)})
                            </p>
                          )}
                          <p className="text-secondary text-sm">
                            {payout.completedDate?.toLocaleDateString()}
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
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
