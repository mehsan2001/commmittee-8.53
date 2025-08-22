import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type {
  User,
  InsertUser,
  Committee,
  InsertCommittee,
  Payment,
  InsertPayment,
  Payout,
  InsertPayout,
  Notification,
  InsertNotification,
  JoinRequest,
  InsertJoinRequest,
  CommitteeWithActualMembersCount,
} from "@shared/schema";

// Collection names with prefix
const COLLECTIONS = {
  users: "cmt_rplt_users",
  committees: "cmt_rplt_committees",
  payments: "cmt_rplt_payments",
  payouts: "cmt_rplt_payouts",
  notifications: "cmt_rplt_notifications",
  joinRequests: "cmt_rplt_join_requests",
} as const;

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any) => {
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

// User operations
export async function createUser(userData: InsertUser & { firebaseUid: string }): Promise<User> {
  const docRef = await addDoc(collection(db, COLLECTIONS.users), {
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...convertTimestamps(docSnap.data()) } as User;
}

export async function getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
  const q = query(collection(db, COLLECTIONS.users), where("firebaseUid", "==", firebaseUid));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) return null;

  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...convertTimestamps(doc.data()) } as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const docRef = doc(db, COLLECTIONS.users, userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as User;
}

export async function getAllUsers(): Promise<User[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.users));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as User[];
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.users, userId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date(),
  });
}

// Committee operations
export async function createCommittee(committeeData: InsertCommittee): Promise<Committee> {
  const committeeDataWithDefaults = {
    ...committeeData,
    status: 'active',
    members: [],
    currentRound: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log('Creating committee with data:', committeeDataWithDefaults);

  const docRef = await addDoc(collection(db, COLLECTIONS.committees), committeeDataWithDefaults);

  const docSnap = await getDoc(docRef);
  const createdCommittee = { id: docRef.id, ...convertTimestamps(docSnap.data()) } as Committee;

  console.log('Created committee:', createdCommittee);
  return createdCommittee;
}

export async function getAllCommittees(): Promise<CommitteeWithActualMembersCount[]> {
  try {
    console.log("Fetching all committees from collection:", COLLECTIONS.committees);
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.committees));
    console.log("Found committees:", querySnapshot.docs.length, "documents");

    const committees = querySnapshot.docs.map(doc => {
      console.log("Committee doc:", doc.id, doc.data());
      return {
        id: doc.id,
        ...convertTimestamps(doc.data())
      };
    }) as Committee[];

    // Get actual member counts for each committee
    const committeesWithCounts = await Promise.all(
      committees.map(async (committee) => {
        const memberCount = await getCommitteeMemberCount(committee.id);
        return {
          ...committee,
          actualMembersCount: memberCount
        };
      })
    );

    console.log("Returning all committees:", committeesWithCounts.length);
    return committeesWithCounts;
  } catch (error) {
    console.error("Error fetching committees:", error);
    throw error;
  }
}

export async function getCommitteeMembers(committeeId: string): Promise<User[]> {
  const committeeDoc = await getDoc(doc(db, COLLECTIONS.committees, committeeId));

  if (!committeeDoc.exists()) return [];

  const committee = { id: committeeDoc.id, ...convertTimestamps(doc.data()) } as Committee;
  const memberIds = committee.members || [];

  if (memberIds.length === 0) return [];

  // Fetch all members in parallel
  const memberPromises = memberIds.map(async (userId) => {
    const userDoc = await getDoc(doc(db, COLLECTIONS.users, userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...convertTimestamps(userDoc.data()) } as User;
    }
    return null;
  });

  const members = await Promise.all(memberPromises);
  return members.filter(Boolean) as User[];
}

export async function getCommitteeMemberCount(committeeId: string): Promise<number> {
  try {
    const committeeDoc = await getDoc(doc(db, COLLECTIONS.committees, committeeId));
    if (!committeeDoc.exists()) {
      return 0;
    }
    const committee = committeeDoc.data() as Committee;
    return committee.members ? committee.members.length : 0;
  } catch (error) {
    console.error(`Error getting member count for committee ${committeeId}:`, error);
    return 0;
  }
}

