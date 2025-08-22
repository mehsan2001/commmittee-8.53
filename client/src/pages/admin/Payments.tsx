import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { getPendingPayments, getAllPayments, approvePayment, rejectPayment, deletePayment, getUserById } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Payment } from "@shared/schema";

export default function Payments() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  const { data: allPayments = [], isLoading } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: getAllPayments,
  });

  const approvePaymentMutation = useMutation({
    mutationFn: ({ paymentId, remarks }: { paymentId: string; remarks?: string }) =>
      approvePayment(paymentId, userData!.id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Payment Approved",
        description: "Payment has been approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve payment",
        variant: "destructive",
      });
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: ({ paymentId, remarks }: { paymentId: string; remarks: string }) =>
      rejectPayment(paymentId, userData!.id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setRejectModalOpen(false);
      setCurrentPayment(null);
      toast({
        title: "Payment Rejected",
        description: "Payment has been rejected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject payment",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayments(prev => [...prev, paymentId]);
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId));
    }
  };

  const handleApproveSelected = () => {
    selectedPayments.forEach(paymentId => {
      approvePaymentMutation.mutate({ paymentId });
    });
    setSelectedPayments([]);
  };

  const handleDeleteSelected = () => {
    selectedPayments.forEach(paymentId => {
      deletePaymentMutation.mutate(paymentId);
    });
    setSelectedPayments([]);
  };

  const handleDeletePayment = (paymentId: string) => {
    deletePaymentMutation.mutate(paymentId);
  };

  const handleApprovePayment = (paymentId: string) => {
    approvePaymentMutation.mutate({ paymentId });
  };

  const handleRejectPayment = (payment: Payment) => {
    setCurrentPayment(payment);
    setRejectModalOpen(true);
  };

  const submitRejectPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const remarks = formData.get("remarks") as string;
    
    if (currentPayment && remarks.trim()) {
      rejectPaymentMutation.mutate({
        paymentId: currentPayment.id,
        remarks: remarks.trim(),
      });
    }
  };

  const filteredPayments = allPayments.filter(payment => {
    if (activeTab === 'all') return true;
    return payment.status === activeTab;
  });

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const pendingPayments = allPayments.filter(payment => payment.status === 'pending');

  if (isLoading) {
    return <div>Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Payment Management</h2>
        <div className="flex space-x-2">
          {selectedPayments.length > 0 && (
            <>
              {activeTab === 'pending' && (
                <Button
                  className="bg-accent-green/20 text-accent-green hover:bg-accent-green/30"
                  disabled={approvePaymentMutation.isPending}
                  onClick={handleApproveSelected}
                  data-testid="button-approve-selected"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve Selected ({selectedPayments.length})
                </Button>
              )}
              <Button
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                disabled={deletePaymentMutation.isPending}
                onClick={handleDeleteSelected}
                data-testid="button-delete-selected"
              >
                <X className="mr-2 h-4 w-4" />
                Delete Selected ({selectedPayments.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-accent-orange/30">
        <nav className="flex space-x-8">
          {[
            { key: 'all', label: 'All Payments', count: allPayments.length },
            { key: 'pending', label: 'Pending', count: allPayments.filter(p => p.status === 'pending').length },
            { key: 'approved', label: 'Approved', count: allPayments.filter(p => p.status === 'approved').length },
            { key: 'rejected', label: 'Rejected', count: allPayments.filter(p => p.status === 'rejected').length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-accent-cyan text-accent-cyan'
                  : 'border-transparent text-secondary hover:text-white'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </nav>
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <Card className="bg-secondary border-accent-orange/30">
            <CardContent className="p-8 text-center">
              <p className="text-secondary">
                No {activeTab === 'all' ? '' : activeTab} payments found
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              isSelected={selectedPayments.includes(payment.id)}
              onSelect={(checked) => handleSelectPayment(payment.id, checked)}
              onApprove={() => handleApprovePayment(payment.id)}
              onReject={() => handleRejectPayment(payment)}
              onDelete={() => handleDeletePayment(payment.id)}
              isApproving={approvePaymentMutation.isPending}
              isDeleting={deletePaymentMutation.isPending}
			  onImageClick={handleImageClick}
            />
          ))
        )}
      </div>

      {/* Reject Payment Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30 overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="gradient-text">Reject Payment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payment request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRejectPayment} className="space-y-4">
            <div>
              <p className="text-sm text-secondary mb-2">
                Reason for rejection (required):
              </p>
              <Textarea
                name="remarks"
                required
                placeholder="Please provide a reason for rejecting this payment..."
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                data-testid="textarea-reject-reason"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-accent-orange/30"
                onClick={() => setRejectModalOpen(false)}
                data-testid="button-cancel-reject"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                disabled={rejectPaymentMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {rejectPaymentMutation.isPending ? "Rejecting..." : "Reject Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
	  <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30 max-w-3xl">
          <img src={selectedImage} alt="Payment Receipt" className="max-w-full h-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PaymentCardProps {
  payment: Payment;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isApproving: boolean;
  isDeleting: boolean;
  onImageClick: (imageUrl: string) => void;
}

function PaymentCard({ payment, isSelected, onSelect, onApprove, onReject, onDelete, isApproving, isDeleting, onImageClick }: PaymentCardProps) {
  const { data: user } = useQuery({
    queryKey: ["/api/users", payment.userId],
    queryFn: () => getUserById(payment.userId),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-accent-orange/20 text-accent-orange">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-accent-green/20 text-accent-green">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{status}</Badge>;
    }
  };

  const showActions = payment.status === 'pending';

  return (
    <Card className="bg-secondary border-accent-orange/30" data-testid={`payment-card-${payment.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
              data-testid={`checkbox-payment-${payment.id}`}
            />
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="font-semibold">{user?.fullName || "Loading..."}</h3>
                {getStatusBadge(payment.status)}
              </div>
              <p className="text-secondary mb-2">
                Amount: Rs {payment.amount.toFixed(2)}
              </p>
              <p className="text-sm text-secondary mb-2">
                Submitted: {payment.submittedAt.toLocaleString()}
              </p>
              {payment.remarks && (
                <div className="mt-3 p-3 bg-primary/50 rounded-lg border border-accent-orange/30">
                  <p className="text-sm font-medium text-secondary mb-1">Payment Details:</p>
                  <p className="text-sm text-secondary whitespace-pre-wrap">{payment.remarks}</p>
                </div>
              )}
              {payment.reviewedAt && (
                <div className="mt-2 text-sm text-secondary">
                  <p>Reviewed: {payment.reviewedAt.toLocaleString()}</p>
                  {payment.reviewedBy && (
                    <p>By: {payment.reviewedBy}</p>
                  )}
                </div>
              )}
              {payment.adminRemarks && (
                <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-sm font-medium text-red-400 mb-1">Admin Remarks:</p>
                  <p className="text-sm text-red-400 whitespace-pre-wrap">{payment.adminRemarks}</p>
                </div>
              )}
			  {payment.receiptUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-secondary mb-2">Payment Receipt:</p>
                  <img
                    src={payment.receiptUrl}
                    alt="Payment Receipt"
                    className="rounded-lg w-32 h-32 object-cover cursor-pointer"
                    onClick={() => onImageClick(payment.receiptUrl!)}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            {showActions && (
              <>
                <Button
                  size="sm"
                  className="bg-accent-green/20 text-accent-green hover:bg-accent-green/30"
                  onClick={onApprove}
                  disabled={isApproving}
                  data-testid={`button-approve-${payment.id}`}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  onClick={onReject}
                  data-testid={`button-reject-${payment.id}`}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
              onClick={onDelete}
              disabled={isDeleting}
              data-testid={`button-delete-${payment.id}`}
            >
              <X className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
