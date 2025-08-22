import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { updateUser } from "@/services/firestore";
import { uploadDocument } from "@/utils/documentUpload";
import { useToast } from "@/hooks/use-toast";
import { notifyAdminOfVerificationSubmission, notifyAdminOfProfileCompletion } from "@/services/notificationService";
import { Upload, FileText, Shield, Users, X, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { userData, refreshUserData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Basic profile state
  const [profileData, setProfileData] = useState({
    username: userData?.username || "",
    fullName: userData?.fullName || "",
    phone: userData?.phone || "",
    email: userData?.email || "",
    cnic: userData?.cnic || "",
    address: userData?.address || "",
    city: userData?.city || "",
    state: userData?.state || "",
    newPin: "",
  });

  // Bank details state
  const [bankData, setBankData] = useState({
    bankName: userData?.bankDetails?.bankName || "",
    accountNumber: userData?.bankDetails?.accountNumber || "",
    accountHolder: userData?.bankDetails?.accountHolder || "",
  });

  // Document upload state
  const [documents, setDocuments] = useState({
    bankStatement: userData?.documents?.bankStatement || "",
    salarySlip: userData?.documents?.salarySlip || "",
    cnicFront: userData?.documents?.cnicFront || "",
    cnicBack: userData?.documents?.cnicBack || "",
    utilityBill: userData?.documents?.utilityBill || "",
  });

  // Guarantor state
  const [guarantors, setGuarantors] = useState(
    userData?.guarantors || [
      { fullName: "", phoneNumber: "", cnicNumber: "", relationship: "", cnicFrontUrl: "", cnicBackUrl: "" },
      { fullName: "", phoneNumber: "", cnicNumber: "", relationship: "", cnicFrontUrl: "", cnicBackUrl: "" }
    ]
  );

  const [uploading, setUploading] = useState<string | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: (updates: any) => updateUser(userData!.id, updates),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Refresh user data to ensure account summary is updated
      await refreshUserData();

      // Update local state if bank details were updated
      if (variables.bankDetails) {
        setBankData(variables.bankDetails);
        toast({
          title: "Bank Details Updated",
          description: "Your bank details have been updated successfully",
        });
        return;
      }

      // Update local state if documents were updated
      if (variables.documents) {
        setDocuments(prev => ({ ...prev, ...variables.documents }));
      }

      // Check if this was a verification-related update
      if (variables.verificationStatus?.documentsSubmitted) {
        await notifyAdminOfVerificationSubmission(userData!.id, userData!.fullName);
        toast({
          title: "Documents Submitted",
          description: "Your verification documents have been submitted. Admins have been notified for review.",
        });
      } else if (variables.verificationStatus?.guarantorsSubmitted) {
        // Check if profile is now complete
        const hasRequiredDocs = documents.cnicFront && documents.cnicBack && documents.bankStatement && documents.utilityBill;
        const hasGuarantors = guarantors.every(g => g.fullName && g.phoneNumber && g.cnicNumber && g.relationship);

        if (hasRequiredDocs && hasGuarantors) {
          await notifyAdminOfProfileCompletion(userData!.id, userData!.fullName);
          toast({
            title: "Profile Complete",
            description: "Your profile is now complete and ready for admin verification.",
          });
        } else {
          toast({
            title: "Guarantor Details Updated",
            description: "Guarantor details have been saved successfully",
          });
        }
      } else if (!variables.bankDetails && !variables.documents) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully",
        });
      }

      setProfileData(prev => ({ ...prev, newPin: "" }));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleDocumentUpload = async (file: File, documentType: string) => {
    if (!userData) return;

    setUploading(documentType);
    try {
      const result = await uploadDocument(file, documentType, userData.id);

      if (result.success && result.url) {
        const updatedDocuments = { ...documents, [documentType]: result.url };
        setDocuments(updatedDocuments);
        
        // Immediately update user data in database
        await updateProfileMutation.mutateAsync({ 
          documents: updatedDocuments 
        });
        
        // Refresh user data to show updated document status
        await refreshUserData();
        
        toast({
          title: "Document Uploaded",
          description: `${documentType} uploaded successfully`,
        });
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload document",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleGuarantorDocumentUpload = async (file: File, guarantorIndex: number, docType: 'cnicFrontUrl' | 'cnicBackUrl') => {
    if (!userData) return;

    const documentType = `guarantor_${guarantorIndex}_${docType}`;
    setUploading(documentType);

    try {
      const result = await uploadDocument(file, documentType, userData.id);

      if (result.success && result.url) {
        setGuarantors(prev => 
          prev.map((guarantor, index) => 
            index === guarantorIndex 
              ? { ...guarantor, [docType]: result.url }
              : guarantor
          )
        );
        toast({
          title: "Document Uploaded",
          description: `Guarantor ${docType} uploaded successfully`,
        });
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload document",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: any = {
      username: profileData.username,
      fullName: profileData.fullName,
      phone: profileData.phone,
      cnic: profileData.cnic,
      address: profileData.address,
      city: profileData.city,
      state: profileData.state,
    };

    if (profileData.newPin && profileData.newPin.length === 4) {
      updates.pin = profileData.newPin;
    } else if (profileData.newPin && profileData.newPin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 4 digits",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const handleUpdateBank = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankData.bankName || !bankData.accountNumber || !bankData.accountHolder) {
      toast({
        title: "Incomplete Information",
        description: "Please fill in all bank details",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({ 
      bankDetails: {
        bankName: bankData.bankName,
        accountNumber: bankData.accountNumber,
        accountHolder: bankData.accountHolder,
      }
    });
  };

  const handleUpdateDocuments = () => {
    // Check if required documents are uploaded
    if (!documents.cnicFront || !documents.cnicBack || !documents.bankStatement) {
      toast({
        title: "Missing Documents",
        description: "Please upload CNIC Front, CNIC Back, and Bank Statement before submitting",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({ 
      documents,
      verificationStatus: {
        isVerified: false,
        documentsSubmitted: true,
        adminReviewed: false,
        submittedAt: new Date(),
      }
    });
  };

  const handleUpdateGuarantors = () => {
    updateProfileMutation.mutate({ 
      guarantors,
      verificationStatus: {
        ...userData?.verificationStatus,
        guarantorsSubmitted: true,
        submittedAt: new Date(),
      }
    });
  };

  const updateGuarantor = (index: number, field: string, value: string) => {
    setGuarantors(prev => 
      prev.map((guarantor, i) => 
        i === index ? { ...guarantor, [field]: value } : guarantor
      )
    );
  };

  if (!userData) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Profile Settings</h2>
        {userData.verificationStatus?.isVerified && (
          <div className="flex items-center gap-2 text-green-500">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Verified Profile</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="guarantors">Guarantors</TabsTrigger>
          <TabsTrigger value="bank">Banking</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6">
            {/* Verification Status Card */}
            <Card className={`border-2 ${userData.verificationStatus?.isVerified 
              ? 'bg-primary border-green-400' 
              : userData.verificationStatus?.adminReviewed 
              ? 'bg-primary border-red-400' 
              : userData.verificationStatus?.documentsSubmitted 
              ? 'bg-primary border-yellow-400' 
              : 'bg-secondary border-accent-orange/30'
            }`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Verification Status
                  {userData.verificationStatus?.isVerified && (
                    <Badge className="bg-green-500 text-white">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {userData.verificationStatus?.adminReviewed && !userData.verificationStatus?.isVerified && (
                    <Badge variant="destructive">
                      <X className="w-3 h-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                  {userData.verificationStatus?.documentsSubmitted && !userData.verificationStatus?.adminReviewed && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      <Clock className="w-3 h-3 mr-1" />
                      Under Review
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Documents Submitted:</p>
                      <p className={userData.verificationStatus?.documentsSubmitted ? "text-green-600" : "text-red-600"}>
                        {userData.verificationStatus?.documentsSubmitted ? "✓ Yes" : "✗ No"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Admin Reviewed:</p>
                      <p className={userData.verificationStatus?.adminReviewed ? "text-green-600" : "text-yellow-600"}>
                        {userData.verificationStatus?.adminReviewed ? "✓ Yes" : "⏳ Pending"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Verification Status:</p>
                      <p className={userData.verificationStatus?.isVerified ? "text-green-600" : "text-red-600"}>
                        {userData.verificationStatus?.isVerified ? "✓ Verified" : "✗ Not Verified"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Profile Completion:</p>
                      <p className="text-blue-600">
                        {userData.phone && userData.cnic && userData.address ? "✓ Complete" : "⚠ Incomplete"}
                      </p>
                    </div>
                  </div>

                  {userData.verificationStatus?.submittedAt && (
                    <p className="text-xs text-secondary">
                      <span className="font-medium">Submitted:</span> {
                        (() => {
                          try {
                            const date = userData.verificationStatus.submittedAt instanceof Date 
                              ? userData.verificationStatus.submittedAt 
                              : new Date(userData.verificationStatus.submittedAt);
                            
                            if (isNaN(date.getTime())) {
                              return 'Date not available';
                            }
                            return date.toLocaleDateString();
                          } catch (error) {
                            return 'Date not available';
                          }
                        })()
                      }
                    </p>
                  )}

                  {userData.verificationStatus?.reviewedAt && (
                    <p className="text-xs text-secondary">
                      <span className="font-medium">Reviewed:</span> {
                        (() => {
                          try {
                            const date = userData.verificationStatus.reviewedAt instanceof Date 
                              ? userData.verificationStatus.reviewedAt 
                              : new Date(userData.verificationStatus.reviewedAt);
                            
                            if (isNaN(date.getTime())) {
                              return 'Date not available';
                            }
                            return date.toLocaleDateString();
                          } catch (error) {
                            return 'Date not available';
                          }
                        })()
                      }
                    </p>
                  )}

                  {userData.verificationStatus?.remarks && (
                    <div className="mt-3 p-3 bg-secondary rounded border border-accent-orange/30">
                      <p className="text-sm font-medium text-accent-orange">Admin Remarks:</p>
                      <p className="text-sm text-primary mt-1">{userData.verificationStatus.remarks}</p>
                    </div>
                  )}

                  {!userData.verificationStatus?.documentsSubmitted && (
                    <div className="mt-4 p-4 bg-primary border border-accent-orange/30 rounded">
                      <p className="text-sm font-medium text-accent-orange">Action Required:</p>
                      <p className="text-sm text-primary mt-1">
                        Please complete your profile and upload required documents in the Documents and Guarantors tabs to submit for verification.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profile Information Form */}
            <Card className="bg-secondary border-accent-orange/30">
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+92 300 1234567"
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cnic">CNIC Number *</Label>
                      <Input
                        id="cnic"
                        value={profileData.cnic}
                        onChange={(e) => setProfileData(prev => ({ ...prev, cnic: e.target.value }))}
                        placeholder="12345-1234567-1"
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={profileData.address}
                        onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Street address"
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={profileData.city}
                        onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province *</Label>
                      <Input
                        id="state"
                        value={profileData.state}
                        onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPin">Change PIN (optional)</Label>
                      <Input
                        id="newPin"
                        type="password"
                        maxLength={4}
                        value={profileData.newPin}
                        onChange={(e) => setProfileData(prev => ({ ...prev, newPin: e.target.value }))}
                        placeholder="••••"
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan text-center text-xl tracking-widest"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="gradient-bg text-black hover:opacity-90"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="bg-secondary border-accent-orange/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CNIC Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>CNIC Front *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0], 'cnicFront')}
                      className="hidden"
                      id="cnic-front"
                    />
                    <label htmlFor="cnic-front">
                      <div className="border-2 border-dashed border-accent-orange/30 rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan">
                        {documents.cnicFront ? (
                          <img src={documents.cnicFront} alt="CNIC Front" className="w-full h-32 object-cover rounded" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm">Upload CNIC Front</span>
                          </div>
                        )}
                      </div>
                    </label>
                    {uploading === 'cnicFront' && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                  </div>
                </div>

                <div>
                  <Label>CNIC Back *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0], 'cnicBack')}
                      className="hidden"
                      id="cnic-back"
                    />
                    <label htmlFor="cnic-back">
                      <div className="border-2 border-dashed border-accent-orange/30 rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan">
                        {documents.cnicBack ? (
                          <img src={documents.cnicBack} alt="CNIC Back" className="w-full h-32 object-cover rounded" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm">Upload CNIC Back</span>
                          </div>
                        )}
                      </div>
                    </label>
                    {uploading === 'cnicBack' && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>

              {/* Financial Documents */}
              <div className="space-y-4">
                <h4 className="font-medium">Financial Documents</h4>

                <div>
                  <Label>Bank Statement (Last 3 months) *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0], 'bankStatement')}
                      className="hidden"
                      id="bank-statement"
                    />
                    <label htmlFor="bank-statement">
                      <div className="border-2 border-dashed border-accent-orange/30 rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan">
                        {documents.bankStatement ? (
                          <div className="flex items-center gap-2 text-green-500">
                            <FileText className="w-5 h-5" />
                            <span>Bank statement uploaded</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm">Upload Bank Statement</span>
                          </div>
                        )}
                      </div>
                    </label>
                    {uploading === 'bankStatement' && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                  </div>
                </div>

                <div>
                  <Label>Salary Slip / Income Proof (Optional but recommended)</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0], 'salarySlip')}
                      className="hidden"
                      id="salary-slip"
                    />
                    <label htmlFor="salary-slip">
                      <div className="border-2 border-dashed border-accent-orange/30 rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan">
                        {documents.salarySlip ? (
                          <div className="flex items-center gap-2 text-green-500">
                            <FileText className="w-5 h-5" />
                            <span>Income proof uploaded</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm">Upload Income Proof</span>
                          </div>
                        )}
                      </div>
                    </label>
                    {uploading === 'salarySlip' && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                  </div>
                </div>

                <div>
                  <Label>Utility Bill *</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0], 'utilityBill')}
                      className="hidden"
                      id="utility-bill"
                    />
                    <label htmlFor="utility-bill">
                      <div className="border-2 border-dashed border-accent-orange/30 rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan">
                        {documents.utilityBill ? (
                          <div className="flex items-center gap-2 text-green-500">
                            <FileText className="w-5 h-5" />
                            <span>Utility bill uploaded</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm">Upload Utility Bill</span>
                          </div>
                        )}
                      </div>
                    </label>
                    {uploading === 'utilityBill' && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUpdateDocuments}
                className="gradient-bg text-black hover:opacity-90"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Documents"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guarantors Tab */}
        <TabsContent value="guarantors" className="space-y-6">
          <Card className="bg-secondary border-accent-orange/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Guarantor Details (2 Required)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {guarantors.map((guarantor, index) => (
                <div key={index} className="border border-accent-orange/30 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Guarantor {index + 1}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={guarantor.fullName}
                        onChange={(e) => updateGuarantor(index, 'fullName', e.target.value)}
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone Number *</Label>
                      <Input
                        value={guarantor.phoneNumber}
                        onChange={(e) => updateGuarantor(index, 'phoneNumber', e.target.value)}
                        placeholder="+92 300 1234567"
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label>CNIC Number *</Label>
                      <Input
                        value={guarantor.cnicNumber}
                        onChange={(e) => updateGuarantor(index, 'cnicNumber', e.target.value)}
                        placeholder="12345-1234567-1"
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                    <div>
                      <Label>Relationship *</Label>
                      <Input
                        value={guarantor.relationship}
                        onChange={(e) => updateGuarantor(index, 'relationship', e.target.value)}
                        placeholder="Brother, Friend, etc."
                        className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                        required
                      />
                    </div>
                  </div>

                  {/* Guarantor CNIC uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>CNIC Front *</Label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleGuarantorDocumentUpload(e.target.files[0], index, 'cnicFrontUrl')}
                        className="hidden"
                        id={`guarantor-${index}-front`}
                      />
                      <label htmlFor={`guarantor-${index}-front`}>
                        <div className="border-2 border-dashed border-accent-orange/30 rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan mt-2">
                          {guarantor.cnicFrontUrl ? (
                            <img src={guarantor.cnicFrontUrl} alt="Guarantor CNIC Front" className="w-full h-32 object-cover rounded" />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-6 h-6 text-gray-400" />
                              <span className="text-xs">Upload CNIC Front</span>
                            </div>
                          )}
                        </div>
                      </label>
                      {uploading === `guarantor_${index}_cnicFrontUrl` && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                    </div>

                    <div>
                      <Label>CNIC Back *</Label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleGuarantorDocumentUpload(e.target.files[0], index, 'cnicBackUrl')}
                        className="hidden"
                        id={`guarantor-${index}-back`}
                      />
                      <label htmlFor={`guarantor-${index}-back`}>
                        <div className="border-2 border-dashed border-accent-orange/30 rounded-lg p-4 text-center cursor-pointer hover:border-accent-cyan mt-2">
                          {guarantor.cnicBackUrl ? (
                            <img src={guarantor.cnicBackUrl} alt="Guarantor CNIC Back" className="w-full h-32 object-cover rounded" />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-6 h-6 text-gray-400" />
                              <span className="text-xs">Upload CNIC Back</span>
                            </div>
                          )}
                        </div>
                      </label>
                      {uploading === `guarantor_${index}_cnicBackUrl` && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                onClick={handleUpdateGuarantors}
                className="gradient-bg text-black hover:opacity-90"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Guarantor Details"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="bank" className="space-y-6">
          <Card className="bg-secondary border-accent-orange/30">
            <CardHeader>
              <CardTitle className="text-lg">Bank Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateBank} className="space-y-4">
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={bankData.bankName}
                    onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="Enter bank name"
                    className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={bankData.accountNumber}
                    onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Enter account number"
                    className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  />
                </div>
                <div>
                  <Label htmlFor="accountHolder">Account Holder Name</Label>
                  <Input
                    id="accountHolder"
                    value={bankData.accountHolder}
                    onChange={(e) => setBankData(prev => ({ ...prev, accountHolder: e.target.value }))}
                    placeholder="Enter account holder name"
                    className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  />
                </div>
                <Button
                  type="submit"
                  className="gradient-bg text-black hover:opacity-90"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? "Updating..." : "Update Bank Details"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Card className="bg-secondary border-accent-orange/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            <img 
              src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
              alt="Security" 
              className="w-32 h-24 object-cover rounded-lg"
            />
            <div>
              <h4 className="font-medium mb-2">Your information is secure</h4>
              <p className="text-secondary text-sm">
                All personal information and documents are encrypted and stored securely. 
                Your data will only be used for verification purposes and will be reviewed by authorized admin personnel only.
              </p>
              {userData.verificationStatus && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs">
                    <span className="font-medium">Status:</span> {userData.verificationStatus.isVerified ? 'Verified' : 'Pending Verification'}
                  </p>
                  {userData.verificationStatus.reviewedAt && (
                    <p className="text-xs">
                      <span className="font-medium">Reviewed:</span> {new Date(userData.verificationStatus.reviewedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Summary Section */}
      <Card className="bg-secondary border-accent-orange/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-cyan" />
            Account Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-primary rounded-lg border border-accent-orange/30">
                <h4 className="font-semibold text-accent-cyan mb-2">Profile Completion</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Basic Info:</span>
                    <span className={userData.fullName && userData.phone ? "text-green-400 font-medium" : "text-red-400"}>
                      {userData.fullName && userData.phone ? "✓ Complete" : "✗ Incomplete"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Documents:</span>
                    <span className={userData.verificationStatus?.documentsSubmitted ? "text-green-400 font-medium" : "text-red-400"}>
                      {userData.verificationStatus?.documentsSubmitted ? "✓ Submitted" : "✗ Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bank Details:</span>
                    <span className={bankData.accountNumber ? "text-green-400 font-medium" : "text-red-400"}>
                      {bankData.accountNumber ? "✓ Added" : "✗ Missing"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary rounded-lg border border-accent-orange/30">
                <h4 className="font-semibold text-accent-cyan mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-secondary border-accent-orange/30 hover:bg-primary"
                    onClick={() => document.querySelector('[value="documents"]')?.click()}
                  >
                    Upload Documents
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-secondary border-accent-orange/30 hover:bg-primary"
                    onClick={() => document.querySelector('[value="bank"]')?.click()}
                  >
                    Update Bank Info
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-secondary border-accent-orange/30 hover:bg-primary"
                    onClick={() => document.querySelector('[value="guarantors"]')?.click()}
                  >
                    Add Guarantors
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary rounded-lg border border-accent-orange/30">
              <h4 className="font-semibold text-accent-orange mb-2">Important Notice</h4>
              <p className="text-secondary text-sm">
                Complete all sections to ensure smooth committee participation and faster verification process.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}