import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.string(),
  firebaseUid: z.string(),
  username: z.string(),
  fullName: z.string(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']),
  pin: z.string().length(4),
  profileImage: z.string().optional(),
  bankDetails: z.object({
    bankName: z.string(),
    accountNumber: z.string(),
    accountHolder: z.string(),
  }).optional(),
  // Enhanced profile fields
  phone: z.string().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  // Document uploads
  documents: z.object({
    bankStatement: z.string().optional(),
    salarySlip: z.string().optional(),
    cnicFront: z.string().optional(),
    cnicBack: z.string().optional(),
    utilityBill: z.string().optional(),
  }).optional(),
  // Guarantor details
  guarantors: z.array(z.object({
    fullName: z.string(),
    phoneNumber: z.string(),
    cnicNumber: z.string(),
    relationship: z.string(),
    cnicFrontUrl: z.string().optional(),
    cnicBackUrl: z.string().optional(),
  })).optional(),
  // Verification status
  verificationStatus: z.object({
    isVerified: z.boolean().default(false),
    documentsSubmitted: z.boolean().default(false),
    guarantorsSubmitted: z.boolean().default(false),
    adminReviewed: z.boolean().default(false),
    reviewedBy: z.string().optional(),
    reviewedAt: z.date().optional(),
    submittedAt: z.date().optional(),
    remarks: z.string().optional(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertUserSchema = userSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Committee schema
export const committeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().positive(),
  memberCount: z.number().min(5).max(100),
  duration: z.number().min(1),
  startDate: z.date(),
  status: z.enum(['pending', 'active', 'completed']),
  members: z.array(z.string()), // User IDs
  adminId: z.string(),
  currentRound: z.number().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  actualMembersCount: z.number().optional(), // Derived field for actual number of active members
  payoutSlots: z.array(z.object({
    userId: z.string(),
    slotNumber: z.number().min(1),
    isConfirmed: z.boolean().default(false),
  })).optional(), // Payout slot assignments
  payoutSlotFees: z.record(z.string(), z.number()).optional(), // Stores fee percentages for each slot, e.g., { "1": 0.10, "2": 0.10, "3": 0.075 }
});

export const insertCommitteeSchema = committeeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  members: true,
  currentRound: true,
});

// Payment schema
export const paymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  committeeId: z.string(),
  amount: z.number().positive(),
  status: z.enum(['pending', 'approved', 'rejected']),
  receiptUrl: z.string().optional(),
  remarks: z.string().optional(),
  submittedAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
  reviewerName: z.string().optional(),
});

export const insertPaymentSchema = paymentSchema.omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
});

// Payout schema
export const payoutSchema = z.object({
  id: z.string(),
  userId: z.string(),
  committeeId: z.string(),
  amount: z.number().positive(),
  originalAmount: z.number().positive(), // Original amount before fees
  feeAmount: z.number().default(0), // Early payout fee amount
  netAmount: z.number().positive(), // Final amount after fees
  feeDetails: z.object({
    percentage: z.number(),
    reason: z.string()
  }).optional(), // Details about the fee applied
  slotNumber: z.number().min(1), // Payout slot selected by user
  status: z.enum(['pending', 'completed']),
  scheduledDate: z.date(),
  completedDate: z.date().optional(),
  initiatedBy: z.string(),
  round: z.number(),
  receiptImageUrl: z.string().optional(), // URL for bank receipt image
  createdAt: z.date(),
});

export const insertPayoutSchema = payoutSchema.omit({
  id: true,
  createdAt: true,
  completedDate: true,
  status: true,
});

// Notification schema
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(['payment_due', 'payment_approved', 'payment_rejected', 'payout_scheduled', 'payout_received', 'committee_joined', 'verification_submitted', 'profile_completed']),
  read: z.boolean().default(false),
  createdAt: z.date(),
});

export const insertNotificationSchema = notificationSchema.omit({
  id: true,
  createdAt: true,
  read: true,
});

// Join Request schema
export const joinRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  committeeId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  requestedAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
  preferredPayoutSlot: z.number().min(1).max(10).optional(), // User's preferred payout slot
});

export const insertJoinRequestSchema = joinRequestSchema.omit({
  id: true,
  requestedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
});

// Export types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Committee = z.infer<typeof committeeSchema>;
export type InsertCommittee = z.infer<typeof insertCommitteeSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payout = z.infer<typeof payoutSchema>;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type JoinRequest = z.infer<typeof joinRequestSchema>;
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;

// Additional derived types
export type CommitteeWithActualMembersCount = Committee & {
  actualMembersCount: number;
};