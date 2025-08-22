import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Committee } from "@shared/schema";
import { formatCurrency, calculateEarlyPayoutFee, getFeeDetails } from "@/utils/feeCalculations";
import { validatePreferredSlot } from "@/utils/payoutValidation";

interface JoinRequestDialogProps {
  committee: Committee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (committeeId: string, preferredSlot: number) => void;
  isLoading?: boolean;
}

export function JoinRequestDialog({
  committee,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: JoinRequestDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  if (!committee) return null;

  const takenSlots = committee.payoutSlots?.map(slot => slot.slotNumber) || [];

  const availableSlots = Array.from({ length: committee.memberCount }, (_, i) => i + 1)
    .filter(slotNumber => !takenSlots.includes(slotNumber))
    .map(slotNumber => ({
      slotNumber,
      feeDetails: getFeeDetails(committee.duration, slotNumber),
    }));

  const handleSubmit = () => {
    if (selectedSlot && committee) {
      onSubmit(committee.id, selectedSlot);
      setSelectedSlot(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-accent-orange/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="gradient-text">Request to Join Committee</DialogTitle>
          <DialogDescription>
            Select your preferred payout slot for this committee. Early slots may have fees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-lg mb-2">{committee.name}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-secondary">Monthly:</span>
                <span className="ml-1 font-medium">Rs {committee.amount}</span>
              </div>
              <div>
                <span className="text-secondary">Duration:</span>
                <span className="ml-1 font-medium">{committee.duration} months</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="payout-slot">Select Payout Slot</Label>
            <Select
              value={selectedSlot?.toString() || ""}
              onValueChange={(value) => setSelectedSlot(parseInt(value))}
            >
              <SelectTrigger className="bg-primary border-accent-orange/30">
                <SelectValue placeholder="Choose your payout slot" />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.slotNumber} value={slot.slotNumber.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>Slot {slot.slotNumber}</span>
                      {slot.feeDetails && (
                        <Badge variant="outline" className="ml-2">
                          {slot.feeDetails.percentage * 100}% fee
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSlot && (
            <Card className="bg-primary/50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Original Amount:</span>
                  <span>{formatCurrency(committee.amount * committee.duration)}</span>
                </div>
                {selectedSlot && committee.payoutSlotFees && committee.payoutSlotFees[selectedSlot.toString()] && (
                  <>
                    <div className="flex justify-between">
                      <span>Fee ({committee.payoutSlotFees[selectedSlot.toString()] * 100}%):</span>
                      <span className="text-accent-orange">
                        -{formatCurrency((committee.amount * committee.duration * committee.payoutSlotFees[selectedSlot.toString()]))}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Net Amount:</span>
                      <span>
                        {formatCurrency(
                          ((committee.amount * committee.duration) -
                          (committee.amount * committee.duration * committee.payoutSlotFees[selectedSlot.toString()]))
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSlot(null);
                onOpenChange(false);
              }}
              className="flex-1 border-accent-orange/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedSlot || isLoading}
              className="flex-1 gradient-bg text-primary hover:opacity-90"
            >
              {isLoading ? "Sending Request..." : "Send Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}