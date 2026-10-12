import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formulationService } from "@/services/formulation.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "formulations";

export function useFormulations(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => formulationService.getAll(params), select: (res) => ({ formulations: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useCreateFormulation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => formulationService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Formulation saved ✅"); }, onError: (err) => { showError(err, "Failed to save formulation"); } });
}
export function useUpdateFormulation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => formulationService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Formulation updated ✅"); }, onError: (err) => { showError(err, "Failed to update formulation"); } });
}
export function useDeleteFormulation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => formulationService.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Formulation deleted ✅"); }, onError: (err) => { showError(err, "Failed to delete formulation"); } });
}