export async function getCommitteeById(committeeId: string): Promise<Committee | null> {
  const docRef = doc(db, COLLECTIONS.committees, committeeId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Committee;
}

export async function getAvailableCommittees(): Promise<Committee[]> {
  try {
    // Try without orderBy first to avoid composite index issues
    const q = query(
      collection(db, COLLECTIONS.committees),
      where("status", "==", "active")
    );
    const querySnapshot = await getDocs(q);

    const committees = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }) as Committee)
      .filter(committee => {
        // Handle potential undefined members array
        const members = committee.members || [];
        const hasAvailableSlots = members.length < committee.memberCount;

        // Debug logging
        console.log(`Committee ${committee.name}: members=${members.length}, memberCount=${committee.memberCount}, hasSlots=${hasAvailableSlots}`);

        return hasAvailableSlots;
      })
      // Sort client-side instead
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log(`Available committees found: ${committees.length}`);
    return committees;
  } catch (error) {
    console.error("Error fetching available committees:", error);
    throw error;
  }
}

export async function getUserCommittees(userId: string): Promise<Committee[]> {
  const q = query(
    collection(db, COLLECTIONS.committees),
    where("members", "array-contains", userId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Committee[];
}

export async function updateCommittee(committeeId: string, updates: Partial<Committee>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.committees, committeeId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteCommittee(committeeId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.committees, committeeId);
  await deleteDoc(docRef);
}

// Payment operations
export async function createPayment(paymentData: InsertPayment): Promise<Payment> {
  const docRef = await addDoc(collection(db, COLLECTIONS.payments), {
    ...paymentData,
    status: 'pending',
    submittedAt: new Date(),
  });

  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...convertTimestamps(docSnap.data()) } as Payment;
}

export async function getAllPayments(): Promise<Payment[]> {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTIONS.payments), orderBy("submittedAt", "desc"))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Payment[];
}

export async function getPendingPayments(): Promise<Payment[]> {
  const q = query(
    collection(db, COLLECTIONS.payments),
    where("status", "==", "pending"),
    orderBy("submittedAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  console.log("Query snapshot size:", querySnapshot.size);
  console.log("Query docs:", querySnapshot.docs.map(doc => doc.id));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Payment[];
}

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const q = query(
    collection(db, COLLECTIONS.payments),
    where("userId", "==", userId),
    orderBy("submittedAt", "desc")
  );
  try {
    const querySnapshot = await getDocs(q);
    console.log("Query snapshot size:", querySnapshot.size);
    console.log("Query docs:", querySnapshot.docs.map(doc => ({id: doc.id, data: doc.data()})));
    console.log("Searching for userId:", userId);

    // Also check if there are any payments at all
    const allPaymentsSnapshot = await getDocs(collection(db, COLLECTIONS.payments));
    console.log("Total payments in collection:", allPaymentsSnapshot.size);
    console.log("All payment userIds:", allPaymentsSnapshot.docs.map(doc => doc.data().userId));

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Payment[];
  } catch (error) {
    console.error("Error fetching user payments:", error);
    return [];
  }
}

export async function getUserPaymentsWithDetails(userId: string): Promise<Payment[]> {
  const payments = await getUserPayments(userId);

  const paymentsWithDetails = await Promise.all(
    payments.map(async (payment) => {
      let reviewerName = null;
      if (payment.reviewedBy) {
        const reviewer = await getUserById(payment.reviewedBy);
        reviewerName = reviewer?.name || "Unknown";
      }
      return { ...payment, reviewerName };
    })
  );

  return paymentsWithDetails;
}

export async function updatePayment(paymentId: string, updates: Partial<Payment>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.payments, paymentId);
  await updateDoc(docRef, updates);
}

export async function approvePayment(paymentId: string, reviewerId: string, remarks?: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.payments, paymentId);
  await updateDoc(docRef, {
    status: 'approved',
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
    remarks: remarks || '',
  });
}

export async function rejectPayment(paymentId: string, reviewerId: string, remarks: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.payments, paymentId);
  await updateDoc(docRef, {
    status: 'rejected',
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
    remarks,
  });
}

export async function deletePayment(paymentId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.payments, paymentId);
  await deleteDoc(docRef);
}

