import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Trash2, Upload, FileSpreadsheet, AlertCircle, CheckCircle, UserPlus, Copy, Eye, EyeOff, Download, Pencil, KeyRound, Loader2 } from 'lucide-react';
import { useStudents, useCreateStudent, useDeleteStudent } from '@/hooks/useStudents';
import { useModeAwareClasses } from '@/hooks/useModeAwareData';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const AdminStudentsPanel = () => {
    const { toast } = useToast();
    const { institutionId } = useAuth();
    const { activeMode } = useSubscription();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [open, setOpen] = useState(false);
    const [csvOpen, setCsvOpen] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [csvClassId, setCsvClassId] = useState('');
    const [csvErrors, setCsvErrors] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [csvCreateAccounts, setCsvCreateAccounts] = useState(false);

    // Credentials dialogs
    const [credentialsOpen, setCredentialsOpen] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Bulk credentials
    const [bulkCredentialsOpen, setBulkCredentialsOpen] = useState(false);
    const [bulkCredentials, setBulkCredentials] = useState([]);

    // Edit student
    const [editOpen, setEditOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRollNumber, setEditRollNumber] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editClassId, setEditClassId] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [resetPasswordResult, setResetPasswordResult] = useState(null);
    const [showResetPassword, setShowResetPassword] = useState(false);

    const { data: classes } = useModeAwareClasses();
    const { data: students, isLoading } = useStudents(selectedClassId === 'all' ? undefined : selectedClassId || undefined);
    const createStudent = useCreateStudent();
    const deleteStudent = useDeleteStudent();

    // Single student form
    const [name, setName] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [classId, setClassId] = useState('');
    const [createAccount, setCreateAccount] = useState(true);
    const [creatingAccount, setCreatingAccount] = useState(false);

    const handleCreate = async () => {
        if (!name || !classId) return;

        if (createAccount && email) {
            setCreatingAccount(true);
            try {
                const { data: result } = await api.post('/students/create-account', {
                    name, email, rollNumber: rollNumber || null, phone: phone || null,
                    classId, modeType: activeMode,
                });

                queryClient.invalidateQueries({ queryKey: ['students'] });
                setCreatedCredentials({ email: result.credentials.email, password: result.credentials.password, name });
                setOpen(false);
                setCredentialsOpen(true);
                setName(''); setRollNumber(''); setEmail(''); setPhone('');
                toast({ title: 'Student account created successfully' });
            } catch (err) {
                toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
            } finally {
                setCreatingAccount(false);
            }
        } else {
            try {
                await createStudent.mutateAsync({ name, rollNumber: rollNumber || null, email: email || null, phone: phone || null, classId, modeType: activeMode });
                toast({ title: 'Student Added' });
                setOpen(false);
                setName(''); setRollNumber(''); setEmail(''); setPhone('');
            } catch (err) {
                toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
            }
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteStudent.mutateAsync(id);
            toast({ title: 'Student Removed' });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} copied to clipboard` });
    };

    const openEditDialog = (student) => {
        setEditingStudent(student);
        setEditName(student.name);
        setEditRollNumber(student.rollNumber || student.roll_number || '');
        setEditEmail(student.email || '');
        setEditPhone(student.phone || '');
        setEditClassId(student.classId || student.class_id || '');
        setResetPasswordResult(null);
        setShowResetPassword(false);
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingStudent || !editName || !editClassId) return;
        try {
            const id = editingStudent._id || editingStudent.id;
            await api.put(`/students/${id}`, {
                name: editName,
                rollNumber: editRollNumber || null,
                email: editEmail || null,
                phone: editPhone || null,
                classId: editClassId,
            });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            toast({ title: 'Student updated successfully' });
            setEditOpen(false);
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    const handleResetPassword = async () => {
        if (!editingStudent) return;
        const sId = editingStudent._id || editingStudent.id;
        setResettingPassword(true);
        setResetPasswordResult(null);
        try {
            const { data } = await api.post(`/students/${sId}/reset-password`);
            setResetPasswordResult(data.password);
            setShowResetPassword(true);
            toast({ title: 'Password reset successfully' });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        } finally {
            setResettingPassword(false);
        }
    };

    const copyAllCredentials = () => {
        if (!createdCredentials) return;
        const text = `Student: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
        navigator.clipboard.writeText(text);
        toast({ title: 'Credentials copied to clipboard' });
    };

    const downloadBulkCredentials = () => {
        const successCreds = bulkCredentials.filter(c => c.status === 'success');
        if (successCreds.length === 0) return;
        const csv = 'Name,Email,Password,Status\n' +
            bulkCredentials.map(c =>
                `"${c.name}","${c.email || ''}","${c.password || ''}","${c.status}"`
            ).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_credentials.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // CSV parsing
    const parseCsv = (text) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return { students: [], errors: ['CSV must have a header row and at least one data row.'] };

        const header = lines[0].toLowerCase().split(',').map(h => h.trim());
        const nameIdx = header.findIndex(h => h === 'name' || h === 'student name' || h === 'student_name');
        const rollIdx = header.findIndex(h => h === 'roll' || h === 'roll_number' || h === 'roll number' || h === 'roll_no' || h === 'roll no');
        const emailIdx = header.findIndex(h => h === 'email' || h === 'email address');
        const phoneIdx = header.findIndex(h => h === 'phone' || h === 'phone number' || h === 'mobile' || h === 'contact');

        if (nameIdx === -1) return { students: [], errors: ['CSV must have a "Name" column.'] };

        const errors = [];
        const parsedStudents = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            const studentName = cols[nameIdx]?.trim();
            if (!studentName) { errors.push(`Row ${i + 1}: Missing name, skipped.`); continue; }
            parsedStudents.push({
                name: studentName,
                rollNumber: rollIdx >= 0 ? cols[rollIdx]?.trim() || '' : '',
                email: emailIdx >= 0 ? cols[emailIdx]?.trim() || '' : '',
                phone: phoneIdx >= 0 ? cols[phoneIdx]?.trim() || '' : ''
            });
        }
        return { students: parsedStudents, errors };
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            toast({ title: 'Invalid file', description: 'Please upload a .csv file', variant: 'destructive' });
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            const { students: parsed, errors } = parseCsv(text);
            setCsvData(parsed);
            setCsvErrors(errors);
            setCsvOpen(true);
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleBulkImport = async () => {
        if (!csvClassId || csvData.length === 0) return;
        setImporting(true);
        setImportProgress(0);

        if (csvCreateAccounts) {
            try {
                const { data } = await api.post('/students/bulk-create-accounts', {
                    students: csvData,
                    classId: csvClassId,
                    modeType: activeMode,
                });

                queryClient.invalidateQueries({ queryKey: ['students'] });
                setBulkCredentials(data.results || []);
                setCsvOpen(false);
                setBulkCredentialsOpen(true);

                const succeeded = (data.results || []).filter(c => c.status === 'success').length;
                toast({ title: 'Import Complete', description: `${succeeded} accounts created.` });
            } catch (err) {
                toast({ title: 'Import Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
            }
        } else {
            // Normal bulk import without accounts — create each one
            let imported = 0;
            let failed = 0;

            try {
                for (let i = 0; i < csvData.length; i++) {
                    try {
                        await api.post('/students', {
                            name: csvData[i].name,
                            rollNumber: csvData[i].rollNumber || null,
                            email: csvData[i].email || null,
                            phone: csvData[i].phone || null,
                            classId: csvClassId,
                            modeType: activeMode,
                        });
                        imported++;
                    } catch {
                        failed++;
                    }
                    setImportProgress(Math.round(((i + 1) / csvData.length) * 100));
                }
                queryClient.invalidateQueries({ queryKey: ['students'] });
                toast({ title: 'Import Complete', description: `${imported} students added${failed > 0 ? `, ${failed} failed` : ''}.` });
                setCsvOpen(false);
                setCsvData([]);
                setCsvErrors([]);
                setCsvClassId('');
            } catch (err) {
                toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
            }
        }

        setImporting(false);
        setImportProgress(0);
    };

    const downloadTemplate = () => {
        const csv = 'Name,Roll Number,Email,Phone\nJohn Doe,101,john@example.com,9876543210\nJane Smith,102,jane@example.com,9876543211';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const emailsInCsv = csvData.filter(s => s.email).length;
    const getId = (s) => s._id || s.id;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Students</h3>
                    <Badge variant="secondary">{students?.length || 0}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by class" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            {classes?.map(c => (
                                <SelectItem key={getId(c)} value={getId(c)}>{c.name} {c.section && `- ${c.section}`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4" /> Import CSV
                    </Button>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Student</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5 text-primary" /> Add Student
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Input placeholder="Student Name *" value={name} onChange={e => setName(e.target.value)} />
                                <Input placeholder="Roll Number" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                                <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                                <Input placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1.5 block">Class *</label>
                                    <Select value={classId} onValueChange={setClassId}>
                                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes?.map(c => (
                                                <SelectItem key={getId(c)} value={getId(c)}>{c.name} {c.section && `- ${c.section}`}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="create-account" className="text-sm font-medium text-foreground">Create login account</Label>
                                        <p className="text-xs text-muted-foreground">Auto-generate credentials for student portal access</p>
                                    </div>
                                    <input type="checkbox" id="create-account" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} className="h-4 w-4" />
                                </div>
                                {createAccount && !email && (
                                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>Email is required to create a login account</span>
                                    </div>
                                )}
                                <Button onClick={handleCreate} className="w-full gap-2" disabled={creatingAccount || createStudent.isPending || !name || !classId || (createAccount && !email)}>
                                    {creatingAccount ? 'Creating account...' : createAccount && email ? <><UserPlus className="h-4 w-4" /> Add Student with Account</> : 'Add Student'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Single Credentials Dialog */}
            <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <CheckCircle className="h-5 w-5" /> Student Account Created
                        </DialogTitle>
                    </DialogHeader>
                    {createdCredentials && (
                        <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">
                                Login credentials for <span className="font-semibold text-foreground">{createdCredentials.name}</span>. Share securely — the password cannot be retrieved later.
                            </p>
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p><p className="text-sm font-mono font-medium text-foreground">{createdCredentials.email}</p></div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(createdCredentials.email, 'Email')}><Copy className="h-4 w-4" /></Button>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Password</p><p className="text-sm font-mono font-medium text-foreground">{showPassword ? createdCredentials.password : '••••••••••••'}</p></div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(createdCredentials.password, 'Password')}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={copyAllCredentials} variant="outline" className="w-full gap-2"><Copy className="h-4 w-4" /> Copy All Credentials</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Bulk Credentials Dialog */}
            <Dialog open={bulkCredentialsOpen} onOpenChange={setBulkCredentialsOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <CheckCircle className="h-5 w-5" /> Bulk Accounts Created
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{bulkCredentials.filter(c => c.status === 'success' && c.email).length}</span> accounts created.
                            Download the credentials CSV before closing.
                        </p>
                        <Button onClick={downloadBulkCredentials} className="w-full gap-2">
                            <Download className="h-4 w-4" /> Download Credentials CSV
                        </Button>
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bulkCredentials.slice(0, 20).map((c, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-xs">{c.email || '—'}</TableCell>
                                            <TableCell>
                                                {c.status === 'success' ? (
                                                    <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Created</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> {c.error}</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {bulkCredentials.length > 20 && (
                                <p className="text-xs text-muted-foreground text-center py-2">...and {bulkCredentials.length - 20} more (download CSV for full list)</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CSV Import Preview Dialog */}
            <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" /> Import Students from CSV
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {csvErrors.length > 0 && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                                {csvErrors.map((err, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 flex-shrink-0" /><span>{err}</span></div>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span className="text-sm text-foreground font-medium">{csvData.length} students ready to import</span>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Import into Class *</label>
                            <Select value={csvClassId} onValueChange={setCsvClassId}>
                                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                <SelectContent>
                                    {classes?.map(c => (
                                        <SelectItem key={getId(c)} value={getId(c)}>{c.name} {c.section && `- ${c.section}`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                            <div className="space-y-0.5">
                                <Label htmlFor="csv-create-accounts" className="text-sm font-medium text-foreground">Create login accounts</Label>
                                <p className="text-xs text-muted-foreground">Auto-generate credentials for {emailsInCsv} students with emails</p>
                            </div>
                            <input type="checkbox" id="csv-create-accounts" checked={csvCreateAccounts} onChange={(e) => setCsvCreateAccounts(e.target.checked)} className="h-4 w-4" disabled={emailsInCsv === 0} />
                        </div>
                        {csvData.length > 0 && (
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Roll #</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Phone</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {csvData.slice(0, 10).map((s, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                                <TableCell className="font-medium">{s.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{s.rollNumber || '—'}</TableCell>
                                                <TableCell className="text-muted-foreground">{s.email || '—'}</TableCell>
                                                <TableCell className="text-muted-foreground">{s.phone || '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {csvData.length > 10 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">...and {csvData.length - 10} more</p>
                                )}
                            </div>
                        )}
                        {importing && (
                            <div className="space-y-2">
                                <Progress value={importProgress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-center">
                                    {csvCreateAccounts ? 'Creating accounts...' : 'Importing...'} {importProgress}%
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Button onClick={handleBulkImport} className="flex-1 gap-2" disabled={importing || !csvClassId || csvData.length === 0}>
                                {csvCreateAccounts ? <UserPlus className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                                {importing ? (csvCreateAccounts ? 'Creating accounts...' : 'Importing...') :
                                    csvCreateAccounts ? `Import & Create ${emailsInCsv} Accounts` : `Import ${csvData.length} Students`}
                            </Button>
                            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                                <FileSpreadsheet className="h-4 w-4" /> Template
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Student Table */}
            {isLoading ? (
                <div className="h-48 rounded-lg bg-muted animate-pulse" />
            ) : !students?.length ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                            {selectedClassId && selectedClassId !== 'all' ? 'No students in this class.' : 'Select a class or add students.'}
                        </p>
                        <Button variant="link" onClick={downloadTemplate} className="mt-2 gap-2 text-primary">
                            <FileSpreadsheet className="h-4 w-4" /> Download CSV Template
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Roll #</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student, idx) => (
                                <TableRow key={getId(student)}>
                                    <TableCell className="font-mono text-sm">{student.rollNumber || student.roll_number || idx + 1}</TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{student.email || '—'}</TableCell>
                                    <TableCell className="text-muted-foreground">{student.phone || '—'}</TableCell>
                                    <TableCell>
                                        {student.userId || student.user_id ? (
                                            <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Linked</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs text-muted-foreground">No account</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(student)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(getId(student))}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Edit Student Dialog */}
            <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setResetPasswordResult(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" /> Edit Student
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Input placeholder="Student Name *" value={editName} onChange={e => setEditName(e.target.value)} />
                        <Input placeholder="Roll Number" value={editRollNumber} onChange={e => setEditRollNumber(e.target.value)} />
                        <Input placeholder="Email" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                        <Input placeholder="Phone (optional)" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Class *</label>
                            <Select value={editClassId} onValueChange={setEditClassId}>
                                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                <SelectContent>
                                    {classes?.map(c => (
                                        <SelectItem key={getId(c)} value={getId(c)}>{c.name} {c.section && `- ${c.section}`}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleUpdate} className="w-full" disabled={!editName || !editClassId}>
                            Save Changes
                        </Button>
                        {(editingStudent?.userId || editingStudent?.user_id) && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Password Management</p>
                                            <p className="text-xs text-muted-foreground">Generate a new password for this student</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="gap-2" onClick={handleResetPassword} disabled={resettingPassword}>
                                            {resettingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
                                            Reset Password
                                        </Button>
                                    </div>
                                    {resetPasswordResult && (
                                        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                                            <p className="text-xs text-muted-foreground">New password — share securely.</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-mono font-medium text-foreground">
                                                    {showResetPassword ? resetPasswordResult : '••••••••••••'}
                                                </p>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowResetPassword(!showResetPassword)}>
                                                        {showResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(resetPasswordResult, 'Password')}>
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminStudentsPanel;
