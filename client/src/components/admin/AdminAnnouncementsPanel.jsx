import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from '@/hooks/useAnnouncements';
import { useToast } from '@/hooks/use-toast';

import { Skeleton } from '@/components/ui/skeleton';

function fmtDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const AdminAnnouncementsPanel = () => {
    const { toast } = useToast();
    const { data: announcements, isLoading } = useAnnouncements();
    const createAnnouncement = useCreateAnnouncement();
    const deleteAnnouncement = useDeleteAnnouncement();
    const [open, setOpen] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('normal');
    const [audienceType, setAudienceType] = useState('all');
    const [expiresAt, setExpiresAt] = useState('');

    const handleCreate = async () => {
        if (!title || !content) return;
        try {
            await createAnnouncement.mutateAsync({
                title,
                content,
                priority,
                audienceType,
                audienceId: null,
                expiresAt: expiresAt || null
            });
            toast({ title: 'Announcement Created' });
            setOpen(false);
            setTitle('');
            setContent('');
            setPriority('normal');
            setAudienceType('all');
            setExpiresAt('');
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteAnnouncement.mutateAsync(id);
            toast({ title: 'Announcement removed' });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || err.message, variant: 'destructive' });
        }
    };

    if (isLoading) {
        return <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-24" />)}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Announcements</h3>
                    <Badge variant="secondary">{announcements?.length || 0}</Badge>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Announcement</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
                            <Textarea placeholder="Content..." value={content} onChange={e => setContent(e.target.value)} rows={4} />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1.5 block">Priority</label>
                                    <Select value={priority} onValueChange={setPriority}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="important">Important</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1.5 block">Audience</label>
                                    <Select value={audienceType} onValueChange={setAudienceType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Everyone</SelectItem>
                                            <SelectItem value="teachers">Teachers Only</SelectItem>
                                            <SelectItem value="students">Students Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1.5 block">Expires At (optional)</label>
                                <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                            </div>
                            <Button onClick={handleCreate} className="w-full" disabled={createAnnouncement.isPending || !title || !content}>
                                {createAnnouncement.isPending ? 'Creating...' : 'Create Announcement'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {!announcements?.length ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">No announcements yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {announcements.map(a => {
                        const aId = a._id || a.id;
                        return (
                        <Card key={aId}>
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground text-sm">{a.title}</span>
                                            <Badge variant="outline" className="capitalize text-xs">{a.priority}</Badge>
                                            <Badge variant="secondary" className="capitalize text-xs">{a.audienceType || a.audience_type}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                                        <p className="text-xs text-muted-foreground">{fmtDate(a.createdAt || a.created_at)}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(aId)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
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

export default AdminAnnouncementsPanel;
