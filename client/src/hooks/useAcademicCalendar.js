import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useAcademicCalendar() {
  return useQuery({
    queryKey: ["academic-calendar"],
    queryFn: async () => {
      const { data } = await api.get("/academic-calendar");
      return data;
    },
  });
}

export function useCreateAcademicEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event) => {
      const { data } = await api.post("/academic-calendar", event);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-calendar"] });
    },
  });
}

export function useDeleteAcademicEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/academic-calendar/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-calendar"] });
    },
  });
}
