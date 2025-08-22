import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Clock, DollarSign } from "lucide-react";
import { getAllCommittees, getAllPayments, getAllPayouts, getAllUsers } from "@/services/firestore";

export default function AdminDashboard() {
  const { data: committees = [] } = useQuery({
    queryKey: ["/api/committees"],
    queryFn: getAllCommittees,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: getAllPayments,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["/api/payouts"],
    queryFn: getAllPayouts,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: getAllUsers,
  });

  const stats = {
    totalCommittees: committees.length,
    activeMembers: users.filter(user => user.role === 'user').length,
    pendingPayments: payments.filter(payment => payment.status === 'pending').length,
    totalPayouts: payouts.reduce((sum, payout) => sum + payout.amount, 0),
  };

  const recentPayments = payments
    .filter(payment => payment.status === 'pending')
    .slice(0, 5);

  const upcomingPayouts = payouts
    .filter(payout => payout.status === 'pending')
    .slice(0, 5);

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'Unknown User';
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-secondary border-accent-orange/30" data-testid="card-total-committees">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Total Committees</p>
                <p className="text-2xl font-bold text-accent-cyan" data-testid="text-total-committees">
                  {stats.totalCommittees}
                </p>
              </div>
              <Users className="h-8 w-8 text-accent-cyan/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-accent-orange/30" data-testid="card-active-members">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Active Members</p>
                <p className="text-2xl font-bold text-accent-green" data-testid="text-active-members">
                  {stats.activeMembers}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-accent-green/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-accent-orange/30" data-testid="card-pending-payments">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Pending Payments</p>
                <p className="text-2xl font-bold text-accent-orange" data-testid="text-pending-payments">
                  {stats.pendingPayments}
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent-orange/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-accent-orange/30" data-testid="card-total-payouts">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary text-sm">Total Payouts</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-total-payouts">
                  Rs {stats.totalPayouts.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-secondary/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <p className="text-secondary text-center py-4" data-testid="text-no-recent-payments">
                  No pending payments
                </p>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-primary/50 rounded-lg" data-testid={`payment-${payment.id}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-accent-cyan/20 rounded-full flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-accent-cyan" />
                      </div>
                      <div>
                        <p className="font-medium">User: {getUserName(payment.userId)} ({payment.userId})</p>
                        <p className="text-secondary text-sm">Committee ID: {payment.committeeId}</p>
                        <p className="text-secondary text-sm">Amount: Rs {payment.amount}</p>
                        <p className="text-secondary text-sm">Submitted At: {new Date(payment.submittedAt).toLocaleDateString()}</p>
                        {payment.receiptUrl && (
                          <img src={payment.receiptUrl} alt="Payment Receipt" className="w-16 h-16 object-cover rounded-md mt-2" />
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${{
                      pending: 'bg-accent-orange/20 text-accent-orange',
                      approved: 'bg-accent-green/20 text-accent-green',
                      rejected: 'bg-red-500/20 text-red-500',
                    }[payment.status]}`}>
                      {payment.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-accent-orange/30">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPayouts.length === 0 ? (
                <p className="text-secondary text-center py-4" data-testid="text-no-upcoming-payouts">
                  No upcoming payouts
                </p>
              ) : (
                upcomingPayouts.map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between p-3 bg-primary/50 rounded-lg" data-testid={`payout-${payout.id}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-accent-green/20 rounded-full flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-accent-green" />
                      </div>
                      <div>
                        <p className="font-medium">User: {getUserName(payout.userId)} ({payout.userId})</p>
                        <p className="text-secondary text-sm">Committee ID: {payout.committeeId}</p>
                        <p className="text-secondary text-sm">Amount: Rs {payout.amount}</p>
                        {payout.receiptImageUrl && (
                          <img src={payout.receiptImageUrl} alt="Payout Receipt" className="w-16 h-16 object-cover rounded-md mt-2" />
                        )}
                      </div>
                    </div>
                    <span className="text-secondary text-sm">
                      {new Date(payout.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
