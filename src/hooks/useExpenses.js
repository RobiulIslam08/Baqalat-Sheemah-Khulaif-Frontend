import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "@/services/expense.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "expenses";

export function useExpenses(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => expenseService.getAll(params), select: (res) => ({ expenses: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function usePostExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => expenseService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Expense posted ✅"); }, onError: (err) => { showError(err, "Failed to post expense"); } });
}
export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => expenseService.approve(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Expense approved ✅"); }, onError: (err) => { showError(err, "Failed to approve expense"); } });
}
