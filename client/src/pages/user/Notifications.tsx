import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Check, CreditCard, DollarSign, Users, AlertCircle } from "lucide-react";
import { getUserNotifications, markNotificationAsRead } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";

export default function Notifications() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/users", userData?.id, "notifications"],
    queryFn: () => getUserNotifications(userData!.id),
    enabled: !!userData,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userData?.id, "notifications"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const readNotifications = notifications.filter(n => n.read);
  const unreadNotifications = notifications.filter(n => !n.read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_due":
        return <CreditCard className="h-5 w-5 text-accent-orange" />;
      case "payment_approved":
        return <Check className="h-5 w-5 text-accent-green" />;
      case "payment_rejected":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "payout_scheduled":
        return <DollarSign className="h-5 w-5 text-accent-cyan" />;
      case "payout_received":
        return <DollarSign className="h-5 w-5 text-accent-green" />;
      case "committee_joined":
        return <Users className="h-5 w-5 text-accent-cyan" />;
      default:
        return <Bell className="h-5 w-5 text-secondary" />;
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    const opacity = read ? "/20" : "/30";
    switch (type) {
      case "payment_due":
        return `bg-accent-orange${opacity} border-accent-orange/30`;
      case "payment_approved":
      case "payout_received":
        return `bg-accent-green${opacity} border-accent-green/30`;
      case "payment_rejected":
        return `bg-red-500${opacity} border-red-500/30`;
      case "payout_scheduled":
      case "committee_joined":
        return `bg-accent-cyan${opacity} border-accent-cyan/30`;
      default:
        return `bg-secondary border-accent-orange/30`;
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  if (isLoading) {
    return <div>Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge className="bg-accent-orange/20 text-accent-orange" data-testid="badge-unread-count">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-accent-cyan" />
          <span className="text-sm text-secondary">Stay updated with your committee activities</span>
        </div>
      </div>

      {/* Unread Notifications */}
      {unreadNotifications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <Bell className="mr-2 h-5 w-5 text-accent-orange" />
            Unread Notifications
          </h3>
          {unreadNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              isMarkingAsRead={markAsReadMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Read Notifications */}
      {readNotifications.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <BellOff className="mr-2 h-5 w-5 text-secondary" />
            Read Notifications
          </h3>
          {readNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => {}}
              isMarkingAsRead={false}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {notifications.length === 0 && (
        <Card className="bg-secondary border-accent-orange/30">
          <CardContent className="p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-secondary/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Notifications</h3>
            <p className="text-secondary" data-testid="text-no-notifications">
              You're all caught up! Notifications will appear here when there are updates about your committees, payments, and payouts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  isMarkingAsRead: boolean;
}

function NotificationCard({ notification, onMarkAsRead, isMarkingAsRead }: NotificationCardProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment_due":
        return <CreditCard className="h-5 w-5 text-accent-orange" />;
      case "payment_approved":
        return <Check className="h-5 w-5 text-accent-green" />;
      case "payment_rejected":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case "payout_scheduled":
        return <DollarSign className="h-5 w-5 text-accent-cyan" />;
      case "payout_received":
        return <DollarSign className="h-5 w-5 text-accent-green" />;
      case "committee_joined":
        return <Users className="h-5 w-5 text-accent-cyan" />;
      default:
        return <Bell className="h-5 w-5 text-secondary" />;
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    const opacity = read ? "/20" : "/30";
    switch (type) {
      case "payment_due":
        return `bg-accent-orange${opacity} border-accent-orange/30`;
      case "payment_approved":
      case "payout_received":
        return `bg-accent-green${opacity} border-accent-green/30`;
      case "payment_rejected":
        return `bg-red-500${opacity} border-red-500/30`;
      case "payout_scheduled":
      case "committee_joined":
        return `bg-accent-cyan${opacity} border-accent-cyan/30`;
      default:
        return `bg-secondary border-accent-orange/30`;
    }
  };

  return (
    <Card 
      className={`${getNotificationColor(notification.type, notification.read)} ${
        !notification.read ? "shadow-lg" : ""
      }`}
      data-testid={`notification-${notification.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">{notification.title}</h4>
              <p className="text-sm text-secondary mb-2">{notification.message}</p>
              <p className="text-xs text-secondary">
                {notification.createdAt.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!notification.read && (
              <div className="w-2 h-2 bg-accent-orange rounded-full" data-testid={`unread-indicator-${notification.id}`}></div>
            )}
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-accent-cyan hover:text-accent-cyan/80"
                onClick={() => onMarkAsRead(notification.id)}
                disabled={isMarkingAsRead}
                data-testid={`button-mark-read-${notification.id}`}
              >
                Mark as read
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
