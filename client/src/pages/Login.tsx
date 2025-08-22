import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { userData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    pin: "",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (userData) {
      const redirectPath = userData.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
      setLocation(redirectPath);
    }
  }, [userData, setLocation]);

  if (userData) {
    return null;
  }

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

    setLoading(true);
    
    try {
      // Create email from username for Firebase auth
      const email = `${formData.username}@rosca.local`;
      // Pad PIN to meet Firebase 6-character minimum requirement
      const password = `${formData.pin}00`;
      
      await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "Invalid username or PIN",
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
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
            alt="Financial committee meeting" 
            className="w-full h-32 object-cover rounded-lg mb-6"
          />
          <GradientHeading className="text-3xl mb-2">Committee ROSCA</GradientHeading>
          <p className="text-secondary">Manage your rotating savings committees</p>
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

            <Button
              type="submit"
              className="w-full gradient-bg text-black py-3 font-medium hover:opacity-90"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              className="text-accent-cyan hover:text-accent-green"
              onClick={() => setLocation("/signup")}
              data-testid="link-signup"
            >
              Don't have an account? Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
