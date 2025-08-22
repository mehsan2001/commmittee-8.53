import React, { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { lazy, Suspense } from 'react';

// Auth pages
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import Committees from "@/pages/admin/Committees";
import Payments from "@/pages/admin/Payments";
import Payouts from "@/pages/admin/Payouts";
import Users from "@/pages/admin/Users";
import AdminSettings from "@/pages/admin/Settings";
import JoinRequests from "@/pages/admin/JoinRequests";

// Lazy loaded components
const UserVerification = lazy(() => import('@/pages/admin/UserVerification'));

// User pages
import UserDashboard from "@/pages/user/UserDashboard";
import AvailableCommittees from "@/pages/user/AvailableCommittees";
import MyPayments from "@/pages/user/MyPayments";
import MyPayouts from "@/pages/user/MyPayouts";
import Notifications from "@/pages/user/Notifications";
import UserSettings from "@/pages/user/Settings";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'user' }) {
  const { currentUser, userData, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        setLocation("/login");
        return;
      }
      
      if (role && userData?.role !== role) {
        setLocation("/");
        return;
      }
    }
  }, [currentUser, userData, loading, role, setLocation]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  if (!currentUser || (role && userData?.role !== role)) {
    return null;
  }

  return <>{children}</>;
}

function RoleBasedRoute({ 
  children, 
  allowedRole 
}: { 
  children: React.ReactNode; 
  allowedRole: "admin" | "user" 
}) {
  const { userData } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!userData) {
      setLocation("/login");
    } else if (userData.role !== allowedRole) {
      const redirectPath = userData.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
      setLocation(redirectPath);
    }
  }, [userData, allowedRole, setLocation]);

  if (!userData || userData.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}

function AppLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { userData } = useAuth();

  if (!userData) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-primary">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar title={title} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location;

    if (path.startsWith("/admin/")) {
      switch (path) {
        case "/admin/dashboard": return "Dashboard Overview";
        case "/admin/user-verification": return "User Verification";
        case "/admin/committees": return "Committee Management";
        case "/admin/payments": return "Payment Management";
        case "/admin/payouts": return "Payout Management";
        case "/admin/users": return "User Management";
        case "/admin/settings": return "Settings";
        case "/admin/join-requests": return "Join Requests";
        default: return "Admin Dashboard";
      }
    } else if (path.startsWith("/user/")) {
      switch (path) {
        case "/user/dashboard": return "My Dashboard";
        case "/user/available-committees": return "Available Committees";
        case "/user/my-payments": return "My Payments";
        case "/user/my-payouts": return "My Payouts";
        case "/user/notifications": return "Notifications";
        case "/user/settings": return "Settings";
        default: return "User Dashboard";
      }
    }

    return "Committee ROSCA";
  };

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        <Login />
      </Route>

      <Route path="/signup">
        <Signup />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <AdminDashboard />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/user-verification">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <Suspense fallback={<div>Loading...</div>}>
                <UserVerification />
              </Suspense>
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/committees">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <Committees />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/payments">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <Payments />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/payouts">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <Payouts />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/users">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <Users />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/settings">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <AdminSettings />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/join-requests">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="admin">
            <AppLayout title={getPageTitle()}>
              <JoinRequests />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      {/* User routes */}
      <Route path="/user/dashboard">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="user">
            <AppLayout title={getPageTitle()}>
              <UserDashboard />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/user/available-committees">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="user">
            <AppLayout title={getPageTitle()}>
              <AvailableCommittees />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/user/my-payments">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="user">
            <AppLayout title={getPageTitle()}>
              <MyPayments />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/user/my-payouts">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="user">
            <AppLayout title={getPageTitle()}>
              <MyPayouts />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/user/notifications">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="user">
            <AppLayout title={getPageTitle()}>
              <Notifications />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/user/settings">
        <ProtectedRoute>
          <RoleBasedRoute allowedRole="user">
            <AppLayout title={getPageTitle()}>
              <UserSettings />
            </AppLayout>
          </RoleBasedRoute>
        </ProtectedRoute>
      </Route>

      {/* Default redirect */}
      <Route path="/">
        <DefaultRedirect />
      </Route>

      {/* 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function DefaultRedirect() {
  const { currentUser, userData } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!currentUser || !userData) {
      setLocation("/login");
    } else {
      const redirectPath = userData.role === "admin" ? "/admin/dashboard" : "/user/dashboard";
      setLocation(redirectPath);
    }
  }, [currentUser, userData, setLocation]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;