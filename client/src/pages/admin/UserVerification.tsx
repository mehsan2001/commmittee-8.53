import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getAllUsers, updateUser } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileText, Shield, Users, Phone, MapPin, Eye, Check, X } from "lucide-react";
import type { User } from "@shared/schema";

export default function UserVerification() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: getAllUsers,
  });

  const updateVerificationMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: any }) =>
      updateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Verification Updated",
        description: "User verification status has been updated successfully",
      });
      setSelectedUser(null);
      setReviewRemarks("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    },
  });

  const handleVerifyUser = (user: User, isApproved: boolean) => {
    const verificationUpdate = {
      verificationStatus: {
        isVerified: isApproved,
        documentsSubmitted: user.verificationStatus?.documentsSubmitted || false,
        adminReviewed: true,
        reviewedBy: userData?.id,
        reviewedAt: new Date(),
        remarks: reviewRemarks,
      }
    };

    updateVerificationMutation.mutate({
      userId: user.id,
      updates: verificationUpdate,
    });
  };

  const pendingUsers = users.filter(user => 
    user.verificationStatus?.documentsSubmitted && !user.verificationStatus?.adminReviewed
  );

  const verifiedUsers = users.filter(user => 
    user.verificationStatus?.isVerified
  );

  const rejectedUsers = users.filter(user => 
    user.verificationStatus?.adminReviewed && !user.verificationStatus?.isVerified
  );

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Verification</h2>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
            Pending: {pendingUsers.length}
          </Badge>
          <Badge variant="outline" className="border-green-500 text-green-500">
            Verified: {verifiedUsers.length}
          </Badge>
          <Badge variant="outline" className="border-red-500 text-red-500">
            Rejected: {rejectedUsers.length}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="pending">Pending ({pendingUsers.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verifiedUsers.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="grid gap-4">
            {pendingUsers.length === 0 ? (
              <Card className="bg-secondary border-accent-orange/30">
                <CardContent className="flex items-center justify-center py-8">
                  <p className="text-secondary">No pending verifications</p>
                </CardContent>
              </Card>
            ) : (
              pendingUsers.map((user) => (
                <Card key={user.id} className="bg-secondary border-accent-orange/30">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{user.fullName}</CardTitle>
                        <p className="text-secondary text-sm">{user.email}</p>
                        {user.verificationStatus?.submittedAt && (
                          <p className="text-xs text-secondary">
                            Submitted: {new Date(user.verificationStatus.submittedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleVerifyUser(user, true)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={updateVerificationMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleVerifyUser(user, false)}
                          size="sm"
                          variant="destructive"
                          disabled={updateVerificationMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-primary border-accent-orange/30">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Shield className="w-5 h-5" />
                              Review: {user.fullName}
                            </DialogTitle>
                          </DialogHeader>

                          {selectedUser && (
                            <div className="space-y-6">
                              {/* Basic Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Basic Information
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Full Name:</span> {selectedUser.fullName}</p>
                                    <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                                    <p><span className="font-medium">Phone:</span> {selectedUser.phone || 'Not provided'}</p>
                                    <p><span className="font-medium">CNIC:</span> {selectedUser.cnic || 'Not provided'}</p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h4 className="font-semibold flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Address
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Address:</span> {selectedUser.address || 'Not provided'}</p>
                                    <p><span className="font-medium">City:</span> {selectedUser.city || 'Not provided'}</p>
                                    <p><span className="font-medium">State:</span> {selectedUser.state || 'Not provided'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Documents */}
                              <div className="space-y-4">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Documents
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {selectedUser.documents?.cnicFront && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">CNIC Front</Label>
                                      <img 
                                        src={selectedUser.documents.cnicFront} 
                                        alt="CNIC Front" 
                                        className="w-full h-32 object-cover rounded border"
                                      />
                                    </div>
                                  )}

                                  {selectedUser.documents?.cnicBack && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">CNIC Back</Label>
                                      <img 
                                        src={selectedUser.documents.cnicBack} 
                                        alt="CNIC Back" 
                                        className="w-full h-32 object-cover rounded border"
                                      />
                                    </div>
                                  )}

                                  {selectedUser.documents?.bankStatement && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Bank Statement</Label>
                                      <a 
                                        href={selectedUser.documents.bankStatement} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 border rounded hover:bg-secondary"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-sm">View Document</span>
                                      </a>
                                    </div>
                                  )}

                                  {selectedUser.documents?.salarySlip && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Salary Slip</Label>
                                      <a 
                                        href={selectedUser.documents.salarySlip} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 border rounded hover:bg-secondary"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-sm">View Document</span>
                                      </a>
                                    </div>
                                  )}

                                  {selectedUser.documents?.utilityBill && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Utility Bill</Label>
                                      <a 
                                        href={selectedUser.documents.utilityBill} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 border rounded hover:bg-secondary"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span className="text-sm">View Document</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Guarantors */}
                              {selectedUser.guarantors && selectedUser.guarantors.length > 0 && (
                                <div className="space-y-4">
                                  <h4 className="font-semibold">Guarantors</h4>
                                  {selectedUser.guarantors.map((guarantor, index) => (
                                    <div key={index} className="border rounded-lg p-4 space-y-4">
                                      <h5 className="font-medium">Guarantor {index + 1}</h5>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <p><span className="font-medium">Name:</span> {guarantor.fullName}</p>
                                        <p><span className="font-medium">Phone:</span> {guarantor.phoneNumber}</p>
                                        <p><span className="font-medium">CNIC:</span> {guarantor.cnicNumber}</p>
                                        <p><span className="font-medium">Relationship:</span> {guarantor.relationship}</p>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        {guarantor.cnicFrontUrl && (
                                          <div>
                                            <Label className="text-sm">CNIC Front</Label>
                                            <img 
                                              src={guarantor.cnicFrontUrl} 
                                              alt="Guarantor CNIC Front" 
                                              className="w-full h-24 object-cover rounded border mt-1"
                                            />
                                          </div>
                                        )}
                                        {guarantor.cnicBackUrl && (
                                          <div>
                                            <Label className="text-sm">CNIC Back</Label>
                                            <img 
                                              src={guarantor.cnicBackUrl} 
                                              alt="Guarantor CNIC Back" 
                                              className="w-full h-24 object-cover rounded border mt-1"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Review Section */}
                              <div className="space-y-4">
                                <h4 className="font-semibold">Admin Review</h4>
                                <div>
                                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                                  <Textarea
                                    id="remarks"
                                    value={reviewRemarks}
                                    onChange={(e) => setReviewRemarks(e.target.value)}
                                    placeholder="Add any remarks about the verification..."
                                    className="mt-2 bg-secondary border-accent-orange/30"
                                  />
                                </div>

                                <div className="flex gap-3 pt-4">
                                  <Button
                                    onClick={() => handleVerifyUser(selectedUser, true)}
                                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                                    disabled={updateVerificationMutation.isPending}
                                  >
                                    <Check className="w-4 h-4" />
                                    {updateVerificationMutation.isPending ? "Approving..." : "Approve"}
                                  </Button>
                                  <Button
                                    onClick={() => handleVerifyUser(selectedUser, false)}
                                    variant="destructive"
                                    className="flex items-center gap-2"
                                    disabled={updateVerificationMutation.isPending}
                                  >
                                    <X className="w-4 h-4" />
                                    {updateVerificationMutation.isPending ? "Rejecting..." : "Reject"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-secondary">{user.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="font-medium">CNIC</p>
                        <p className="text-secondary">{user.cnic || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="font-medium">City</p>
                        <p className="text-secondary">{user.city || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Documents</p>
                        <p className="text-secondary">
                          {user.documents && Object.keys(user.documents).length > 0 
                            ? `${Object.values(user.documents).filter(Boolean).length} uploaded`
                            : 'None'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="verified">
          <div className="grid gap-4">
            {verifiedUsers.map((user) => (
              <Card key={user.id} className="bg-secondary border-green-500/30">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {user.fullName}
                        <Badge className="bg-green-500 text-white">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      </CardTitle>
                      <p className="text-secondary text-sm">{user.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Reviewed by:</span> {user.verificationStatus?.reviewedBy}</p>
                    <p><span className="font-medium">Reviewed on:</span> {
                      user.verificationStatus?.reviewedAt 
                        ? new Date(user.verificationStatus.reviewedAt).toLocaleDateString() 
                        : 'Unknown'
                    }</p>
                    {user.verificationStatus?.remarks && (
                      <p><span className="font-medium">Remarks:</span> {user.verificationStatus.remarks}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rejected">
          <div className="grid gap-4">
            {rejectedUsers.map((user) => (
              <Card key={user.id} className="bg-secondary border-red-500/30">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {user.fullName}
                        <Badge variant="destructive">
                          <X className="w-3 h-3 mr-1" />
                          Rejected
                        </Badge>
                      </CardTitle>
                      <p className="text-secondary text-sm">{user.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Reviewed by:</span> {user.verificationStatus?.reviewedBy}</p>
                    <p><span className="font-medium">Reviewed on:</span> {
                      user.verificationStatus?.reviewedAt 
                        ? new Date(user.verificationStatus.reviewedAt).toLocaleDateString() 
                        : 'Unknown'
                    }</p>
                    {user.verificationStatus?.remarks && (
                      <p><span className="font-medium">Remarks:</span> {user.verificationStatus.remarks}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}