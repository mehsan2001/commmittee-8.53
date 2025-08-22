export function calculateEarlyPayoutFee(committeeDuration: number, payoutSlot: number): number {
  let feePercentage = 0;

  if (committeeDuration === 5) {
    if (payoutSlot === 1 || payoutSlot === 2) {
      feePercentage = 0.10; // 10% fee for 1st and 2nd slots in 5-month committees
    }
  } else if (committeeDuration === 10) {
    if (payoutSlot === 1 || payoutSlot === 2) {
      feePercentage = 0.10; // 10% fee for 1st and 2nd slots in 10-month committees
    } else if (payoutSlot === 3 || payoutSlot === 4) {
      feePercentage = 0.075; // 7.5% fee for 3rd and 4th slots in 10-month committees
    }
  }
  return feePercentage;
}

export function getFeeDetails(committeeDuration: number, payoutSlot: number): { percentage: number; reason: string } | null {
  const percentage = calculateEarlyPayoutFee(committeeDuration, payoutSlot);
  if (percentage > 0) {
    return {
      percentage,
      reason: `Early payout fee for slot ${payoutSlot} in a ${committeeDuration}-month committee.`
    };
  }
  return null;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateCommitteeFee(totalAmount: number, duration: number): number {
  const feeRate = duration <= 5 ? 0.01 : 0.02; // 1% for 5 months, 2% for 10 months
  return totalAmount * feeRate;
}

export function calculateMonthlyContribution(totalAmount: number, duration: number, slot: number): number {
  const baseAmount = totalAmount / duration;
  const earlyPayoutFee = calculateEarlyPayoutFee(duration, slot);
  const committeeFee = calculateCommitteeFee(totalAmount, duration);
  
  return baseAmount + (totalAmount * earlyPayoutFee) + committeeFee;
}

export function getTotalPayableAmount(totalAmount: number, duration: number, slot: number): number {
  const monthlyContribution = calculateMonthlyContribution(totalAmount, duration, slot);
  return monthlyContribution * duration;
}
