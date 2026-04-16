import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAcademicCalendar, useCreateAcademicEvent, useDeleteAcademicEvent } from '@/hooks/useAcademicCalendar';
import { CalendarDays, Plus, Trash2, GraduationCap, Umbrella, BookOpen, PartyPopper } from 'lucide-react';

function fmtDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateShort(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const EVENT_TYPE_CONFIG = {
    holiday: { label: 'Holiday', icon: <Umbrella className="h-3.5 w-3.5" />, color: 'bg-destructive/10 text-destructive border-destructive/20' },
    exam: { label: 'Exam Period', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200' },
    term_start: { label: 'Term Start', icon: <GraduationCap className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200' },
    term_end: { label: 'Term End', icon: <GraduationCap className="h-3.5 w-3.5" />, color: 'bg-muted text-muted-foreground border-muted' },
    event: { label: 'Event', icon: <PartyPopper className="h-3.5 w-3.5" />, color: 'bg-primary/10 text-primary border-primary/20' },
};

const AdminAcademicCalendar = () => {
    const { toast } = useToast();
    const { data: events = [], isLoading } = useAcademicCalendar();
    const createEvent = useCreateAcademicEvent();
    const deleteEvent = useDeleteAcademicEvent();
    const [dialogOpen, setDialogOpen] = useState(false);

    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        eventType: 'holiday',
        startDate: '',
        endDate: '',
        blocksTimetable: true,
    });

    const handleCreate = async () => {
        if (!newEvent.title || !newEvent.startDate || !newEvent.endDate) {
            toast({ title: 'Error', description: 'Title, start date, and end date are required', variant: 'destructive' });
            return;
        }
        if (new Date(newEvent.startDate) > new Date(newEvent.endDate)) {
            toast({ title: 'Error', description: 'End date must be after start date', variant: 'destructive' });
            return;
        }

        try {
            await createEvent.mutateAsync({
                title: newEvent.title,
                description: newEvent.description || null,
                eventType: newEvent.eventType,
                startDate: newEvent.startDate,
                endDate: newEvent.endDate,
                blocksTimetable: newEvent.blocksTimetable,
                modeType: null,
            });
            toast({ title: 'Event created' });
            setNewEvent({ title: '', description: '', eventType: 'holiday', startDate: '', endDate: '', blocksTimetable: true });
            setDialogOpen(false);
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' });
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteEvent.mutateAsync(id);
            toast({ title: 'Event deleted' });
        } catch (error) {
            toast({ title: 'Error', description: error.response?.data?.message || error.message, variant: 'destructive' });
        }
    };

    const getId = (e) => e._id || e.id;
    const getEndDate = (e) => e.endDate || e.end_date || '';
    const getStartDate = (e) => e.startDate || e.start_date || '';
    const getEventType = (e) => e.eventType || e.event_type || 'event';

    const now = new Date().toISOString().split('T')[0];
    const upcomingEvents = events.filter(e => getEndDate(e) >= now);
    const pastEvents = events.filter(e => getEndDate(e) < now);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">Academic Calendar</h2>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Add Event
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Calendar Event</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label>Title *</Label>
                                <Input
                                    value={newEvent.title}
                                    onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Diwali Holiday, Mid-term Exams"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={newEvent.eventType} onValueChange={v => setNewEvent(p => ({ ...p, eventType: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(EVENT_TYPE_CONFIG).map(([key, val]) => (
                                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date *</Label>
                                    <Input type="date" value={newEvent.startDate} onChange={e => setNewEvent(p => ({ ...p, startDate: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date *</Label>
                                    <Input type="date" value={newEvent.endDate} onChange={e => setNewEvent(p => ({ ...p, endDate: e.target.value }))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={newEvent.description}
                                    onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Optional details..."
                                    rows={2}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">Blocks timetable</Label>
                                    <p className="text-xs text-muted-foreground">Prevents scheduling on these dates</p>
                                </div>
                                <Switch checked={newEvent.blocksTimetable} onCheckedChange={v => setNewEvent(p => ({ ...p, blocksTimetable: v }))} />
                            </div>
                            <Button onClick={handleCreate} className="w-full" disabled={createEvent.isPending}>
                                {createEvent.isPending ? 'Creating...' : 'Create Event'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Upcoming Events */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Upcoming & Current</h3>
                {upcomingEvents.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No upcoming events</CardContent></Card>
                ) : (
                    <div className="space-y-2">
                        {upcomingEvents.map(event => {
                            const config = EVENT_TYPE_CONFIG[getEventType(event)] || EVENT_TYPE_CONFIG.event;
                            const sd = getStartDate(event);
                            const ed = getEndDate(event);
                            return (
                                <Card key={getId(event)} className="group">
                                    <CardContent className="flex items-center justify-between py-4">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className={`gap-1 ${config.color}`}>
                                                {config.icon} {config.label}
                                            </Badge>
                                            <div>
                                                <p className="font-medium text-foreground text-sm">{event.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {fmtDate(sd)}
                                                    {sd !== ed && ` – ${fmtDate(ed)}`}
                                                </p>
                                            </div>
                                            {(event.blocksTimetable || event.blocks_timetable) && (
                                                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Blocks Classes</Badge>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 text-destructive"
                                            onClick={() => handleDelete(getId(event))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Past Events */}
            {pastEvents.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Past Events</h3>
                    <div className="space-y-2 opacity-60">
                        {pastEvents.slice(0, 10).map(event => {
                            const config = EVENT_TYPE_CONFIG[getEventType(event)] || EVENT_TYPE_CONFIG.event;
                            return (
                                <Card key={getId(event)}>
                                    <CardContent className="flex items-center gap-3 py-3">
                                        <Badge variant="outline" className={`gap-1 ${config.color}`}>
                                            {config.icon} {config.label}
                                        </Badge>
                                        <div>
                                            <p className="font-medium text-foreground text-sm">{event.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {fmtDateShort(getStartDate(event))} – {fmtDate(getEndDate(event))}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAcademicCalendar;
