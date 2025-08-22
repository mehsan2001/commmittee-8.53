import { Committee, Payout } from '@shared/schema';

export interface PayoutSlotValidation {
  isValid: boolean;
  conflicts: string[];
  availableSlots: number[];
  occupiedSlots: number[];
}

/**
 * Validates payout slot assignments for a committee
 * Checks for duplicate slots and ensures slots are within valid range
 */
export function validatePayoutSlots(
  committee: Committee,
  existingPayouts: Payout[]
): PayoutSlotValidation {
  const validation: PayoutSlotValidation = {
    isValid: true,
    conflicts: [],
    availableSlots: [],
    occupiedSlots: []
  };

  if (!committee.payoutSlots) {
    committee.payoutSlots = [];
  }

  // Get all occupied slots from existing payouts
  const occupiedSlots = new Set<number>();
  const userSlotMap = new Map<string, number>();

  existingPayouts.forEach(payout => {
    if (payout.slotNumber) {
      occupiedSlots.add(payout.slotNumber);
      userSlotMap.set(payout.userId, payout.slotNumber);
    }
  });

  validation.occupiedSlots = Array.from(occupiedSlots).sort((a, b) => a - b);

  // Check for duplicate slot assignments
  const slotCounts = new Map<number, string[]>();
  existingPayouts.forEach(payout => {
    if (payout.slotNumber) {
      if (!slotCounts.has(payout.slotNumber)) {
        slotCounts.set(payout.slotNumber, []);
      }
      slotCounts.get(payout.slotNumber)!.push(payout.userId);
    }
  });

  // Generate conflicts for duplicate slots
  slotCounts.forEach((userIds, slotNumber) => {
    if (userIds.length > 1) {
      validation.isValid = false;
      validation.conflicts.push(
        `Slot ${slotNumber} is assigned to multiple users: ${userIds.join(', ')}`
      );
    }
  });

  // Calculate available slots
  const maxSlots = committee.duration;
  for (let i = 1; i <= maxSlots; i++) {
    if (!occupiedSlots.has(i)) {
      validation.availableSlots.push(i);
    }
  }

  return validation;
}

/**
 * Checks if a specific slot is available for a user
 */
export function isSlotAvailable(
  committee: Committee,
  existingPayouts: Payout[],
  slotNumber: number,
  userId?: string
): { available: boolean; reason?: string } {
  if (!committee.payoutSlots) {
    committee.payoutSlots = [];
  }

  if (slotNumber < 1 || slotNumber > committee.duration) {
    return { available: false, reason: `Slot must be between 1 and ${committee.duration}` };
  }

  const existingPayout = existingPayouts.find(
    payout => payout.slotNumber === slotNumber
  );

  if (existingPayout) {
    if (userId && existingPayout.userId === userId) {
      return { available: true }; // User can keep their existing slot
    }
    return { 
      available: false, 
      reason: `Slot ${slotNumber} is already assigned to another user` 
    };
  }

  return { available: true };
}

/**
 * Gets the next available slot for a new payout
 */
export function getNextAvailableSlot(
  committee: Committee,
  existingPayouts: Payout[]
): number {
  const validation = validatePayoutSlots(committee, existingPayouts);
  
  if (validation.availableSlots.length > 0) {
    return validation.availableSlots[0];
  }

  // If all slots are occupied, return the next logical slot
  return committee.payoutSlots?.length + 1 || 1;
}

/**
 * Validates a user's preferred slot during join request
 */
export function validatePreferredSlot(
  committee: Committee,
  existingPayouts: Payout[],
  preferredSlot: number,
  userId: string
): { valid: boolean; reason?: string; suggestedSlot?: number } {
  const slotCheck = isSlotAvailable(committee, existingPayouts, preferredSlot, userId);
  
  if (slotCheck.available) {
    return { valid: true };
  }

  const nextSlot = getNextAvailableSlot(committee, existingPayouts);
  
  return {
    valid: false,
    reason: slotCheck.reason,
    suggestedSlot: nextSlot
  };
}

/**
 * Generates a summary of slot usage for a committee
 */
export function getSlotSummary(
  committee: Committee,
  existingPayouts: Payout[]
): {
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  percentageOccupied: number;
} {
  const validation = validatePayoutSlots(committee, existingPayouts);
  
  return {
    totalSlots: committee.duration,
    occupiedSlots: validation.occupiedSlots.length,
    availableSlots: validation.availableSlots.length,
    percentageOccupied: (validation.occupiedSlots.length / committee.duration) * 100
  };
}