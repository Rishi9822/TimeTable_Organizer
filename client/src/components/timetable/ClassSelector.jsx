import { ChevronDown, School, GraduationCap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClasses, useCreateClass } from "@/hooks/useTeachers";
import { useInstitutionContext } from '@/contexts/InstitutionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';


const ClassSelector = ({ selectedClassId, onSelectClass }) => {
    const { config } = useInstitutionContext();
    const { hasRole } = useAuth();
    const { toast } = useToast();
    const canEdit = hasRole(['admin', 'scheduler']);

    const { data: classes = [], isLoading } = useClasses();
    const createClass = useCreateClass();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [newClass, setNewClass] = useState({
        name: '',
        grade: '',
        section: '',
        institution_type: config.institutionType || 'school',
        capacity: 40
    });

    const selectedClass = classes.find(c => c.id === selectedClassId);

    // Filter classes based on institution type if set
    const schoolClasses = classes.filter(c => c.institution_type === 'school');
    const collegeClasses = classes.filter(c => c.institution_type === 'college');

    // Show only relevant classes based on institution config
    const showSchool = !config.institutionType || config.institutionType === 'school';
    const showCollege = !config.institutionType || config.institutionType === 'college';

    const handleAddClass = async () => {
        if (!newClass.name.trim()) {
            toast({ title: 'Error', description: 'Class name is required', variant: 'destructive' });
            return;
        }
        try {
            const created = await createClass.mutateAsync(newClass);
            toast({ title: 'Success', description: 'Class added successfully' });
            setNewClass({
                name: '',
                grade: '',
                section: '',
                institution_type: config.institutionType || 'school',
                capacity: 40
            });
            setDialogOpen(false);
            // Auto-select the new class
            if (created) {
                onSelectClass(created.id, `${created.name}${created.section ? ` - ${created.section}` : ''}`);
            }
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const getClassName = (cls) => {
        return cls.section ? `${cls.name} - ${cls.section}` : cls.name;
    };

    if (isLoading) {
        return <Skeleton className="h-10 w-[200px]" />;
    }

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="min-w-[200px] justify-between">
                        <span className="flex items-center gap-2">
                            {selectedClass?.institution_type === 'college' ? (
                                <GraduationCap className="w-4 h-4 text-accent" />
                            ) : (
                                <School className="w-4 h-4 text-primary" />
                            )}
                            {selectedClass ? getClassName(selectedClass) : 'Select Class'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px]">
                    {classes.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No classes found. Add a class to get started.
                        </div>
                    ) : (
                        <>
                            {showSchool && schoolClasses.length > 0 && (
                                <>
                                    <DropdownMenuLabel className="flex items-center gap-2">
                                        <School className="w-4 h-4" />
                                        School Classes
                                    </DropdownMenuLabel>
                                    {schoolClasses.map(cls => (
                                        <DropdownMenuItem
                                            key={cls.id}
                                            onClick={() => onSelectClass(cls.id, getClassName(cls))}
                                            className={cls.id === selectedClassId ? 'bg-primary/10' : ''}
                                        >
                                            {getClassName(cls)}
                                        </DropdownMenuItem>
                                    ))}
                                    {showCollege && collegeClasses.length > 0 && <DropdownMenuSeparator />}
                                </>
                            )}

                            {showCollege && collegeClasses.length > 0 && (
                                <>
                                    <DropdownMenuLabel className="flex items-center gap-2">
                                        <GraduationCap className="w-4 h-4" />
                                        College Classes
                                    </DropdownMenuLabel>
                                    {collegeClasses.map(cls => (
                                        <DropdownMenuItem
                                            key={cls.id}
                                            onClick={() => onSelectClass(cls.id, getClassName(cls))}
                                            className={cls.id === selectedClassId ? 'bg-primary/10' : ''}
                                        >
                                            {getClassName(cls)}
                                        </DropdownMenuItem>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {canEdit && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Class</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Class Name *</Label>
                                <Input
                                    value={newClass.name}
                                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                                    placeholder={config.institutionType === 'college' ? 'FY BSc CS' : 'Class 10'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Grade</Label>
                                    <Input
                                        value={newClass.grade}
                                        onChange={(e) => setNewClass({ ...newClass, grade: e.target.value })}
                                        placeholder={config.institutionType === 'college' ? '1st Year' : '10th'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Section/Division</Label>
                                    <Input
                                        value={newClass.section}
                                        onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                                        placeholder="A"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={newClass.institution_type}
                                        onValueChange={(v) => setNewClass({ ...newClass, institution_type: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="school">School</SelectItem>
                                            <SelectItem value="college">College</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Capacity</Label>
                                    <Input
                                        type="number"
                                        value={newClass.capacity}
                                        onChange={(e) => setNewClass({ ...newClass, capacity: parseInt(e.target.value) || 40 })}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleAddClass} className="w-full" disabled={createClass.isPending}>
                                {createClass.isPending ? 'Adding...' : 'Add Class'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default ClassSelector;