import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Search, History, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserCommittees, getUserPayments } from "@/services/firestore";
import { useLocation } from "wouter";

export default function UserDashboard() {
  const { userData } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userCommittees = [] } = useQuery({
    queryKey: ["/api/users", userData?.id, "committees"],
    queryFn: () => getUserCommittees(userData!.id),
    enabled: !!userData,
  });

  const { data: userPayments = [] } = useQuery({
    queryKey: ["/api/users", userData?.id, "payments"],
    queryFn: () => getUserPayments(userData!.id),
    enabled: !!userData,
  });

  const recentPayments = userPayments.slice(0, 5);
  const thisMonthPayments = userPayments.filter(payment => {
    const paymentDate = new Date(payment.submittedAt);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent-green/20 text-accent-green">Active</Badge>;
      case "pending":
        return <Badge className="bg-accent-orange/20 text-accent-orange">Pending</Badge>;
      case "completed":
        return <Badge className="bg-secondary text-primary">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const quickActions = [
    {
      title: "Submit Payment",
      icon: Upload,
      color: "text-accent-cyan",
      action: () => setLocation("/user/my-payments"),
    },
    {
      title: "Find Committees",
      icon: Search,
      color: "text-accent-green",
      action: () => setLocation("/user/available-committees"),
    },
    {
      title: "Payment History",
      icon: History,
      color: "text-accent-orange",
      action: () => setLocation("/user/my-payments"),
    },
    {
      title: "My Payouts",
      icon: Wallet,
      color: "text-secondary",
      action: () => setLocation("/user/my-payouts"),
    },
  ];

  return (
    <div className="space-y-8">
      {/* My Committees and Payment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg">My Committees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userCommittees.length === 0 ? (
                <p className="text-secondary text-center py-4" data-testid="text-no-committees">
                  You haven't joined any committees yet
                </p>
              ) : (
                userCommittees.map((committee) => (
                  <div key={committee.id} className="p-4 bg-primary/50 rounded-lg" data-testid={`committee-${committee.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{committee.name}</h4>
                      {getStatusBadge(committee.status)}
                    </div>
                    <div className="text-sm text-secondary space-y-1">
                      <p>Monthly: Rs {committee.amount}</p>
                      <p>Position: {committee.members.indexOf(userData!.id) + 1}/{committee.memberCount}</p>
                      <p>Duration: {committee.duration} months</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg">Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200" 
              alt="Savings dashboard interface" 
              className="w-full h-32 object-cover rounded-lg mb-4"
            />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary">This Month</span>
                <span className={thisMonthPayments.length > 0 ? "text-accent-green" : "text-accent-orange"}>
                  {thisMonthPayments.length > 0 ? "Paid" : "Pending"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Total Payments</span>
                <span className="text-primary">{userPayments.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-20 flex-col bg-secondary border-accent-orange/30 hover:bg-primary/50"
                onClick={action.action}
                data-testid={`quick-action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={`h-6 w-6 mb-2 ${action.color}`} />
                <span className="text-sm font-medium">{action.title}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {recentPayments.length > 0 && (
        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-primary/50 rounded-lg" data-testid={`payment-${payment.id}`}>
                  <div>
                    <p className="font-medium">Rs {payment.amount}</p>
                    <p className="text-secondary text-sm">
                      {payment.submittedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={
                    payment.status === 'approved' 
                      ? "bg-accent-green/20 text-accent-green"
                      : payment.status === 'rejected'
                      ? "bg-red-500/20 text-red-400"
                      : "bg-accent-orange/20 text-accent-orange"
                  }>
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
