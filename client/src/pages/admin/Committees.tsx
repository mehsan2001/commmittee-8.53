import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Users, UserCheck, Calendar, Mail } from "lucide-react";
import { getAllCommittees, createCommittee, updateCommittee, getCommitteeMembers } from "@/services/firestore";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Committee, InsertCommittee, CommitteeWithActualMembersCount } from "@shared/schema";
import { calculateEarlyPayoutFee } from "../../utils/feeCalculations";

export default function Committees() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [selectedCommitteeForMembers, setSelectedCommitteeForMembers] = useState<Committee | null>(null);
  const [editStatus, setEditStatus] = useState("");

  const { data: committees = [], isLoading } = useQuery<CommitteeWithActualMembersCount[]>({
    queryKey: ["/api/committees"],
    queryFn: getAllCommittees,
  });

  const { data: committeeMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["/api/committees", selectedCommitteeForMembers?.id, "members"],
    queryFn: () => selectedCommitteeForMembers ? getCommitteeMembers(selectedCommitteeForMembers.id) : Promise.resolve([]),
    enabled: !!selectedCommitteeForMembers && isMembersModalOpen,
  });

  const createCommitteeMutation = useMutation({
    mutationFn: createCommittee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
      setIsCreateModalOpen(false);
      toast({
        title: "Committee Created",
        description: "New committee has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create committee",
        variant: "destructive",
      });
    },
  });

  const updateCommitteeMutation = useMutation({
    mutationFn: ({ committeeId, status }: { committeeId: string; status: string }) =>
      updateCommittee(committeeId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
      setIsEditModalOpen(false);
      setSelectedCommittee(null);
      toast({
        title: "Status Updated",
        description: "Committee status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update committee status",
        variant: "destructive",
      });
    },
  });

  const filteredCommittees = committees.filter(committee => {
    const matchesSearch = committee.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || committee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [formValues, setFormValues] = useState({
    name: "",
    amount: "",
    memberCount: "",
    months: "",
    startDate: "",
  });

  const calculatedFees = useMemo(() => {
    const memberCount = parseInt(formValues.memberCount);
    const months = parseInt(formValues.months);
    if (isNaN(memberCount) || isNaN(months) || memberCount < 5 || memberCount > 100 || months < 1) {
      return {};
    }
    const fees: { [key: string]: number } = {};
    for (let i = 1; i <= memberCount; i++) {
      const fee = calculateEarlyPayoutFee(months, i);
      if (fee > 0) {
        fees[i.toString()] = fee;
      }
    }
    return fees;
  }, [formValues.memberCount, formValues.months]);

  const handleCreateCommittee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const memberCount = Number(formData.get("memberCount"));
    const months = Number(formData.get("months"));

    const payoutSlotFees: { [key: string]: number } = {};
    for (let i = 1; i <= memberCount; i++) {
      const fee = calculateEarlyPayoutFee(months, i);
      if (fee > 0) {
        payoutSlotFees[i.toString()] = fee;
      }
    }

    const committeeData: InsertCommittee = {
      name: formData.get("name") as string,
      amount: Number(formData.get("amount")),
      memberCount: memberCount,
      duration: months,
      startDate: new Date(formData.get("startDate") as string),
      adminId: userData!.id,
      payoutSlotFees: Object.keys(payoutSlotFees).length > 0 ? payoutSlotFees : undefined,
    };

    createCommitteeMutation.mutate(committeeData);
  };

  const handleEditStatus = (committee: Committee) => {
    setSelectedCommittee(committee);
    setEditStatus(committee.status);
    setIsEditModalOpen(true);
  };

  const handleUpdateStatus = () => {
    if (selectedCommittee && editStatus) {
      updateCommitteeMutation.mutate({
        committeeId: selectedCommittee.id,
        status: editStatus,
      });
    }
  };

  const handleViewMembers = (committee: Committee) => {
    setSelectedCommitteeForMembers(committee);
    setIsMembersModalOpen(true);
  };

  const handleCloseMembersModal = () => {
    setIsMembersModalOpen(false);
    setSelectedCommitteeForMembers(null);
    // Refresh the main committees list to ensure data is synchronized
    queryClient.invalidateQueries({ queryKey: ["/api/committees"] });
  };

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

  if (isLoading) {
    return <div>Loading committees...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Committee Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-bg text-black hover:opacity-90" data-testid="button-create-committee">
              <Plus className="mr-2 h-4 w-4" />
              Create Committee
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-secondary border-accent-orange/30">
            <DialogHeader>
              <DialogTitle className="gradient-text">Create New Committee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCommittee} className="space-y-4">
              <div>
                <Label htmlFor="name">Committee Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-committee-name"
                />
              </div>
              {formValues.memberCount && (formValues.memberCount === 5 || formValues.memberCount === 10) && (
                <div className="space-y-2">
                  <Label>Early Payout Fees</Label>
                  <div className="border border-accent-orange/30 p-3 rounded-md bg-primary">
                    {Object.keys(calculatedFees).length > 0 ? (
                      Object.entries(calculatedFees).map(([slot, fee]) => (
                        <p key={slot} className="text-sm text-gray-300">
                          Slot {slot}: {fee * 100}% fee
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-300">No early payout fees for this committee type.</p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="amount">Monthly Amount (Rs)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  required
                  value={formValues.amount}
                  onChange={(e) => setFormValues({ ...formValues, amount: e.target.value })}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-committee-amount"
                />
              </div>
              <div>
                <Label htmlFor="memberCount">Number of Members</Label>
                <Input
                  id="memberCount"
                  name="memberCount"
                  type="number"
                  min="5"
                  max="100"
                  required
                  value={formValues.memberCount}
                  onChange={(e) => setFormValues({ ...formValues, memberCount: e.target.value })}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  placeholder="Enter number of members (5-100)"
                  data-testid="input-member-count"
                />
              </div>
              <div>
                <Label htmlFor="months">Duration (Months)</Label>
                <Input
                  id="months"
                  name="months"
                  type="number"
                  min="1"
                  required
                  value={formValues.months}
                  onChange={(e) => setFormValues({ ...formValues, months: e.target.value })}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  placeholder="Enter duration in months"
                  data-testid="input-months"
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  value={formValues.startDate}
                  onChange={(e) => setFormValues({ ...formValues, startDate: e.target.value })}
                  className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                  data-testid="input-start-date"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-accent-orange/30"
                  onClick={() => setIsCreateModalOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gradient-bg text-black hover:opacity-90"
                  disabled={createCommitteeMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createCommitteeMutation.isPending ? "Creating..." : "Create Committee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Status Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30">
          <DialogHeader>
            <DialogTitle className="gradient-text">Edit Committee Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Committee</Label>
              <p className="text-secondary">{selectedCommittee?.name}</p>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="bg-primary border-accent-orange/30" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-accent-orange/30"
                onClick={() => setIsEditModalOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 gradient-bg text-black hover:opacity-90"
                onClick={handleUpdateStatus}
                disabled={updateCommitteeMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateCommitteeMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search and Filter */}
      <Card className="bg-secondary border-accent-orange/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search committees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-primary border-accent-orange/30 focus:border-accent-cyan"
                data-testid="input-search-committees"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-primary border-accent-orange/30" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/committees"] })}
              variant="outline"
              className="border-accent-orange/30"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Committees Table */}
      <Card className="bg-secondary border-accent-orange/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-accent-orange/10">
                  <TableHead className="text-secondary">Committee</TableHead>
                  <TableHead className="text-secondary">Members</TableHead>
                  <TableHead className="text-secondary">Amount</TableHead>
                  <TableHead className="text-secondary">Status</TableHead>
                  <TableHead className="text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommittees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-secondary" data-testid="text-no-committees">
                      No committees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCommittees.map((committee) => (
                    <TableRow key={committee.id} className="border-accent-orange/10" data-testid={`committee-row-${committee.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{committee.name}</div>
                          <div className="text-secondary text-sm">
                            Started: {committee.startDate.toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="font-medium">{committee.actualMembersCount || 0}/{committee.memberCount}</span>
                          <span className="ml-2 text-secondary">members</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">Rs {committee.amount}</TableCell>
                      <TableCell>{getStatusBadge(committee.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-accent-cyan hover:text-accent-cyan/80"
                            onClick={() => handleViewMembers(committee)}
                            data-testid={`button-view-members-${committee.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-accent-orange hover:text-accent-orange/80"
                            data-testid={`button-edit-${committee.id}`}
                            onClick={() => handleEditStatus(committee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Members Modal */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="bg-secondary border-accent-orange/30 max-w-2xl">
          <DialogHeader className="flex items-center justify-between">
            <DialogTitle className="gradient-text">
              {selectedCommitteeForMembers?.name} - Members
            </DialogTitle>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/committees", selectedCommitteeForMembers?.id, "members"] })}
              variant="outline"
              size="sm"
              className="border-accent-orange/30"
            >
              Refresh
            </Button>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-secondary">Loading members...</div>
              </div>
            ) : committeeMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-secondary mx-auto mb-4" />
                <p className="text-secondary">No members found in this committee</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-primary border-accent-orange/20">
                    <CardContent className="p-4">
                      <div className="text-sm text-secondary">Total Members</div>
                      <div className="text-2xl font-bold text-accent-cyan">
                        {committeeMembers.length} / {selectedCommitteeForMembers?.memberCount}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary border-accent-orange/20">
                    <CardContent className="p-4">
                      <div className="text-sm text-secondary">Available Slots</div>
                      <div className="text-2xl font-bold text-accent-green">
                        {selectedCommitteeForMembers ? selectedCommitteeForMembers.memberCount - committeeMembers.length : 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="border-t border-accent-orange/20 pt-4">
                  <h4 className="font-semibold mb-3">Member Details</h4>
                  <div className="space-y-2">
                    {committeeMembers.map((member) => (
                      <Card key={member.id} className="bg-primary border-accent-orange/10">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center text-black font-bold">
                                {member.fullName.split(" ").map(name => name.charAt(0)).join("").toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{member.fullName}</div>
                                <div className="text-sm text-secondary">@{member.username}</div>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="flex items-center text-sm text-secondary">
                                <Calendar className="h-3 w-3 mr-1" />
                                {member.createdAt.toLocaleDateString()}
                              </div>
                              <Badge className="bg-accent-green/20 text-accent-green text-xs">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            </div>
                          </div>
                          {member.email && (
                            <div className="mt-2 flex items-center text-sm text-secondary">
                              <Mail className="h-3 w-3 mr-1" />
                              {member.email}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button
              variant="outline"
              className="border-accent-orange/30"
              onClick={handleCloseMembersModal}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
