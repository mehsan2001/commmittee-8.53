import { useState } from "react";
import { useLocation } from "wouter";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUser } from "@/services/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    pin: "",
    confirmPin: "",
    role: "user" as "admin" | "user",
    fullName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 4 digits",
        variant: "destructive",
      });
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create email from username for Firebase auth
      const email = `${formData.username}@rosca.local`;
      // Pad PIN to meet Firebase 6-character minimum requirement
      const password = `${formData.pin}00`;
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await createUser({
        username: formData.username,
        pin: formData.pin,
        role: formData.role,
        fullName: formData.fullName,
        firebaseUid: userCredential.user.uid,
      });
      
      toast({
        title: "Account Created",
        description: "Your account has been created successfully!",
      });
      
      // Redirect based on role
      const redirectPath = formData.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
      setLocation(redirectPath);
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md bg-secondary border-accent-orange/30">
        <CardHeader className="text-center">
          <GradientHeading className="text-3xl mb-2">Create Account</GradientHeading>
          <p className="text-secondary">Join Committee ROSCA</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                placeholder="Enter username"
                required
                data-testid="input-username"
              />
            </div>
            
            <div>
              <Label htmlFor="fullName" className="block text-sm font-medium mb-2">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                placeholder="Enter full name"
                required
                data-testid="input-fullname"
              />
            </div>
            
            <div>
              <Label htmlFor="role" className="block text-sm font-medium mb-2">
                Role
              </Label>
              <Select value={formData.role} onValueChange={(value: "admin" | "user") => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger className="bg-primary border-accent-orange/30 focus:border-accent-cyan" data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="pin" className="block text-sm font-medium mb-2">
                4-Digit PIN
              </Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan text-center text-xl tracking-widest"
                placeholder="••••"
                required
                data-testid="input-pin"
              />
            </div>
            
            <div>
              <Label htmlFor="confirmPin" className="block text-sm font-medium mb-2">
                Confirm PIN
              </Label>
              <Input
                id="confirmPin"
                type="password"
                maxLength={4}
                value={formData.confirmPin}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPin: e.target.value }))}
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan text-center text-xl tracking-widest"
                placeholder="••••"
                required
                data-testid="input-confirm-pin"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-bg text-black py-3 font-medium hover:opacity-90"
              disabled={loading}
              data-testid="button-signup"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-accent-cyan hover:text-accent-green"
              onClick={() => setLocation("/login")}
              data-testid="link-login"
            >
              Already have an account? Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
