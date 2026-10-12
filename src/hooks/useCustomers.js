import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/services/customer.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "customers";

export function useCustomers(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => customerService.getAll(params), select: (res) => ({ customers: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useCustomer(id, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => customerService.getById(id), select: (res) => res?.data, enabled: !!id, ...options });
}
export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => customerService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Customer registered successfully ✅"); }, onError: (err) => { showError(err, "Failed to register customer"); } });
}
export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => customerService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Customer updated ✅"); }, onError: (err) => { showError(err, "Failed to update customer"); } });
}
export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => customerService.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Customer deleted ✅"); }, onError: (err) => { showError(err, "Failed to delete customer"); } });
}
