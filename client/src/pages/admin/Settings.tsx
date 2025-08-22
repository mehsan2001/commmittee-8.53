import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { updateUser } from "@/services/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profileData, setProfileData] = useState({
    username: userData?.username || "",
    fullName: userData?.fullName || "",
    newPin: "",
  });
  const [bankData, setBankData] = useState({
    bankName: userData?.bankDetails?.bankName || "",
    accountNumber: userData?.bankDetails?.accountNumber || "",
    accountHolder: userData?.bankDetails?.accountHolder || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: (updates: any) => updateUser(userData!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
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

  const updateBankMutation = useMutation({
    mutationFn: (bankDetails: any) => updateUser(userData!.id, { bankDetails }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Bank Details Updated",
        description: "Your bank details have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bank details",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates: any = {
      username: profileData.username,
      fullName: profileData.fullName,
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
    updateBankMutation.mutate(bankData);
  };

  if (!userData) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg">Profile Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-username"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-full-name"
                />
              </div>
              <div>
                <Label htmlFor="newPin">Change PIN (leave empty to keep current)</Label>
                <Input
                  id="newPin"
                  type="password"
                  maxLength={4}
                  value={profileData.newPin}
                  onChange={(e) => setProfileData(prev => ({ ...prev, newPin: e.target.value }))}
                  placeholder="••••"
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan text-center text-xl tracking-widest"
                  data-testid="input-new-pin"
                />
              </div>
              <Button
                type="submit"
                className="gradient-bg text-black hover:opacity-90"
                disabled={updateProfileMutation.isPending}
                data-testid="button-update-profile"
              >
                {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bank Details */}
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
                  data-testid="input-bank-name"
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
                  data-testid="input-account-number"
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
                  data-testid="input-account-holder"
                />
              </div>
              <Button
                type="submit"
                className="gradient-bg text-black hover:opacity-90"
                disabled={updateBankMutation.isPending}
                data-testid="button-update-bank"
              >
                {updateBankMutation.isPending ? "Updating..." : "Update Bank Details"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
