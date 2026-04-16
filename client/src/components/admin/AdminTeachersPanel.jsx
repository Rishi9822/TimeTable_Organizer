import React, { useState } from 'react';
import {
    Plus, Trash2, Edit2, Users, Search, Mail, Phone, UserPlus,
    Copy, Eye, EyeOff, CheckCircle, AlertCircle, GraduationCap, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
    useTeachers, useCreateTeacher, useDeleteTeacher,
    useSubjects, useClasses,
    useTeacherSubjects, useAssignTeacherSubject, useRemoveTeacherSubject,
    useTeacherClassAssignments, useAssignTeacherClass, useRemoveTeacherClassAssignment,
} from '@/hooks/useTeachers';
import { useInstitutionContext } from '@/contexts/InstitutionContext';

const AdminTeachersPanel = () => {
    const { toast } = useToast();
    const { config } = useInstitutionContext();
    const queryClient = useQueryClient();

    const { data: teachers = [], isLoading } = useTeachers();
    const { data: subjects = [] } = useSubjects();
    const { data: classes = [] } = useClasses(config.institutionType || undefined);
    const { data: teacherSubjects = [] } = useTeacherSubjects();
    const { data: teacherClassAssignments = [] } = useTeacherClassAssignments();

    const createTeacher = useCreateTeacher();
    const deleteTeacher = useDeleteTeacher();
    const assignTeacherSubject = useAssignTeacherSubject();
    const removeTeacherSubject = useRemoveTeacherSubject();
    const assignTeacherClass = useAssignTeacherClass();
    const removeTeacherClassAssignment = useRemoveTeacherClassAssignment();

    const [searchQuery, setSearchQuery] = useState('');
    const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '', department: '', max_periods_per_day: 6 });
    const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
    const [createAccount, setCreateAccount] = useState(true);
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [credentialsOpen, setCredentialsOpen] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Edit state
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} copied to clipboard` });
    };

    const handleAddTeacher = async () => {
        if (!newTeacher.name.trim()) {
            toast({ title: 'Error', description: 'Teacher name is required', variant: 'destructive' });
            return;
        }

        if (createAccount && newTeacher.email) {
            setCreatingAccount(true);
            try {
                // Use Express API to create teacher with linked user account
                const { data: result } = await api.post('/teachers', {
                    ...newTeacher,
                    createAccount: true,
                });

                queryClient.invalidateQueries({ queryKey: ['teachers'] });
                if (result.credentials) {
                    setCreatedCredentials({ name: newTeacher.name, email: result.credentials.email, password: result.credentials.password });
                    setCredentialsOpen(true);
                }
                setTeacherDialogOpen(false);
                setNewTeacher({ name: '', email: '', phone: '', department: '', max_periods_per_day: 6 });
                toast({ title: 'Success', description: 'Teacher account created successfully' });
            } catch (error) {
                toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' });
            } finally {
                setCreatingAccount(false);
            }
        } else {
            try {
                await createTeacher.mutateAsync(newTeacher);
                toast({ title: 'Success', description: 'Teacher added successfully' });
                setNewTeacher({ name: '', email: '', phone: '', department: '', max_periods_per_day: 6 });
                setTeacherDialogOpen(false);
            } catch (error) {
                toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' });
            }
        }
    };

    const handleEditTeacher = async () => {
        if (!editingTeacher) return;
        try {
            await api.put(`/teachers/${editingTeacher.id}`, {
                name: editingTeacher.name,
                email: editingTeacher.email,
                phone: editingTeacher.phone,
                department: editingTeacher.department,
                max_periods_per_day: editingTeacher.max_periods_per_day,
            });
            queryClient.invalidateQueries({ queryKey: ['teachers'] });
            toast({ title: 'Success', description: 'Teacher updated successfully' });
            setEditDialogOpen(false);
            setEditingTeacher(null);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' });
        }
    };

    const handleToggleSubject = async (teacherId, subjectId, isAssigned) => {
        try {
            if (isAssigned) {
                await removeTeacherSubject.mutateAsync({ teacherId, subjectId });
            } else {
                await assignTeacherSubject.mutateAsync({ teacherId, subjectId });
            }
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' });
        }
    };

    const handleAssignClass = async (teacherId, subjectId, classId) => {
        try {
            await assignTeacherClass.mutateAsync({ teacher_id: teacherId, subject_id: subjectId, class_id: classId, periods_per_week: 4 });
            toast({ title: 'Success', description: 'Teacher assigned to class' });
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' });
        }
    };

    const getTeacherSubjectIds = (teacherId) =>
        teacherSubjects.filter(ts => (ts.teacher_id || ts.teacherId) === teacherId).map(ts => ts.subject_id || ts.subjectId);

    const getTeacherAssignments = (teacherId) =>
        teacherClassAssignments.filter(a => (a.teacher_id || a.teacherId) === teacherId);

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search teachers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="w-4 h-4" /> Add Teacher</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-primary" /> Add New Teacher
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input value={newTeacher.name} onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })} placeholder="John Doe" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} placeholder="john@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={newTeacher.phone} onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })} placeholder="+1234567890" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Input value={newTeacher.department} onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })} placeholder="Mathematics" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Periods/Day</Label>
                                    <Input type="number" value={newTeacher.max_periods_per_day} onChange={(e) => setNewTeacher({ ...newTeacher, max_periods_per_day: parseInt(e.target.value) || 6 })} />
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label htmlFor="admin-teacher-create-account" className="text-sm font-medium text-foreground">Create login account</Label>
                                    <p className="text-xs text-muted-foreground">Auto-generate credentials for teacher portal access</p>
                                </div>
                                <Switch id="admin-teacher-create-account" checked={createAccount} onCheckedChange={setCreateAccount} />
                            </div>
                            {createAccount && !newTeacher.email && (
                                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>Email is required to create a login account</span>
                                </div>
                            )}
                            <Button onClick={handleAddTeacher} className="w-full gap-2" disabled={creatingAccount || createTeacher.isPending || !newTeacher.name || (createAccount && !newTeacher.email)}>
                                {creatingAccount ? 'Creating account...' : createAccount && newTeacher.email ? (<><UserPlus className="h-4 w-4" /> Add Teacher with Account</>) : 'Add Teacher'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Credentials Dialog */}
            <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <CheckCircle className="h-5 w-5" /> Teacher Account Created
                        </DialogTitle>
                    </DialogHeader>
                    {createdCredentials && (
                        <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">
                                Login credentials for <span className="font-semibold text-foreground">{createdCredentials.name}</span>. Share securely — the password cannot be retrieved later.
                            </p>
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                                        <p className="text-sm font-mono font-medium text-foreground">{createdCredentials.email}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(createdCredentials.email, 'Email')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Password</p>
                                        <p className="text-sm font-mono font-medium text-foreground">{showPassword ? createdCredentials.password : '••••••••••••'}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(createdCredentials.password, 'Password')}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => {
                                const text = `Teacher: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
                                navigator.clipboard.writeText(text);
                                toast({ title: 'Credentials copied to clipboard' });
                            }} variant="outline" className="w-full gap-2">
                                <Copy className="h-4 w-4" /> Copy All Credentials
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Teacher Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Teacher</DialogTitle>
                    </DialogHeader>
                    {editingTeacher && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input value={editingTeacher.name} onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" value={editingTeacher.email || ''} onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={editingTeacher.phone || ''} onChange={(e) => setEditingTeacher({ ...editingTeacher, phone: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Input value={editingTeacher.department || ''} onChange={(e) => setEditingTeacher({ ...editingTeacher, department: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Periods/Day</Label>
                                    <Input type="number" value={editingTeacher.max_periods_per_day || 6} onChange={(e) => setEditingTeacher({ ...editingTeacher, max_periods_per_day: parseInt(e.target.value) || 6 })} />
                                </div>
                            </div>
                            <Button onClick={handleEditTeacher} className="w-full">Save Changes</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Teacher List */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Card key={i}><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>)}
                </div>
            ) : filteredTeachers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-foreground">No teachers found</h3>
                        <p className="text-sm text-muted-foreground mt-1">Add teachers to get started</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTeachers.map((teacher) => {
                        const assignedSubjectIds = getTeacherSubjectIds(teacher.id);
                        const assignedSubjects = subjects.filter(s => assignedSubjectIds.includes(s.id));
                        const assignments = getTeacherAssignments(teacher.id);

                        return (
                            <Card key={teacher.id} className="group">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-base">{teacher.name}</CardTitle>
                                                {teacher.user_id ? (
                                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                                        <CheckCircle className="w-2.5 h-2.5" /> Account
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">No Account</Badge>
                                                )}
                                            </div>
                                            {teacher.department && <Badge variant="secondary" className="mt-1 text-xs">{teacher.department}</Badge>}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTeacher(teacher); setEditDialogOpen(true); }}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTeacher.mutate(teacher.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {(teacher.email || teacher.phone) && (
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            {teacher.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{teacher.email}</div>}
                                            {teacher.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{teacher.phone}</div>}
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-xs text-muted-foreground mb-2">Subjects:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {assignedSubjects.length > 0 ? assignedSubjects.map(s => (
                                                <Badge key={s.id} variant="outline" style={{ borderColor: s.color || undefined, color: s.color || undefined }} className="text-xs">{s.name}</Badge>
                                            )) : <span className="text-xs text-muted-foreground">No subjects assigned</span>}
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        {assignments.length} class assignments • Max {teacher.max_periods_per_day} periods/day
                                    </div>

                                    <div className="flex gap-2 mt-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="flex-1"><BookOpen className="w-3 h-3 mr-2" />Subjects</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Assign Subjects to {teacher.name}</DialogTitle></DialogHeader>
                                                <div className="space-y-3 py-4">
                                                    {subjects.map(subject => {
                                                        const isAssigned = assignedSubjectIds.includes(subject.id);
                                                        return (
                                                            <div key={subject.id} className="flex items-center gap-3">
                                                                <Checkbox checked={isAssigned} onCheckedChange={() => handleToggleSubject(teacher.id, subject.id, isAssigned)} />
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color || '#4F46E5' }} />
                                                                <span className="text-sm">{subject.name}</span>
                                                                {subject.code && <Badge variant="secondary" className="text-xs">{subject.code}</Badge>}
                                                            </div>
                                                        );
                                                    })}
                                                    {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects available. Add subjects first.</p>}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="flex-1"><GraduationCap className="w-3 h-3 mr-2" />Classes</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-lg">
                                                <DialogHeader><DialogTitle>Assign {teacher.name} to Classes</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    {assignedSubjects.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">Assign subjects to this teacher first.</p>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm text-muted-foreground">Select which classes this teacher will teach each subject:</p>
                                                            {assignedSubjects.map(subject => {
                                                                const subjectAssignments = assignments.filter(a => a.subject_id === subject.id);
                                                                return (
                                                                    <div key={subject.id} className="border rounded-lg p-3">
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <div className="w-4 h-4 rounded" style={{ backgroundColor: subject.color || '#4F46E5' }} />
                                                                            <span className="font-medium text-sm">{subject.name}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {classes.map(cls => {
                                                                                const isAssignedToClass = subjectAssignments.some(a => a.class_id === cls.id);
                                                                                const assignmentId = subjectAssignments.find(a => a.class_id === cls.id)?.id;
                                                                                return (
                                                                                    <div key={cls.id} className="flex items-center gap-2">
                                                                                        <Checkbox
                                                                                            checked={isAssignedToClass}
                                                                                            onCheckedChange={(checked) => {
                                                                                                if (checked) handleAssignClass(teacher.id, subject.id, cls.id);
                                                                                                else if (assignmentId) removeTeacherClassAssignment.mutate(assignmentId);
                                                                                            }}
                                                                                        />
                                                                                        <span className="text-sm">{cls.name}{cls.section ? ` - ${cls.section}` : ''}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        {classes.length === 0 && <p className="text-xs text-muted-foreground">No classes available.</p>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
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

export default AdminTeachersPanel;
