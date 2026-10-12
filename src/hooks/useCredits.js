import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { creditService } from "@/services/credit.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "credits";

export function useSupplierCredits(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, "supplier", params], queryFn: () => creditService.getSupplierCredits(params), select: (res) => ({ credits: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useRecordSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => creditService.recordSupplierPayment(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY, "supplier"] }); showSuccess("Supplier payment recorded ✅"); }, onError: (err) => { showError(err, "Failed to record supplier payment"); } });
}
export function useSettleSupplierInvoice() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => creditService.settleSupplierInvoice(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY, "supplier"] }); showSuccess("Supplier invoice settled ✅"); }, onError: (err) => { showError(err, "Failed to settle invoice"); } });
}
export function useCustomerCredits(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, "customer", params], queryFn: () => creditService.getCustomerCredits(params), select: (res) => ({ credits: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useReceiveCustomerPayment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => creditService.receiveCustomerPayment(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY, "customer"] }); showSuccess("Customer payment received ✅"); }, onError: (err) => { showError(err, "Failed to record customer payment"); } });
}
