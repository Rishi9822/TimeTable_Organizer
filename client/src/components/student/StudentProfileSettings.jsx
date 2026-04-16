import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Loader2, Save, CheckCircle } from 'lucide-react';

const StudentProfileSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [changingPw, setChangingPw] = useState(false);

    const { data: student } = useQuery({
        queryKey: ['my-student-profile', user?.id],
        queryFn: async () => {
            const { data } = await api.get('/students/me');
            return data;
        },
        enabled: !!user,
        retry: false,
    });

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    React.useEffect(() => {
        if (user) setName(user.name || '');
        if (student) setPhone(student.phone || '');
    }, [user, student]);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await api.put('/auth/profile', { name, phone });
            queryClient.invalidateQueries({ queryKey: ['my-student-profile'] });
            toast({ title: 'Profile updated' });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (password.length < 6) {
            toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
            return;
        }
        if (password !== confirmPassword) {
            toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
            return;
        }
        setChangingPw(true);
        try {
            await api.put('/auth/change-password', { newPassword: password });
            toast({ title: 'Password changed successfully' });
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        } finally {
            setChangingPw(false);
        }
    };

    const classInfo = student?.classId;
    const className = typeof classInfo === 'object' ? `${classInfo?.name || ''}${classInfo?.section ? ` - ${classInfo.section}` : ''}` : (classInfo ? 'Assigned' : 'Not assigned');

    return (
        <div className="space-y-6 max-w-lg">
            {/* Profile Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" /> Profile Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input value={user?.email || ''} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Full Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
                    </div>
                    {student && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Roll Number</Label>
                                <Input value={student.rollNumber || student.roll_number || '—'} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Class</Label>
                                <Input value={className} disabled className="bg-muted" />
                            </div>
                        </div>
                    )}
                    <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        Save Profile
                    </Button>
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4" /> Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>New Password</Label>
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Confirm Password</Label>
                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={changingPw || !password} variant="outline" className="w-full">
                        {changingPw ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Update Password
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default StudentProfileSettings;
