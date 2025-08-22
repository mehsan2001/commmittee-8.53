import { useAuth } from "@/context/AuthContext";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  title: string;
}

export function Navbar({ title }: NavbarProps) {
  const { userData } = useAuth();

  if (!userData) return null;

  const initials = userData.fullName
    .split(" ")
    .map(name => name.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <header className="bg-secondary border-b border-accent-orange/30 px-6 py-4">
      <div className="flex items-center justify-between">
        <GradientHeading className="text-2xl">{title}</GradientHeading>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/50"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5 text-accent-cyan" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 gradient-bg rounded-full flex items-center justify-center text-black font-bold"
              data-testid="user-avatar"
            >
              <span className="text-bg-primary">{initials}</span>
            </div>
            <span className="font-medium text-primary" data-testid="text-username">
              {userData.fullName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
