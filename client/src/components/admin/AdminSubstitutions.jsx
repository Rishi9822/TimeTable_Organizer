import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSubstitutions, useCreateSubstitution } from '@/hooks/useSubstitutions';
import { useAllLeaveRequests } from '@/hooks/useLeaveRequests';
import { useTeachers, useClasses, useSubjects } from '@/hooks/useTeachers';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Plus, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function shortDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function todayStr() {
    return new Date().toISOString().split('T')[0];
}

const AdminSubstitutions = () => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
        originalTeacherId: '',
        substituteTeacherId: '',
        classId: '',
        subjectId: '',
        date: todayStr(),
        periodNumber: 1,
        leaveRequestId: null,
        notes: '',
    });

    const { data: substitutions, isLoading } = useSubstitutions();
    const createSub = useCreateSubstitution();
    const { data: leaveRequests } = useAllLeaveRequests();
    const { data: teachers } = useTeachers();
    const { data: classes } = useClasses();
    const { data: subjects } = useSubjects();

    const getId = (item) => item?._id || item?.id;
    const getName = (list, id) => {
        if (!list || !id) return '—';
        const item = list.find(i => getId(i) === id);
        return item?.name || '—';
    };
    const getPopulatedName = (field) => {
        if (!field) return '—';
        if (typeof field === 'object') return field.name || '—';
        return getName(teachers, field) || '—';
    };

    const approvedLeaves = leaveRequests?.filter(l => l.status === 'approved') || [];

    const handleSubmit = async () => {
        if (!form.originalTeacherId || !form.substituteTeacherId || !form.classId || !form.subjectId) {
            toast({ title: 'Error', description: 'Fill all required fields', variant: 'destructive' });
            return;
        }
        try {
            await createSub.mutateAsync({
                originalTeacherId: form.originalTeacherId,
                substituteTeacherId: form.substituteTeacherId,
                classId: form.classId,
                subjectId: form.subjectId,
                date: form.date,
                periodNumber: form.periodNumber,
                leaveRequestId: form.leaveRequestId,
                notes: form.notes || null,
            });
            toast({ title: 'Substitution assigned' });
            setOpen(false);
            setForm(f => ({ ...f, originalTeacherId: '', substituteTeacherId: '', notes: '' }));
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Substitution Management</h3>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Assign Substitute</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Assign Substitute Teacher</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                            {approvedLeaves.length > 0 && (
                                <div className="space-y-1.5">
                                    <Label>Link to Leave Request (optional)</Label>
                                    <Select value={form.leaveRequestId || ''} onValueChange={v => {
                                        const lr = approvedLeaves.find(l => getId(l) === v);
                                        setForm(f => ({
                                            ...f,
                                            leaveRequestId: v,
                                            originalTeacherId: (lr?.teacherId && typeof lr.teacherId === 'object' ? lr.teacherId._id : lr?.teacherId) || f.originalTeacherId,
                                            date: lr?.startDate ? new Date(lr.startDate).toISOString().split('T')[0] : f.date,
                                        }));
                                    }}>
                                        <SelectTrigger><SelectValue placeholder="Select leave request" /></SelectTrigger>
                                        <SelectContent>
                                            {approvedLeaves.map(lr => (
                                                <SelectItem key={getId(lr)} value={getId(lr)}>
                                                    {getPopulatedName(lr.teacherId)} • {shortDate(lr.startDate || lr.start_date)} – {shortDate(lr.endDate || lr.end_date)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Original Teacher *</Label>
                                    <Select value={form.originalTeacherId} onValueChange={v => setForm(f => ({ ...f, originalTeacherId: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{teachers?.map(t => <SelectItem key={getId(t)} value={getId(t)}>{t.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Substitute Teacher *</Label>
                                    <Select value={form.substituteTeacherId} onValueChange={v => setForm(f => ({ ...f, substituteTeacherId: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{teachers?.filter(t => getId(t) !== form.originalTeacherId).map(t => <SelectItem key={getId(t)} value={getId(t)}>{t.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Class *</Label>
                                    <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{classes?.map(c => <SelectItem key={getId(c)} value={getId(c)}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Subject *</Label>
                                    <Select value={form.subjectId} onValueChange={v => setForm(f => ({ ...f, subjectId: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>{subjects?.map(s => <SelectItem key={getId(s)} value={getId(s)}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Date *</Label>
                                    <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Period *</Label>
                                    <Input type="number" min={1} max={12} value={form.periodNumber} onChange={e => setForm(f => ({ ...f, periodNumber: parseInt(e.target.value) || 1 }))} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Notes</Label>
                                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
                            </div>
                            <Button onClick={handleSubmit} disabled={createSub.isPending} className="w-full">
                                {createSub.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                Assign Substitute
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Original</TableHead>
                            <TableHead>Substitute</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : substitutions?.length ? substitutions.map(sub => (
                            <TableRow key={getId(sub)}>
                                <TableCell className="text-sm">{formatDate(sub.date)}</TableCell>
                                <TableCell className="text-sm">P{sub.periodNumber || sub.period_number}</TableCell>
                                <TableCell className="text-sm">{getPopulatedName(sub.classId || sub.class_id)}</TableCell>
                                <TableCell className="text-sm">{getPopulatedName(sub.subjectId || sub.subject_id)}</TableCell>
                                <TableCell className="text-sm">{getPopulatedName(sub.originalTeacherId || sub.original_teacher_id)}</TableCell>
                                <TableCell className="text-sm font-medium">{getPopulatedName(sub.substituteTeacherId || sub.substitute_teacher_id)}</TableCell>
                                <TableCell><Badge variant="outline" className="capitalize">{sub.status}</Badge></TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No substitutions assigned yet.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default AdminSubstitutions;
