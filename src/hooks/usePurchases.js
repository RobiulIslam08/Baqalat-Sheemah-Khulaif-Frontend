import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseService } from "@/services/purchase.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "purchases";

export function usePurchases(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => purchaseService.getAll(params), select: (res) => ({ purchases: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function usePurchase(id, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => purchaseService.getById(id), select: (res) => res?.data, enabled: !!id, ...options });
}
export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => purchaseService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); qc.invalidateQueries({ queryKey: ["products"] }); showSuccess("Purchase invoice saved ✅"); },
    onError: (err) => { showError(err, "Failed to save purchase invoice"); },
  });
}
