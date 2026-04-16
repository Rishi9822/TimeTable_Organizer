import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAssignmentsByClass, useMySubmissions, useSubmitAssignment } from '@/hooks/useAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function isOverdue(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const now = new Date();
    return due < now && due.toDateString() !== now.toDateString();
}
function daysUntil(dateStr) {
    if (!dateStr) return 0;
    const due = new Date(dateStr);
    const now = new Date();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

const StudentAssignments = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [submitDialog, setSubmitDialog] = useState(null);
    const [remarks, setRemarks] = useState('');

    const { data: student } = useQuery({
        queryKey: ['my-student', user?.id],
        queryFn: async () => {
            const { data } = await api.get('/students/me');
            return data;
        },
        enabled: !!user,
        retry: false,
    });

    const getId = (item) => item?._id || item?.id;
    const classId = student?.classId || student?.class_id;
    const studentId = getId(student);

    const { data: assignments, isLoading } = useAssignmentsByClass(classId);
    const { data: submissions } = useMySubmissions(studentId);
    const submitMutation = useSubmitAssignment();

    const { data: subjects } = useQuery({
        queryKey: ['subjects-lookup'],
        queryFn: async () => { const { data } = await api.get('/subjects'); return data || []; },
    });
    const { data: teachers } = useQuery({
        queryKey: ['teachers-lookup-student'],
        queryFn: async () => { const { data } = await api.get('/teachers'); return data || []; },
        retry: false,
    });

    const getName = (list, id) => {
        if (!list || !id) return '—';
        return list.find(i => getId(i) === id)?.name || '—';
    };
    const getSubmission = (assignmentId) => submissions?.find(s => (s.assignmentId || s.assignment_id) === assignmentId);

    const handleSubmit = async (assignmentId) => {
        if (!student) return;
        try {
            await submitMutation.mutateAsync({ assignmentId, studentId, remarks: remarks || undefined });
            toast({ title: 'Assignment submitted!' });
            setSubmitDialog(null);
            setRemarks('');
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    }

    const upcoming = assignments?.filter(a => {
        const due = a.dueDate || a.due_date;
        return !isOverdue(due);
    }) || [];

    const past = assignments?.filter(a => {
        const due = a.dueDate || a.due_date;
        return isOverdue(due);
    }) || [];

    const renderCard = (a, showSubmitButton) => {
        const aId = getId(a);
        const sub = getSubmission(aId);
        const dueDate = a.dueDate || a.due_date;
        const dl = daysUntil(dueDate);
        const urgent = dl <= 2 && !sub;
        const overdue = isOverdue(dueDate);
        const maxMarks = a.maxMarks || a.max_marks;
        const subjectId = a.subjectId || a.subject_id;
        const teacherIdField = a.teacherId || a.teacher_id;

        return (
            <Card key={aId} className={sub ? 'border-green-300/30' : urgent ? 'border-amber-400/40' : overdue ? 'border-destructive/30 opacity-70' : ''}>
                <CardContent className="pt-4 pb-4">
                    <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-foreground">{a.title}</span>
                                    <Badge variant="secondary">{getName(subjects, subjectId)}</Badge>
                                    {maxMarks && <Badge variant="outline">{maxMarks} marks</Badge>}
                                    {sub && (
                                        <Badge className={sub.status === 'graded' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300'}>
                                            {sub.status === 'graded' ? `Graded: ${sub.grade}/${maxMarks || '—'}` : '✓ Submitted'}
                                        </Badge>
                                    )}
                                </div>
                                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">By {typeof teacherIdField === 'object' ? teacherIdField?.name : getName(teachers, teacherIdField)}</span>
                                    <div className="flex items-center gap-1 text-xs">
                                        {overdue && !sub ? <AlertCircle className="h-3 w-3 text-destructive" /> : urgent ? <AlertCircle className="h-3 w-3 text-amber-500" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                                        <span className={overdue && !sub ? 'text-destructive font-medium' : urgent ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                            Due {formatDate(dueDate)}
                                            {!overdue && ` (${dl === 0 ? 'Today' : `${dl}d left`})`}
                                        </span>
                                    </div>
                                </div>
                                {sub && sub.remarks && (
                                    <p className="text-xs text-muted-foreground italic">Your note: {sub.remarks}</p>
                                )}
                            </div>
                            {showSubmitButton && !sub && (
                                <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setSubmitDialog(aId); setRemarks(''); }}>
                                    <Send className="h-3 w-3 mr-1" /> Submit
                                </Button>
                            )}
                            {sub && sub.status === 'submitted' && showSubmitButton && (
                                <Button size="sm" variant="ghost" className="shrink-0 text-muted-foreground" onClick={() => { setSubmitDialog(aId); setRemarks(sub.remarks || ''); }}>
                                    Resubmit
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Assignments</h3>
                {upcoming.filter(a => !getSubmission(getId(a))).length > 0 && (
                    <Badge variant="destructive">{upcoming.filter(a => !getSubmission(getId(a))).length} pending</Badge>
                )}
                {submissions?.length ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">{submissions.length} submitted</Badge>
                ) : null}
            </div>

            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Upcoming</p>
                    {upcoming.map(a => renderCard(a, true))}
                </div>
            )}

            {past.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Past Due</p>
                    {past.slice(0, 10).map(a => renderCard(a, false))}
                </div>
            )}

            {!assignments?.length && (
                <Card><CardContent className="flex flex-col items-center py-8">
                    <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No assignments yet.</p>
                </CardContent></Card>
            )}

            {/* Submit Dialog */}
            <Dialog open={!!submitDialog} onOpenChange={open => { if (!open) setSubmitDialog(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Submit Assignment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {assignments?.find(a => getId(a) === submitDialog)?.title}
                        </p>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Notes (optional)</label>
                            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any remarks for your teacher..." rows={3} />
                        </div>
                        <Button
                            onClick={() => submitDialog && handleSubmit(submitDialog)}
                            disabled={submitMutation.isPending}
                            className="w-full"
                        >
                            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                            Confirm Submission
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StudentAssignments;
