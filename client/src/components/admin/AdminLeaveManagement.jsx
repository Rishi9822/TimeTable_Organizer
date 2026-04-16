import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAllLeaveRequests, useReviewLeaveRequest } from '@/hooks/useLeaveRequests';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDateFull(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusConfig = {
    pending: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-warning text-warning-foreground' },
    approved: { icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    rejected: { icon: <XCircle className="h-3 w-3" />, color: 'bg-destructive text-destructive-foreground' },
};

const AdminLeaveManagement = () => {
    const { toast } = useToast();
    const { data: leaveRequests, isLoading } = useAllLeaveRequests();
    const reviewLeave = useReviewLeaveRequest();

    // Teacher name from populated data
    const getTeacherName = (request) => {
        if (request.teacherId && typeof request.teacherId === 'object') return request.teacherId.name;
        return request.teacherName || 'Unknown';
    };

    const handleReview = async (id, status) => {
        try {
            await reviewLeave.mutateAsync({ id, status });
            toast({ title: `Leave ${status}`, description: `Request has been ${status}.` });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    if (isLoading) {
        return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;
    }

    const getId = (r) => r._id || r.id;
    const pendingRequests = leaveRequests?.filter(r => r.status === 'pending') || [];
    const otherRequests = leaveRequests?.filter(r => r.status !== 'pending') || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Leave Management</h3>
                {pendingRequests.length > 0 && (
                    <Badge className="bg-warning text-warning-foreground">{pendingRequests.length} pending</Badge>
                )}
            </div>

            {pendingRequests.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Pending Approval</p>
                    {pendingRequests.map(request => (
                        <Card key={getId(request)} className="border-warning/30">
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground text-sm">{getTeacherName(request)}</span>
                                            <Badge variant="outline" className="capitalize text-xs">{request.leaveType || request.leave_type}</Badge>
                                        </div>
                                        <p className="text-xs text-foreground">{request.reason}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(request.startDate || request.start_date)} — {formatDateFull(request.endDate || request.end_date)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm" variant="outline"
                                            className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                                            onClick={() => handleReview(getId(request), 'approved')}
                                            disabled={reviewLeave.isPending}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                        </Button>
                                        <Button
                                            size="sm" variant="outline"
                                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                            onClick={() => handleReview(getId(request), 'rejected')}
                                            disabled={reviewLeave.isPending}
                                        >
                                            <XCircle className="h-4 w-4 mr-1" /> Reject
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {otherRequests.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">History</p>
                    {otherRequests.slice(0, 10).map(request => {
                        const config = statusConfig[request.status] || statusConfig.pending;
                        return (
                            <Card key={getId(request)}>
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground">{getTeacherName(request)}</span>
                                                <Badge className={config.color}>
                                                    {config.icon}
                                                    <span className="ml-1 capitalize">{request.status}</span>
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(request.startDate || request.start_date)} — {formatDate(request.endDate || request.end_date)} • {request.leaveType || request.leave_type}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {!leaveRequests?.length && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">No leave requests yet.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AdminLeaveManagement;
