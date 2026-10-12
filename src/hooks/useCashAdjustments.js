import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashAdjustmentService } from "@/services/cash-adjustment.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "cashAdjustments";

export function useCashAdjustments(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => cashAdjustmentService.getAll(params), select: (res) => ({ adjustments: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useCreateCashAdjustment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => cashAdjustmentService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Cash adjustment posted ✅"); }, onError: (err) => { showError(err, "Failed to post adjustment"); } });
}