// Payout operations
export async function createPayout(payoutData: InsertPayout): Promise<Payout> {
  const docRef = await addDoc(collection(db, COLLECTIONS.payouts), {
    ...payoutData,
    status: 'pending',
    createdAt: new Date(),
  });

  // Create notification for scheduled payout with fee breakdown
  const notificationMessage = payoutData.feeAmount > 0 
    ? `A payout of Rs ${payoutData.amount.toLocaleString()} has been scheduled for slot #${payoutData.slotNumber}. Original amount: Rs ${payoutData.originalAmount.toLocaleString()}, Early payout fee: Rs ${payoutData.feeAmount.toLocaleString()}.`
    : `A payout of Rs ${payoutData.amount.toLocaleString()} has been scheduled for slot #${payoutData.slotNumber}.`;

  await createNotification({
    userId: payoutData.userId,
    title: 'Payout Scheduled',
    message: notificationMessage,
    type: 'payout_scheduled',
  });

  const docSnap = await getDoc(docRef);
  return { id: docRef.id, ...convertTimestamps(docSnap.data()) } as Payout;
}

export async function getAllPayouts(): Promise<Payout[]> {
  console.log("Fetching all payouts from collection:", COLLECTIONS.payouts);
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTIONS.payouts), orderBy("createdAt", "desc"))
  );
  console.log("Found all payouts:", querySnapshot.size, "documents");
  querySnapshot.forEach(doc => {
    console.log("All payout doc:", doc.id, doc.data());
  });

  const payouts = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as Payout[];

  console.log("Returning all payouts:", payouts.length);
  return payouts;
}

export async function getUserPayouts(userId: string): Promise<Payout[]> {
  console.log("getUserPayouts: Querying payouts with userId:", userId);

  // Query payouts directly using the provided userId
  const q = query(
    collection(db, COLLECTIONS.payouts),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  try {
    const querySnapshot = await getDocs(q);
    console.log("getUserPayouts: Found", querySnapshot.size, "payouts for userId:", userId);

    const payouts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as Payout[];

    if (payouts.length === 0) {
      console.log("getUserPayouts: No payouts found. Checking if userId might be different...");

      // Debug: Show all payouts and their userId values
      console.log("=== All payouts in collection ===");
      const allPayoutsSnapshot = await getDocs(collection(db, COLLECTIONS.payouts));
      allPayoutsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Payout ${doc.id}: userId="${data.userId}"`);
      });
      console.log("=== End debug ===");
    }

    return payouts;
  } catch (error) {
    console.error("Error in getUserPayouts:", error);
    throw error;
  }
}

export async function completePayout(payoutId: string): Promise<void> {
  const payoutDoc = await getDoc(doc(db, COLLECTIONS.payouts, payoutId));
  const payout = payoutDoc.data() as Payout;

  // Update payout status
  const docRef = doc(db, COLLECTIONS.payouts, payoutId);
  await updateDoc(docRef, {
    status: 'completed',
    completedDate: new Date(),
  });

  // Create notification with fee breakdown
  const notificationMessage = payout.feeAmount > 0 
    ? `You have received Rs ${payout.amount.toLocaleString()} for payout slot #${payout.slotNumber}. Original amount: Rs ${payout.originalAmount.toLocaleString()}, Early payout fee: Rs ${payout.feeAmount.toLocaleString()}.`
    : `You have received Rs ${payout.amount.toLocaleString()} for payout slot #${payout.slotNumber}.`;

  await createNotification({
    userId: payout.userId,
    title: 'Payout Received',
    message: notificationMessage,
    type: 'payout_received',
  });
}

export async function deletePayout(payoutId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.payouts, payoutId);
  await deleteDoc(docRef);
}

// Notification operations
export const createNotification = async (notification: InsertNotification): Promise<void> => {
  try {
    const docRef = await addDoc(collection(db, "notifications"), {
      ...notification,
      id: "", // Will be overwritten by Firestore
      createdAt: new Date(),
      read: false,
    });

    // Update the document with its own ID
    await updateDoc(docRef, { id: docRef.id });
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Notification[];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, "notifications", notificationId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// Join Request operations

// Function to check user verification status
export async function checkUserVerificationStatus(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.users, userId));
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data() as User;
    const verificationStatus = userData.verificationStatus;

    // User must be verified and admin reviewed
    return verificationStatus?.isVerified === true && 
           verificationStatus?.adminReviewed === true &&
           verificationStatus?.documentsSubmitted === true;
  } catch (error) {
    console.error("Error checking user verification status:", error);
    return false;
  }
}

export async function createJoinRequest(data: InsertJoinRequest): Promise<JoinRequest> {
  // Check user verification status first
  const isVerified = await checkUserVerificationStatus(data.userId);
  if (!isVerified) {
    throw new Error("User must be verified by admin before joining committees. Please complete your profile verification first.");
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.joinRequests), {
    ...data,
    status: "pending",
    requestedAt: new Date(),
  });

  const doc = await getDoc(docRef);
  return {
    id: docRef.id,
    ...convertTimestamps(doc.data())
  } as JoinRequest;
}


