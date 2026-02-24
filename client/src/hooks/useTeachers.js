import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

/** Shared query key for institution info (plan, activeMode, setup flags, etc.) */
export const INSTITUTION_INFO_QUERY_KEY = ["institutionInfo"];

export function useInstitutionInfo(options = {}) {
  return useQuery({
    queryKey: INSTITUTION_INFO_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get("/institutions/info");
      return data;
    },
    staleTime: 60000,
    ...options,
  });
}

/**
 * Switch Flex plan active mode. Invalidates all mode-dependent data so UI refetches.
 * Only allowed when plan === "flex" and both school and college setup are complete.
 */
export function useSwitchMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mode) => {
      const { data } = await api.post("/institutions/switch-mode", { mode });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTITUTION_INFO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["institution_settings"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-subjects"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
    },
  });
}


export const useTeachers = () => {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const res = await api.get("/teachers");
      return res.data;
    },
  });
};

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teacher) => {
      const res = await api.post("/teachers", teacher);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
};

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/classes", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}


export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const res = await api.put(`/teachers/${id}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/teachers/${id}`);
    },
    onSuccess: () => {
      // CRITICAL: Invalidate all affected queries after teacher deletion
      // Backend cascade deletion removes teacher from:
      // - TeacherSubject mappings
      // - TeacherClassAssignment mappings
      // - Timetable period assignments
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-subjects"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments"] });
      // Invalidate timetables so timetable builder refetches and removes deleted teacher references
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
    },
  });
};



export const useSubjects = () => {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get("/subjects");
      return res.data;
    },
  });
};

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get("/classes");
      return res.data;
    },
  });
}

export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subject) => {
      const res = await api.post("/subjects", subject);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};


export const useInstitutionSettings = ({ enabled } = {}) => {
  return useQuery({
    queryKey: ["institution_settings"],
    enabled,
    queryFn: async () => {
      const res = await api.get("/institutions/settings");
      return res.data;
    },
  });
};


export const useUpsertInstitutionSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await api.post("/institutions/settings", settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["institution_settings"],
      });
    },
  });
};


export function useClassAssignments(classId) {
  return useQuery({
    queryKey: ["class-assignments", classId],
    queryFn: async () => {
      if (!classId) return [];
      const res = await api.get(`/classes/${classId}/assignments`);
      return res.data;
    },
    enabled: !!classId,
  });
}



export function useAssignTeacherClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/teacher-class-assignments", payload);
      return res.data;
    },

    // 🔥 OPTIMISTIC UPDATE (NO LAG)
    onMutate: async (newAssignment) => {
      await queryClient.cancelQueries({
        queryKey: ["teacher-class-assignments"],
      });

      const previous =
        queryClient.getQueryData(["teacher-class-assignments"]);

      queryClient.setQueryData(
        ["teacher-class-assignments"],
        (old = []) => [
          ...old,
          {
            id: "temp-" + Date.now(), // temporary id
            ...newAssignment,
          },
        ]
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["teacher-class-assignments"],
          context.previous
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-class-assignments"],
      });
    },
  });
}



export const useTeacherSubjects = () => {
  return useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: async () => {
      const res = await api.get("/teacher-subjects");
      return res.data;
    },
  });
};


export const useAssignTeacherSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teacherId, subjectId }) =>
      api.post("/teacher-subjects", { teacherId, subjectId }),

    onMutate: async ({ teacherId, subjectId }) => {
      await queryClient.cancelQueries({ queryKey: ["teacher-subjects"] });

      const previous =
        queryClient.getQueryData(["teacher-subjects"]);

      queryClient.setQueryData(["teacher-subjects"], (old = []) => {
        const exists = old.some(
          (ts) =>
            ts.teacherId === teacherId &&
            ts.subjectId === subjectId
        );

        if (exists) return old;

        return [...old, { teacherId, subjectId }];
      });

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["teacher-subjects"],
          context.previous
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-subjects"] });
    },
  });
};




export const useRemoveTeacherSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teacherId, subjectId }) => {
      await api.delete(`/teacher-subjects/${teacherId}/${subjectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-subjects"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
};





export const useTeacherClassAssignments = () => {
  return useQuery({
    queryKey: ["teacher-class-assignments"],
    queryFn: async () => {
      const res = await api.get("/teacher-class-assignments");
      return res.data;
    },
  });
};


export const useDeleteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
};


export const useRemoveTeacherClassAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/teacher-class-assignments/${id}`);
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["teacher-class-assignments"],
      });

      const previous =
        queryClient.getQueryData(["teacher-class-assignments"]);

      queryClient.setQueryData(
        ["teacher-class-assignments"],
        (old = []) => old.filter((a) => a.id !== id)
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["teacher-class-assignments"],
          context.previous
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-class-assignments"],
      });
    },
  });
};
