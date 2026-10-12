import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockService } from "@/services/stock.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "stock";

export function useStock(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => stockService.getStock(params), select: (res) => ({ stock: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useStockReturns(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, "returns", params], queryFn: () => stockService.getReturns(params), select: (res) => ({ returns: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useProcessStockReturn() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => stockService.processReturn(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); qc.invalidateQueries({ queryKey: ["products"] }); showSuccess("Stock return processed ✅"); }, onError: (err) => { showError(err, "Failed to process stock return"); } });
}
export function useProcessStockCorrection() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => stockService.processCorrection(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); qc.invalidateQueries({ queryKey: ["products"] }); showSuccess("Stock correction applied ✅"); }, onError: (err) => { showError(err, "Failed to apply stock correction"); } });
}
