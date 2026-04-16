import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export function useSubstitutions() {
  return useQuery({
    queryKey: ["substitutions"],
    queryFn: async () => {
      const { data } = await api.get("/substitutions");
      return data;
    },
  });
}

export function useCreateSubstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (substitution) => {
      const { data } = await api.post("/substitutions", substitution);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["substitutions"] });
    },
  });
}