export async function getAllJoinRequests(): Promise<JoinRequest[]> {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTIONS.joinRequests), orderBy("requestedAt", "desc"))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as JoinRequest[];
}

export async function getPendingJoinRequests(): Promise<JoinRequest[]> {
  try {
    // First try with orderBy to avoid composite index issues
    const q = query(
      collection(db, COLLECTIONS.joinRequests),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);

    // Sort client-side instead of using orderBy in the query
    const joinRequests = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      }) as JoinRequest)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    return joinRequests;
  } catch (error) {
    console.error("Error fetching pending join requests:", error);
    throw error;
  }
}

export async function getUserJoinRequests(userId: string): Promise<JoinRequest[]> {
  const q = query(
    collection(db, COLLECTIONS.joinRequests),
    where("userId", "==", userId),
    orderBy("requestedAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...convertTimestamps(doc.data())
  })) as JoinRequest[];
}

export async function approveJoinRequest(requestId: string, reviewerId: string): Promise<void> {
  // Get the join request first
  const requestDoc = await getDoc(doc(db, COLLECTIONS.joinRequests, requestId));
  if (!requestDoc.exists()) {
    throw new Error("Join request not found");
  }

  const requestData = requestDoc.data() as JoinRequest;

  // Update join request status
  await updateDoc(doc(db, COLLECTIONS.joinRequests, requestId), {
    status: 'approved',
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
  });

  // Add user to committee members
  const committeeRef = doc(db, COLLECTIONS.committees, requestData.committeeId);
  const committeeDoc = await getDoc(committeeRef);

  if (committeeDoc.exists()) {
    const committeeData = committeeDoc.data() as Committee;
    const updatedMembers = [...(committeeData.members || []), requestData.userId];

    await updateDoc(committeeRef, {
      members: updatedMembers,
      updatedAt: new Date(),
    });

    // Create notification for user
    await createNotification({
      userId: requestData.userId,
      title: 'Committee Request Approved',
      message: `Your request to join the committee has been approved!`,
      type: 'committee_joined',
    });
  }
}

export async function rejectJoinRequest(requestId: string, reviewerId: string, remarks?: string): Promise<void> {
  const requestDoc = await getDoc(doc(db, COLLECTIONS.joinRequests, requestId));
  if (!requestDoc.exists()) {
    throw new Error("Join request not found");
  }

  const requestData = requestDoc.data() as JoinRequest;

  await updateDoc(doc(db, COLLECTIONS.joinRequests, requestId), {
    status: 'rejected',
    reviewedAt: new Date(),
    reviewedBy: reviewerId,
    remarks: remarks || '',
  });

  // Create notification for user
  await createNotification({
    userId: requestData.userId,
    title: 'Committee Request Rejected',
    message: remarks ? `Your committee request was rejected: ${remarks}` : 'Your committee request was rejected.',
    type: 'committee_joined',
  });
}

export async function deleteJoinRequest(requestId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.joinRequests, requestId);
  await deleteDoc(docRef);
}

// Export the types from the shared schema
export type { 
  User, 
  InsertUser, 
  Committee, 
  InsertCommittee, 
  Payment, 
  InsertPayment,
  Payout,
  InsertPayout,
  Notification,
  InsertNotification,
  JoinRequest,
  InsertJoinRequest,
  CommitteeWithActualMembersCount
} from "@shared/schema";