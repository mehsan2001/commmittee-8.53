import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon } from "lucide-react";
import { getUserPaymentsWithDetails, getUserCommittees, createPayment, deletePayment } from "@/services/firestore";
import { UploadService } from "@/services/uploadService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { InsertPayment } from "@shared/schema";


export default function MyPayments() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);


  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/users", userData?.id, "payments"],
    queryFn: () => {
      console.log("Fetching payments for userId:", userData?.id);
      console.log("Current user Firestore ID:", userData?.id);
      console.log("Expected payment userId should be:", userData?.id);
      return getUserPaymentsWithDetails(userData!.id);
    },
    enabled: !!userData,
  });

  console.log("Payments data:", payments);
  console.log("Total payments found:", payments.length);

  const { data: userCommittees = [] } = useQuery({
    queryKey: ["/api/users", userData?.id, "committees"],
    queryFn: () => getUserCommittees(userData!.id),
    enabled: !!userData,
  });

  const submitPaymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userData?.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setIsSubmitModalOpen(false);
      setReceiptImage(null);
      setReceiptImageUrl('');
      setUploading(false);
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted for review",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit payment",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userData?.id, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Payment Deleted",
        description: "Payment has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      });
    },
  });



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

  const handleSubmitPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userData) return;

    const formData = new FormData(e.currentTarget);

    const paymentData: InsertPayment = {
      userId: userData!.id,
      committeeId: formData.get("committeeId") as string,
      amount: Number(formData.get("amount")),
      remarks: formData.get("details") as string,
      receiptUrl: receiptImageUrl || undefined,
    };

    submitPaymentMutation.mutate(paymentData);
  };



  const handleDeletePayment = (paymentId: string) => {
    deletePaymentMutation.mutate(paymentId);
  };

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
    setIsDetailModalOpen(true);
  };

  const getFilteredAndSortedPayments = () => {
    if (!payments) return [];
    
    let filtered = [...payments];
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all' && statusFilter !== '') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'date-desc':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case 'amount-asc':
          return a.amount - b.amount;
        case 'amount-desc':
          return b.amount - a.amount;
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-accent-green/20 text-accent-green">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
      case "pending":
        return <Badge className="bg-accent-orange/20 text-accent-orange">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (paymentsLoading) {
    return <div>Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">My Payments</h2>
        <div className="flex space-x-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-[180px] px-3 py-2 border rounded-md text-sm">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value)}
          >
            <SelectTrigger className="w-[180px] px-3 py-2 border rounded-md text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="amount-desc">Amount (High-Low)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low-High)</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg text-black hover:opacity-90" data-testid="button-submit-payment">
                Submit Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-secondary border-accent-orange/30 overflow-y-auto max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="gradient-text">Submit Payment</DialogTitle>
                <DialogDescription>
                  Submit your payment details for verification by the admin.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div>
                  <Label htmlFor="committeeId">Select Committee</Label>
                  <Select name="committeeId" required>
                    <SelectTrigger className="bg-primary border-accent-orange/30" data-testid="select-committee">
                      <SelectValue placeholder="Select committee" />
                    </SelectTrigger>
                    <SelectContent>
                      {userCommittees.map(committee => (
                        <SelectItem key={committee.id} value={committee.id}>
                          {committee.name} - Rs {committee.amount}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (Rs)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                    data-testid="input-payment-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="details">Payment Details</Label>
                  <Textarea
                    id="details"
                    name="details"
                    required
                    placeholder="Enter payment details (e.g., transaction ID, payment method, date, etc.)"
                    className="bg-primary border-accent-orange/30 focus:border-accent-cyan min-h-[100px]"
                    data-testid="input-payment-details"
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
                      data-testid="input-payment-receipt"
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
                    onClick={() => setIsSubmitModalOpen(false)}
                    data-testid="button-cancel-payment"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gradient-bg text-primary hover:opacity-90"
                    disabled={submitPaymentMutation.isPending}
                    data-testid="button-confirm-payment"
                  >
                    {submitPaymentMutation.isPending ? "Submitting..." : "Submit Payment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Payment History */}
      <Card className="bg-secondary border-accent-orange/30">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b border-accent-orange/10">
            <div className="flex gap-4 items-center">
              <div>
                <Label htmlFor="status-filter" className="text-sm font-medium">Filter by Status:</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="ml-2 px-3 py-1 bg-primary border border-accent-orange/30 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <Label htmlFor="sort-by" className="text-sm font-medium">Sort by:</Label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="ml-2 px-3 py-1 bg-primary border border-accent-orange/30 rounded-md text-sm"
                >
                  <option value="date-desc">Date (Newest First)</option>
                  <option value="date-asc">Date (Oldest First)</option>
                  <option value="amount-desc">Amount (High to Low)</option>
                  <option value="amount-asc">Amount (Low to High)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-accent-orange/10">
                  <TableHead className="text-secondary">Date</TableHead>
                  <TableHead className="text-secondary">Committee</TableHead>
                  <TableHead className="text-secondary">Amount</TableHead>
                  <TableHead className="text-secondary">Status</TableHead>
                  <TableHead className="text-secondary">Payment Details</TableHead>
                  <TableHead className="text-secondary">Remarks</TableHead>
                  <TableHead className="text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredAndSortedPayments().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-secondary" data-testid="text-no-payments">
                      No payment history found
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const filteredPayments = getFilteredAndSortedPayments();
                    return filteredPayments.map((payment) => {
                      const committee = userCommittees.find(c => c.id === payment.committeeId);
                      return (
                        <TableRow key={payment.id} className="border-accent-orange/10" data-testid={`payment-row-${payment.id}`}>
                          <TableCell className="text-sm">
                            {payment.submittedAt.toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {committee?.name || "Unknown Committee"}
                          </TableCell>
                          <TableCell className="text-sm">
                            Rs {payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                            {payment.receiptUrl && (
                              <span className="ml-2 text-xs text-secondary">Receipt uploaded</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-secondary max-w-xs">
                            <div className="truncate">
                              {payment.remarks || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-secondary max-w-xs">
                            <div className="truncate">
                              {payment.adminRemarks || payment.remarks || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-accent-orange/30"
                              onClick={() => handleViewDetails(payment)}
                              data-testid={`button-view-${payment.id}`}>
                              View Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDeletePayment(payment.id)}
                              disabled={deletePaymentMutation.isPending}
                              data-testid={`button-delete-${payment.id}`}>
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30 overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="gradient-text">Payment Receipt</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <img src={selectedReceipt} alt="Payment Receipt" className="max-w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>

      {/* Detailed Payment Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="gradient-text">Payment Details</DialogTitle>
            <DialogDescription>
              Complete payment information and history
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Payment ID:</Label>
                  <p className="text-sm text-primary font-mono">{selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status:</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div>
                  <Label className="font-semibold">Date:</Label>
                  <p className="text-sm text-primary">{new Date(selectedPayment.submittedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="font-semibold">Time:</Label>
                  <p className="text-sm text-primary">{new Date(selectedPayment.submittedAt).toLocaleTimeString()}</p>
                </div>
                <div className="col-span-2">
                  <Label className="font-semibold">Committee:</Label>
                  <p className="text-sm text-primary">{userCommittees.find(c => c.id === selectedPayment.committeeId)?.name || "Unknown Committee"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="font-semibold">Amount:</Label>
                  <p className="text-lg text-primary font-bold">Rs {selectedPayment.amount.toFixed(2)}</p>
                </div>
              </div>
              
              <div>
                <Label className="font-semibold">Payment Details:</Label>
                <div className="mt-1 p-3 bg-primary/10 rounded-md">
                  <p className="text-sm text-primary whitespace-pre-wrap">{selectedPayment.remarks || "No details provided"}</p>
                </div>
              </div>
              
              {selectedPayment.adminRemarks && (
                <div>
                  <Label className="font-semibold">Admin Remarks:</Label>
                  <div className="mt-1 p-3 bg-accent-green/10 rounded-md">
                    <p className="text-sm text-primary whitespace-pre-wrap">{selectedPayment.adminRemarks}</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {selectedPayment.reviewedAt && (
                  <div>
                    <Label className="font-semibold">Reviewed At:</Label>
                    <p className="text-sm text-primary">{new Date(selectedPayment.reviewedAt).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedPayment.reviewerName && (
                  <div>
                    <Label className="font-semibold">Reviewed By:</Label>
                    <p className="text-sm text-primary">{selectedPayment.reviewerName}</p>
                  </div>
                )}
              </div>
              
              {selectedPayment.receiptUrl && (
                <div>
                  <Label className="font-semibold">Payment Receipt:</Label>
                  <div className="mt-2">
                    <img 
                      src={selectedPayment.receiptUrl} 
                      alt="Payment Receipt" 
                      className="max-w-full h-auto rounded-md border border-accent-orange/30 cursor-pointer hover:opacity-90"
                      onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                    >
                      Open Receipt
                    </Button>
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
