import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Users,
  BookOpen,
  GraduationCap,
  Search,
  Mail,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/auth/UserMenu';
import {
  useTeachers,
  useCreateTeacher,
  useDeleteTeacher,
  useSubjects,
  useCreateSubject,
  useDeleteSubject,
  useClasses,
  useCreateClass,
  useDeleteClass,
  useTeacherSubjects,
  useAssignTeacherSubject,
  useRemoveTeacherSubject,
  useTeacherClassAssignments,
  useAssignTeacherClass,
  useRemoveTeacherClassAssignment,
} from '@/hooks/useTeachers';
import { useInstitutionContext } from '@/contexts/InstitutionContext';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  '#4F46E5', '#7C3AED', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6'
];

const TeacherManagement = () => {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const { config } = useInstitutionContext();
  const canEdit = hasRole(['admin', 'scheduler']);

  // Data hooks
  const { data: teachers = [], isLoading: loadingTeachers } = useTeachers();
  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects();
  const { data: classes = [], isLoading: loadingClasses } = useClasses(config.institutionType || undefined);
  const { data: teacherSubjects = [] } = useTeacherSubjects();

  useEffect(() => {
    setLocalTeacherSubjects(teacherSubjects);
  }, [teacherSubjects]);

  const { data: teacherClassAssignments = [] } = useTeacherClassAssignments();

  // Mutations
  const createTeacher = useCreateTeacher();
  const deleteTeacher = useDeleteTeacher();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();
  const createClass = useCreateClass();
  const deleteClass = useDeleteClass();
  const assignTeacherSubject = useAssignTeacherSubject();
  const removeTeacherSubject = useRemoveTeacherSubject();
  const assignTeacherClass = useAssignTeacherClass();
  const removeTeacherClassAssignment = useRemoveTeacherClassAssignment();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [localTeacherSubjects, setLocalTeacherSubjects] = useState([]);

  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', phone: '', department: '', max_periods_per_day: 6 });
  const [newSubject, setNewSubject] = useState({ name: '', code: '', color: COLORS[0], periods_per_week: 4 });
  const [newClass, setNewClass] = useState({
    name: '',
    grade: '',
    section: '',
    institution_type: config.institutionType || 'school',
    capacity: 40
  });
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Handlers
  const handleAddTeacher = async () => {
    if (!newTeacher.name.trim()) {
      toast({ title: 'Error', description: 'Teacher name is required', variant: 'destructive' });
      return;
    }
    try {
      await createTeacher.mutateAsync(newTeacher);
      toast({ title: 'Success', description: 'Teacher added successfully' });
      setNewTeacher({ name: '', email: '', phone: '', department: '', max_periods_per_day: 6 });
      setTeacherDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.name.trim()) {
      toast({ title: 'Error', description: 'Subject name is required', variant: 'destructive' });
      return;
    }
    try {
      await createSubject.mutateAsync(newSubject);
      toast({ title: 'Success', description: 'Subject added successfully' });
      setNewSubject({ name: '', code: '', color: COLORS[0], periods_per_week: 4 });
      setSubjectDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddClass = async () => {
    if (!newClass.name.trim()) {
      toast({ title: 'Error', description: 'Class name is required', variant: 'destructive' });
      return;
    }
    try {
      await createClass.mutateAsync(newClass);
      toast({ title: 'Success', description: 'Class added successfully' });
      setNewClass({ name: '', grade: '', section: '', institution_type: config.institutionType || 'school', capacity: 40 });
      setClassDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleSubject = async (teacherId, subjectId, checked) => {
    // 1️⃣ Optimistic UI update (THIS IS FIX 2 IN ACTION)
    setLocalTeacherSubjects(prev => {
      if (checked) {
        return [...prev, { teacherId, subjectId }];
      }
      return prev.filter(
        ts => !(ts.teacherId === teacherId && ts.subjectId === subjectId)
      );
    });

    try {
      // 2️⃣ API call
      if (checked) {
        await assignTeacherSubject.mutateAsync({ teacherId, subjectId });
      } else {
        await removeTeacherSubject.mutateAsync({ teacherId, subjectId });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };




  const handleAssignClass = async (teacherId, subjectId, classId) => {
    try {
      await assignTeacherClass.mutateAsync({
        teacher_id: teacherId,
        subject_id: subjectId,
        class_id: classId,
        periods_per_week: 4
      });
      toast({ title: 'Success', description: 'Teacher assigned to class' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const teacherSubjectMap = useMemo(() => {
  const map = new Map();
  localTeacherSubjects.forEach(ts => {
    if (!map.has(ts.teacherId)) {
      map.set(ts.teacherId, []);
    }
    map.get(ts.teacherId).push(ts.subjectId);
  });
  return map;
}, [localTeacherSubjects]);


  const getTeacherSubjectIds = (teacherId) =>
    teacherSubjectMap.get(teacherId) || [];

  const teacherClassMap = useMemo(() => {
    const map = new Map();
    teacherClassAssignments.forEach(a => {
      if (!map.has(a.teacher_id)) {
        map.set(a.teacher_id, []);
      }
      map.get(a.teacher_id).push(a);
    });
    return map;
  }, [teacherClassAssignments]);

  const getTeacherAssignments = (teacherId) =>
    teacherClassMap.get(teacherId) || [];


  const filteredTeachers = useMemo(() => {
    return teachers.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teachers, searchQuery]);


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/builder">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Builder</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Teacher Management</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Manage teachers, subjects, and classes</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="teachers" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="w-4 h-4" />
              Teachers
            </TabsTrigger>
            <TabsTrigger value="subjects" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Subjects
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Classes
            </TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {canEdit && (
                <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Teacher
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Teacher</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={newTeacher.name}
                          onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newTeacher.email}
                            onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={newTeacher.phone}
                            onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                            placeholder="+1234567890"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Department</Label>
                          <Input
                            value={newTeacher.department}
                            onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
                            placeholder="Mathematics"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Periods/Day</Label>
                          <Input
                            type="number"
                            value={newTeacher.max_periods_per_day}
                            onChange={(e) => setNewTeacher({ ...newTeacher, max_periods_per_day: parseInt(e.target.value) || 6 })}
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddTeacher} className="w-full" disabled={createTeacher.isPending}>
                        {createTeacher.isPending ? 'Adding...' : 'Add Teacher'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {loadingTeachers ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                  </Card>
                ))}
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
                            <CardTitle className="text-base">{teacher.name}</CardTitle>
                            {teacher.department && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {teacher.department}
                              </Badge>
                            )}
                          </div>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={() => deleteTeacher.mutate(teacher.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(teacher.email || teacher.phone) && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {teacher.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                {teacher.email}
                              </div>
                            )}
                            {teacher.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                {teacher.phone}
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Subjects:</p>
                          <div className="flex flex-wrap gap-1">
                            {assignedSubjects.length > 0 ? (
                              assignedSubjects.map(s => (
                                <Badge
                                  key={s.id}
                                  variant="outline"
                                  style={{ borderColor: s.color, color: s.color }}
                                  className="text-xs"
                                >
                                  {s.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No subjects assigned</span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {assignments.length} class assignments • Max {teacher.max_periods_per_day} periods/day
                        </div>

                        {canEdit && (
                          <div className="flex gap-2 mt-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setSelectedTeacher(teacher.id)}
                                >
                                  <Edit2 className="w-3 h-3 mr-2" />
                                  Subjects
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Subjects to {teacher.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-4">
                                  {subjects.map(subject => {
                                    const isAssigned = assignedSubjectIds.includes(subject.id);
                                    return (
                                      <div key={subject.id} className="flex items-center gap-3">
                                        <Checkbox
  disabled={assignTeacherSubject.isPending || removeTeacherSubject.isPending}
  checked={getTeacherSubjectIds(teacher.id).includes(subject.id)}
  onCheckedChange={(checked) =>
    handleToggleSubject(teacher.id, subject.id, checked)
  }
/>


                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: subject.color }}
                                        />
                                        <span className="text-sm">{subject.name}</span>
                                        {subject.code && (
                                          <Badge variant="secondary" className="text-xs">{subject.code}</Badge>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {subjects.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No subjects available. Add subjects first.</p>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                >
                                  <GraduationCap className="w-3 h-3 mr-2" />
                                  Classes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Assign {teacher.name} to Classes</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  {assignedSubjects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Assign subjects to this teacher first.</p>
                                  ) : (
                                    <>
                                      <p className="text-sm text-muted-foreground">
                                        Select which classes this teacher will teach each subject:
                                      </p>
                                      {assignedSubjects.map(subject => {
                                        const subjectAssignments = assignments.filter(a => a.subject_id === subject.id);
                                        return (
                                          <div key={subject.id} className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-3">
                                              <div
                                                className="w-4 h-4 rounded"
                                                style={{ backgroundColor: subject.color }}
                                              />
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
                                                        if (checked) {
                                                          handleAssignClass(teacher.id, subject.id, cls.id);
                                                        } else if (assignmentId) {
                                                          removeTeacherClassAssignment.mutate(assignmentId);
                                                        }
                                                      }}
                                                    />
                                                    <span className="text-sm">
                                                      {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            {classes.length === 0 && (
                                              <p className="text-xs text-muted-foreground">No classes available. Add classes first.</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-4">
            <div className="flex items-center justify-end">
              {canEdit && (
                <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Subject</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={newSubject.name}
                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                            placeholder="Mathematics"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input
                            value={newSubject.code}
                            onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                            placeholder="MATH101"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Color</Label>
                          <div className="flex gap-2 flex-wrap">
                            {COLORS.map(color => (
                              <button
                                key={color}
                                className={`w-6 h-6 rounded-full border-2 ${newSubject.color === color ? 'border-foreground' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setNewSubject({ ...newSubject, color })}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Periods/Week</Label>
                          <Input
                            type="number"
                            value={newSubject.periods_per_week}
                            onChange={(e) => setNewSubject({ ...newSubject, periods_per_week: parseInt(e.target.value) || 4 })}
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddSubject} className="w-full" disabled={createSubject.isPending}>
                        {createSubject.isPending ? 'Adding...' : 'Add Subject'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {loadingSubjects ? (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}>
                    <CardContent className="py-4"><Skeleton className="h-12 w-full" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground">No subjects found</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add subjects to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {subjects.map((subject) => (
                  <Card key={subject.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-primary-foreground"
                            style={{ backgroundColor: subject.color }}
                          >
                            {subject.code?.slice(0, 2) || subject.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{subject.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {subject.code || 'No code'} • {subject.periods_per_week} periods/week
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => deleteSubject.mutate(subject.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Institution type: <Badge variant="outline" className="capitalize">{config.institutionType || 'Not set'}</Badge>
              </p>
              {canEdit && (
                <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Class
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
                            onValueChange={(v) =>
                              setNewClass({ ...newClass, institution_type: v })
                            }
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

            {loadingClasses ? (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}>
                    <CardContent className="py-4"><Skeleton className="h-12 w-full" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : classes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground">No classes found</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add classes to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {classes.map((cls) => (
                  <Card key={cls.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cls.institution_type === 'college' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'}`}>
                            {cls.institution_type === 'college' ? <GraduationCap className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">
                              {cls.name}{cls.section ? ` - ${cls.section}` : ''}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {cls.grade || 'No grade'} • {cls.capacity} students
                            </p>
                          </div>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => deleteClass.mutate(cls.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherManagement;