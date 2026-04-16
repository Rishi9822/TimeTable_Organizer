import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useStudents(classId) {
  return useQuery({
    queryKey: ["students", classId || "all"],
    queryFn: async () => {
      const params = classId ? `?classId=${classId}` : "";
      const { data } = await api.get(`/students${params}`);
      return data;
    },
  });
}

export function useMyStudentProfile() {
  return useQuery({
    queryKey: ["my-student-profile"],
    queryFn: async () => {
      const { data } = await api.get("/students/me");
      return data;
    },
    retry: false,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (student) => {
      const { data } = await api.post("/students", student);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data } = await api.put(`/students/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useCreateStudentAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentData) => {
      const { data } = await api.post("/students/create-account", studentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useBulkCreateStudentAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/students/bulk-create-accounts", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useResetStudentPassword() {
  return useMutation({
    mutationFn: async (studentId) => {
      const { data } = await api.post(`/students/${studentId}/reset-password`);
      return data;
    },
  });
}
