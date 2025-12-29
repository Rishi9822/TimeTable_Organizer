import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserMenu } from "@/components/auth/UserMenu";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Format action for human-readable display
 */
const formatAction = (action, meta) => {
  const actionMap = {
    CREATE_TEACHER: `Created Teacher: ${meta?.teacherName || "N/A"}`,
    UPDATE_TEACHER: `Updated Teacher: ${meta?.teacherName || "N/A"}`,
    DELETE_TEACHER: `Deleted Teacher: ${meta?.teacherName || "N/A"}`,
    CREATE_CLASS: `Created Class: ${meta?.className || "N/A"}${meta?.section ? ` - ${meta.section}` : ""}`,
    DELETE_CLASS: `Deleted Class: ${meta?.className || "N/A"}${meta?.section ? ` - ${meta.section}` : ""}`,
    CREATE_SUBJECT: `Created Subject: ${meta?.subjectName || "N/A"}`,
    DELETE_SUBJECT: `Deleted Subject: ${meta?.subjectName || "N/A"}`,
    ASSIGN_TEACHER_SUBJECT: `Assigned ${meta?.subjectName || "Subject"} to ${meta?.teacherName || "Teacher"}`,
    REMOVE_TEACHER_SUBJECT: `Removed ${meta?.subjectName || "Subject"} from ${meta?.teacherName || "Teacher"}`,
    SAVE_TIMETABLE: `Saved Timetable for ${meta?.className || "Class"}`,
    PUBLISH_TIMETABLE: `Published Timetable for ${meta?.className || "Class"}`,
    CREATE_INVITE_CODE: `Generated Invite Code: ${meta?.code || "N/A"}`,
    DELETE_INVITE_CODE: `Deleted Invite Code: ${meta?.code || "N/A"}`,
    CREATE_INSTITUTION: `Created Institution: ${meta?.institutionName || "N/A"}`,
    COMPLETE_INSTITUTION_SETUP: `Completed Institution Setup: ${meta?.institutionName || "N/A"}`,
    UPDATE_INSTITUTION_SETTINGS: "Updated Institution Settings",
  };

  return actionMap[action] || action.replace(/_/g, " ");
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ActivityLog = () => {
  const { user, hasRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const response = await API.get("/audit-logs", {
        params: { page, limit: 50 },
      });
      setLogs(response.data.logs || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole(["admin", "scheduler"])) {
      fetchLogs();
    }
  }, []);

  if (!hasRole(["admin", "scheduler"])) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You don't have permission to view activity logs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={hasRole(["admin"]) ? "/admin" : "/builder"}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Activity Log
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    View all actions performed in your institution
                  </p>
                </div>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Complete audit trail of all actions performed by admins and schedulers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No activity logs found.</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {formatAction(log.action, log.meta || {})}
                          </TableCell>
                          <TableCell>
                            {log.performedBy?.name || "Unknown User"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {log.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages} (
                      {pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchLogs(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ActivityLog;

