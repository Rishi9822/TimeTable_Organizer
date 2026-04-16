import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useTeacherAssignments(teacherId) {
  return useQuery({
    queryKey: ["homework", "teacher", teacherId],
    queryFn: async () => {
      const { data } = await api.get(`/homework/teacher/${teacherId}`);
      return data;
    },
    enabled: !!teacherId,
  });
}

export function useAssignmentsByClass(classId) {
  return useQuery({
    queryKey: ["homework", "class", classId],
    queryFn: async () => {
      const { data } = await api.get(`/homework?classId=${classId}`);
      return data;
    },
    enabled: !!classId,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignment) => {
      const { data } = await api.post("/homework", assignment);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/homework/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
    },
  });
}

export function useSubmissionsForAssignment(assignmentId) {
  return useQuery({
    queryKey: ["homework", "submissions", assignmentId],
    queryFn: async () => {
      const { data } = await api.get(`/homework/${assignmentId}/submissions`);
      return data;
    },
    enabled: !!assignmentId,
  });
}

export function useMySubmissions(studentId) {
  return useQuery({
    queryKey: ["homework", "my-submissions", studentId],
    queryFn: async () => {
      const { data } = await api.get(`/homework/my-submissions?studentId=${studentId}`);
      return data;
    },
    enabled: !!studentId,
  });
}

export function useSubmitAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, studentId, remarks }) => {
      const { data } = await api.post(`/homework/${assignmentId}/submit`, {
        studentId,
        remarks,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
    },
  });
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, grade }) => {
      const { data } = await api.patch(`/homework/submissions/${submissionId}/grade`, {
        grade,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
    },
  });
}
