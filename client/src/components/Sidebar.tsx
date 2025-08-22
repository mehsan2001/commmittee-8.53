import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { GradientHeading } from "@/components/ui/gradient-heading";
import {
  BarChart3,
  Users,
  CreditCard,
  Banknote,
  UserCheck,
  Settings,
  Search,
  Receipt,
  Wallet,
  Bell,
  LogOut,
  UserPlus,
  LayoutDashboard,
  Shield,
} from "lucide-react";

const adminNavItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/admin/committees", label: "Committees", icon: Users },
  { path: "/admin/join-requests", label: "Join Requests", icon: UserPlus },
  { path: "/admin/payments", label: "Payments", icon: CreditCard },
  { path: "/admin/payouts", label: "Payouts", icon: Banknote },
  { path: "/admin/users", label: "Users", icon: UserCheck },
  { path: "/admin/settings", label: "Settings", icon: Settings },
  { path: "/admin/user-verification", label: "User Verification", icon: Shield },
];

const userNavItems = [
  { path: "/user/dashboard", label: "My Dashboard", icon: BarChart3 },
  { path: "/user/available-committees", label: "Available Committees", icon: Search },
  { path: "/user/my-payments", label: "My Payments", icon: Receipt },
  { path: "/user/my-payouts", label: "My Payouts", icon: Wallet },
  { path: "/user/notifications", label: "Notifications", icon: Bell },
  { path: "/user/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { userData, logout } = useAuth();

  if (!userData) return null;

  const navItems = userData.role === "admin" ? adminNavItems : userNavItems;
  const roleText = userData.role === "admin" ? "Admin Dashboard" : "User Dashboard";

  return (
    <aside className="w-64 bg-secondary border-r border-accent-orange/30 min-h-screen">
      <div className="p-6">
        <GradientHeading className="text-xl mb-1">Committee ROSCA</GradientHeading>
        <p className="text-secondary text-sm">{roleText}</p>
      </div>

      <nav className="px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start text-left ${
                  isActive
                    ? "bg-accent-orange/20 text-accent-orange border-accent-orange/30"
                    : "hover:bg-primary/50 text-primary hover:text-primary"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="mr-3 h-4 w-4 text-accent-cyan" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-4 right-4">
        <Button
          variant="ghost"
          className="justify-start text-red-400 hover:bg-red-500/20"
          onClick={logout}
          data-testid="button-logout"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}