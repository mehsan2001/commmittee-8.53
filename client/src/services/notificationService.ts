
import { createNotification } from "./firestore";

export const notifyAdminOfVerificationSubmission = async (userId: string, userName: string) => {
  try {
    // Get all admin users (you might want to cache this)
    const admins = await import("./firestore").then(module => module.getAllUsers())
      .then(users => users.filter(user => user.role === 'admin'));

    // Create notification for each admin
    const notificationPromises = admins.map(admin => 
      createNotification({
        userId: admin.id,
        title: "New Verification Submission",
        message: `${userName} has submitted documents for verification. Please review in the User Verification section.`,
        type: "verification_submitted" as const,
      })
    );

    await Promise.all(notificationPromises);
    console.log(`Notified ${admins.length} admins about verification submission from ${userName}`);
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
};

export const notifyAdminOfProfileCompletion = async (userId: string, userName: string) => {
  try {
    const admins = await import("./firestore").then(module => module.getAllUsers())
      .then(users => users.filter(user => user.role === 'admin'));

    const notificationPromises = admins.map(admin => 
      createNotification({
        userId: admin.id,
        title: "Profile Completion Alert",
        message: `${userName} has completed their profile with all required documents and guarantor details. Ready for verification.`,
        type: "profile_completed" as const,
      })
    );

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Failed to notify admins about profile completion:", error);
  }
};
