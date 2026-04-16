import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: ["leave-requests", "my"],
    queryFn: async () => {
      const { data } = await api.get("/leave-requests/my");
      return data;
    },
  });
}

export function useAllLeaveRequests() {
  return useQuery({
    queryKey: ["leave-requests", "all"],
    queryFn: async () => {
      const { data } = await api.get("/leave-requests");
      return data;
    },
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request) => {
      const { data } = await api.post("/leave-requests", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useReviewLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reviewNotes }) => {
      const { data } = await api.patch(`/leave-requests/${id}/review`, {
        status,
        reviewNotes,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}
