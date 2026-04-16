import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useMyLeaveRequests, useCreateLeaveRequest } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDateFull(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusConfig = {
    pending: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
    approved: { icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    rejected: { icon: <XCircle className="h-3 w-3" />, color: 'bg-destructive text-destructive-foreground' },
};

const TeacherLeaveRequests = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const { data: leaveRequests, isLoading } = useMyLeaveRequests();
    const createLeave = useCreateLeaveRequest();
    const [open, setOpen] = useState(false);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [leaveType, setLeaveType] = useState('casual');

    // Get teacher record via /teachers/me
    const { data: teacher } = useQuery({
        queryKey: ['my-teacher', user?.id],
        queryFn: async () => {
            const { data } = await api.get('/teachers/me');
            return data;
        },
        enabled: !!user,
        retry: false,
    });

    const teacherId = teacher?._id || teacher?.id;

    const handleSubmit = async () => {
        if (!startDate || !endDate || !reason || !teacherId) return;

        try {
            await createLeave.mutateAsync({
                teacherId,
                startDate,
                endDate,
                reason,
                leaveType,
            });
            toast({ title: 'Leave Request Submitted', description: 'Your request has been sent to the admin.' });
            setOpen(false);
            setStartDate('');
            setEndDate('');
            setReason('');
            setLeaveType('casual');
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
        );
    }

    const getId = (r) => r._id || r.id;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">Leave Requests</h2>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> New Request</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1.5 block">Leave Type</label>
                                <Select value={leaveType} onValueChange={setLeaveType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="casual">Casual Leave</SelectItem>
                                        <SelectItem value="sick">Sick Leave</SelectItem>
                                        <SelectItem value="personal">Personal Leave</SelectItem>
                                        <SelectItem value="emergency">Emergency Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1.5 block">Start Date</label>
                                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1.5 block">End Date</label>
                                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1.5 block">Reason</label>
                                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe your reason..." rows={3} />
                            </div>
                            <Button onClick={handleSubmit} className="w-full" disabled={createLeave.isPending || !startDate || !endDate || !reason}>
                                {createLeave.isPending ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {!leaveRequests?.length ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-foreground">No Leave Requests</p>
                        <p className="text-sm text-muted-foreground">You haven't submitted any leave requests.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {leaveRequests.map(request => {
                        const config = statusConfig[request.status] || statusConfig.pending;
                        return (
                            <Card key={getId(request)} className="transition-all hover:shadow-sm">
                                <CardContent className="pt-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge className={config.color}>
                                                    {config.icon}
                                                    <span className="ml-1 capitalize">{request.status}</span>
                                                </Badge>
                                                <Badge variant="outline" className="capitalize">{request.leaveType || request.leave_type}</Badge>
                                            </div>
                                            <p className="text-sm text-foreground font-medium mt-2">{request.reason}</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(request.startDate || request.start_date)} — {formatDateFull(request.endDate || request.end_date)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Applied {formatDate(request.createdAt || request.created_at)}
                                                </span>
                                            </div>
                                            {request.reviewNotes && (
                                                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border italic">
                                                    Admin note: {request.reviewNotes}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TeacherLeaveRequests;
