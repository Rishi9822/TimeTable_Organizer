import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTeacherAssignments, useCreateAssignment, useDeleteAssignment, useSubmissionsForAssignment, useGradeSubmission } from '@/hooks/useAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Plus, Trash2, Loader2, Clock, AlertCircle, Users, Eye } from 'lucide-react';

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function isOverdue(dateStr) {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const now = new Date();
    // overdue if due date is in the past AND not today
    return due < now && due.toDateString() !== now.toDateString();
}

const TeacherAssignments = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [viewAssignment, setViewAssignment] = useState(null);

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
    const { data: assignments, isLoading } = useTeacherAssignments(teacherId);
    const createAssignment = useCreateAssignment();
    const deleteAssignment = useDeleteAssignment();

    const { data: classAssignments } = useQuery({
        queryKey: ['teacher-class-assignments', teacherId],
        queryFn: async () => {
            const { data } = await api.get('/teacher-class-assignments');
            return data || [];
        },
        enabled: !!teacherId,
    });

    const { data: classes } = useQuery({
        queryKey: ['classes-lookup'],
        queryFn: async () => { const { data } = await api.get('/classes'); return data || []; },
    });
    const { data: subjects } = useQuery({
        queryKey: ['subjects-lookup'],
        queryFn: async () => { const { data } = await api.get('/subjects'); return data || []; },
    });

    const getId = (item) => item?._id || item?.id;
    const getName = (list, id) => {
        if (!list || !id) return '—';
        return list.find(i => getId(i) === id)?.name || '—';
    };

    const [form, setForm] = useState({ classId: '', subjectId: '', title: '', description: '', dueDate: '', maxMarks: '' });

    const handleSubmit = async () => {
        if (!form.classId || !form.subjectId || !form.title || !form.dueDate || !teacherId) {
            toast({ title: 'Error', description: 'Fill all required fields', variant: 'destructive' });
            return;
        }
        try {
            await createAssignment.mutateAsync({
                classId: form.classId, subjectId: form.subjectId, teacherId,
                title: form.title, description: form.description || undefined,
                dueDate: form.dueDate, maxMarks: form.maxMarks ? parseInt(form.maxMarks) : undefined,
            });
            toast({ title: 'Assignment created' });
            setOpen(false);
            setForm({ classId: '', subjectId: '', title: '', description: '', dueDate: '', maxMarks: '' });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    const uniqueClassIds = [...new Set(classAssignments?.map(ca => ca.class_id || ca.classId) || [])];
    const getSubjectsForClass = (classId) => classAssignments?.filter(ca => (ca.class_id || ca.classId) === classId).map(ca => ca.subject_id || ca.subjectId) || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Assignments</h3>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Assignment</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Class *</Label>
                                    <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v, subjectId: '' }))}>
                                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                        <SelectContent>{uniqueClassIds.map(id => <SelectItem key={id} value={id}>{getName(classes, id)}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Subject *</Label>
                                    <Select value={form.subjectId} onValueChange={v => setForm(f => ({ ...f, subjectId: v }))} disabled={!form.classId}>
                                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                                        <SelectContent>{getSubjectsForClass(form.classId).map(id => <SelectItem key={id} value={id}>{getName(subjects, id)}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Title *</Label>
                                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Assignment title" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Description</Label>
                                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions..." />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Due Date *</Label>
                                    <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Max Marks</Label>
                                    <Input type="number" value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <Button onClick={handleSubmit} disabled={createAssignment.isPending} className="w-full">
                                {createAssignment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                                Create Assignment
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : assignments?.length ? (
                <div className="space-y-3">
                    {assignments.map(a => (
                        <AssignmentCardWithStats
                            key={getId(a)}
                            assignment={a}
                            classes={classes}
                            subjects={subjects}
                            getName={getName}
                            onDelete={() => deleteAssignment.mutate(getId(a))}
                            onView={() => setViewAssignment(getId(a))}
                        />
                    ))}
                </div>
            ) : (
                <Card><CardContent className="flex flex-col items-center py-8"><p className="text-sm text-muted-foreground">No assignments created yet.</p></CardContent></Card>
            )}

            {viewAssignment && (
                <SubmissionDetailsDialog
                    assignmentId={viewAssignment}
                    assignment={assignments?.find(a => getId(a) === viewAssignment)}
                    onClose={() => setViewAssignment(null)}
                />
            )}
        </div>
    );
};

// Assignment card with inline completion stats
const AssignmentCardWithStats = ({ assignment: a, classes, subjects, getName, onDelete, onView }) => {
    const aId = a._id || a.id;
    const { data: submissions } = useSubmissionsForAssignment(aId);
    const { data: students } = useQuery({
        queryKey: ['students-in-class', a.classId || a.class_id],
        queryFn: async () => {
            const classId = a.classId || a.class_id;
            const { data } = await api.get(`/students?classId=${classId}`);
            return data || [];
        },
        enabled: !!(a.classId || a.class_id),
    });

    const getId = (item) => item?._id || item?.id;
    const totalStudents = students?.length || 0;
    const submittedCount = submissions?.length || 0;
    const gradedCount = submissions?.filter(s => s.status === 'graded').length || 0;
    const completionRate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
    const overdue = isOverdue(a.dueDate || a.due_date);

    return (
        <Card className={overdue ? 'border-destructive/30' : ''}>
            <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground">{a.title}</span>
                            <Badge variant="outline">{getName(classes, a.classId || a.class_id)}</Badge>
                            <Badge variant="secondary">{getName(subjects, a.subjectId || a.subject_id)}</Badge>
                            {(a.maxMarks || a.max_marks) && <Badge variant="outline">{a.maxMarks || a.max_marks} marks</Badge>}
                        </div>
                        {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {overdue ? <AlertCircle className="h-3 w-3 text-destructive" /> : <Clock className="h-3 w-3" />}
                            <span className={overdue ? 'text-destructive font-medium' : ''}>
                                Due {formatDate(a.dueDate || a.due_date)}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {submittedCount}/{totalStudents} submitted
                                    {gradedCount > 0 && <span className="text-primary">• {gradedCount} graded</span>}
                                </span>
                                <span className="font-medium">{completionRate}%</span>
                            </div>
                            <Progress value={completionRate} className="h-1.5" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" onClick={onView} title="View submissions">
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Submission details dialog
const SubmissionDetailsDialog = ({ assignmentId, assignment, onClose }) => {
    const { toast } = useToast();
    const { data: submissions, isLoading } = useSubmissionsForAssignment(assignmentId);
    const gradeMutation = useGradeSubmission();
    const [gradeInputs, setGradeInputs] = useState({});

    const getId = (item) => item?._id || item?.id;

    const { data: students } = useQuery({
        queryKey: ['students-in-class-details', assignment?.classId || assignment?.class_id],
        queryFn: async () => {
            const classId = assignment?.classId || assignment?.class_id;
            const { data } = await api.get(`/students?classId=${classId}`);
            return data || [];
        },
        enabled: !!(assignment?.classId || assignment?.class_id),
    });

    const getStudentName = (studentId) => students?.find(s => getId(s) === studentId)?.name || 'Unknown';
    const getStudentRoll = (studentId) => {
        const s = students?.find(s => getId(s) === studentId);
        return s?.rollNumber || s?.roll_number || '—';
    };

    const handleGrade = async (submissionId) => {
        const grade = parseInt(gradeInputs[submissionId]);
        if (isNaN(grade) || grade < 0) {
            toast({ title: 'Invalid grade', variant: 'destructive' });
            return;
        }
        try {
            await gradeMutation.mutateAsync({ submissionId, grade });
            toast({ title: 'Grade saved' });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    const submittedStudentIds = new Set(submissions?.map(s => s.studentId || s.student_id) || []);
    const unsubmitted = students?.filter(s => !submittedStudentIds.has(getId(s))) || [];

    return (
        <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{assignment?.title} — Submissions</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex gap-4 text-sm">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
                                {submissions?.length || 0} Submitted
                            </Badge>
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                                {unsubmitted.length} Not Submitted
                            </Badge>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                {submissions?.filter(s => s.status === 'graded').length || 0} Graded
                            </Badge>
                        </div>

                        {submissions && submissions.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2 text-foreground">Submitted</p>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Roll</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Remarks</TableHead>
                                            <TableHead>Grade</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map(sub => {
                                            const subId = getId(sub);
                                            const studentId = sub.studentId || sub.student_id;
                                            return (
                                                <TableRow key={subId}>
                                                    <TableCell className="text-xs">{getStudentRoll(studentId)}</TableCell>
                                                    <TableCell className="text-sm font-medium">{getStudentName(studentId)}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(sub.submittedAt || sub.submitted_at)}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{sub.remarks || '—'}</TableCell>
                                                    <TableCell>
                                                        {sub.status === 'graded' ? (
                                                            <Badge className="bg-primary/10 text-primary border-primary/20">{sub.grade}{(assignment?.maxMarks || assignment?.max_marks) ? `/${assignment.maxMarks || assignment.max_marks}` : ''}</Badge>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    className="w-16 h-7 text-xs"
                                                                    placeholder="0"
                                                                    value={gradeInputs[subId] || ''}
                                                                    onChange={e => setGradeInputs(prev => ({ ...prev, [subId]: e.target.value }))}
                                                                    min={0}
                                                                    max={(assignment?.maxMarks || assignment?.max_marks) || undefined}
                                                                />
                                                                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleGrade(subId)} disabled={gradeMutation.isPending}>
                                                                    Grade
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={sub.status === 'graded' ? 'text-primary' : 'text-green-600'}>
                                                            {sub.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {unsubmitted.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2 text-muted-foreground">Not Submitted</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {unsubmitted.map(s => (
                                        <div key={getId(s)} className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-md bg-muted/30">
                                            <AlertCircle className="h-3 w-3 text-destructive" />
                                            <span>{(s.rollNumber || s.roll_number) && `${s.rollNumber || s.roll_number} — `}{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default TeacherAssignments;
