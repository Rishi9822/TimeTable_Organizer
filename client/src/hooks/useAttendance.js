import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, date, period, subjectId, records }) => {
      const { data } = await api.post("/attendance", {
        classId,
        date,
        period,
        subjectId,
        records,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useAttendance(classId, date) {
  return useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (date) params.set("date", date);
      const { data } = await api.get(`/attendance?${params.toString()}`);
      return data;
    },
    enabled: !!(classId || date),
  });
}

export function useInstitutionAttendance(startDate, endDate) {
  return useQuery({
    queryKey: ["attendance", "institution", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const { data } = await api.get(`/attendance/institution?${params.toString()}`);
      return data;
    },
    enabled: !!(startDate && endDate),
  });
}

export function useStudentAttendance(studentId) {
  return useQuery({
    queryKey: ["attendance", "student", studentId],
    queryFn: async () => {
      const { data } = await api.get(`/attendance/student/${studentId}`);
      return data;
    },
    enabled: !!studentId,
  });
}
