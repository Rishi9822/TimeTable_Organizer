import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Check, X, Clock, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudents } from '@/hooks/useStudents';
import { useMarkAttendance } from '@/hooks/useAttendance';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const TeacherAttendanceMarker = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState('1');
    const [studentStatuses, setStudentStatuses] = useState({});

    const markAttendance = useMarkAttendance();

    // Get teacher profile
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

    const { data: assignments, isLoading: assignmentsLoading } = useQuery({
        queryKey: ['my-class-assignments', teacherId],
        queryFn: async () => {
            const { data } = await api.get('/teacher-class-assignments');
            return data || [];
        },
        enabled: !!teacherId,
    });

    const { data: students, isLoading: studentsLoading } = useStudents(selectedClassId);

    // Initialize all students as present when students load
    React.useEffect(() => {
        if (students && students.length > 0) {
            const initial = {};
            students.forEach(s => { initial[s._id || s.id] = 'present'; });
            setStudentStatuses(initial);
        }
    }, [students]);

    const handleStatusToggle = (studentId) => {
        setStudentStatuses(prev => {
            const current = prev[studentId] || 'present';
            const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
            return { ...prev, [studentId]: next };
        });
    };

    const handleSubmit = async () => {
        if (!selectedClassId || !students?.length) return;

        const records = students.map(s => ({
            studentId: s._id || s.id,
            status: studentStatuses[s._id || s.id] || 'present'
        }));

        const selectedAssignment = assignments?.find((a) => {
            const clsId = a.classes?.id || a.classes?._id || a.class_id || a.classId;
            return clsId === selectedClassId;
        });

        try {
            await markAttendance.mutateAsync({
                classId: selectedClassId,
                date: selectedDate,
                period: parseInt(period),
                subjectId: selectedAssignment?.subjects?.id || selectedAssignment?.subjects?._id || selectedAssignment?.subject_id || selectedAssignment?.subjectId,
                records
            });
            toast({ title: 'Attendance Marked', description: `Saved for ${records.length} students.` });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    if (!teacher) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground">No Teacher Profile</p>
                    <p className="text-sm text-muted-foreground">Contact your admin to link your account.</p>
                </CardContent>
            </Card>
        );
    }

    const presentCount = Object.values(studentStatuses).filter(s => s === 'present').length;
    const absentCount = Object.values(studentStatuses).filter(s => s === 'absent').length;
    const lateCount = Object.values(studentStatuses).filter(s => s === 'late').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Mark Attendance</h2>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Class</label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                <SelectContent>
                                    {assignments?.map((a) => {
                                        const cls = a.classes || {};
                                        const subj = a.subjects || {};
                                        const clsId = cls.id || cls._id || a.class_id || a.classId;
                                        return (
                                            <SelectItem key={clsId} value={clsId || ''}>
                                                {cls.name || 'Class'} {cls.section && `- ${cls.section}`} ({subj.name || 'Subject'})
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Date</label>
                            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Period</label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                                        <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {selectedClassId && (
                <>
                    {studentsLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}
                        </div>
                    ) : !students?.length ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-lg font-medium text-foreground">No Students Found</p>
                                <p className="text-sm text-muted-foreground">Add students to this class first.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 flex-wrap">
                                <Badge variant="outline" className="gap-1">
                                    <Users className="h-3 w-3" /> {students.length} total
                                </Badge>
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                                    <Check className="h-3 w-3" /> {presentCount} present
                                </Badge>
                                <Badge className="bg-destructive text-destructive-foreground gap-1">
                                    <X className="h-3 w-3" /> {absentCount} absent
                                </Badge>
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 gap-1">
                                    <Clock className="h-3 w-3" /> {lateCount} late
                                </Badge>
                            </div>

                            <Card>
                                <CardContent className="pt-6 space-y-1">
                                    {students.map((student, index) => {
                                        const sId = student._id || student.id;
                                        const status = studentStatuses[sId] || 'present';
                                        return (
                                            <div
                                                key={sId}
                                                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                                onClick={() => handleStatusToggle(sId)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground w-8">
                                                        {student.rollNumber || student.roll_number || index + 1}
                                                    </span>
                                                    <span className="text-sm font-medium text-foreground">{student.name}</span>
                                                </div>
                                                <Badge
                                                    className={
                                                        status === 'present'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : status === 'absent'
                                                                ? 'bg-destructive text-destructive-foreground'
                                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                                    }
                                                >
                                                    {status === 'present' && <Check className="h-3 w-3 mr-1" />}
                                                    {status === 'absent' && <X className="h-3 w-3 mr-1" />}
                                                    {status === 'late' && <Clock className="h-3 w-3 mr-1" />}
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            <Button
                                onClick={handleSubmit}
                                className="w-full sm:w-auto"
                                size="lg"
                                disabled={markAttendance.isPending}
                            >
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                {markAttendance.isPending ? 'Saving...' : 'Save Attendance'}
                            </Button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default TeacherAttendanceMarker;
