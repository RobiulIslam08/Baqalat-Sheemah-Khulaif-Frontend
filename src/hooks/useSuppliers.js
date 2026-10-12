import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierService } from "@/services/supplier.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "suppliers";

export function useSuppliers(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => supplierService.getAll(params), select: (res) => ({ suppliers: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useSupplier(id, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => supplierService.getById(id), select: (res) => res?.data, enabled: !!id, ...options });
}
export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => supplierService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Supplier registered successfully ✅"); }, onError: (err) => { showError(err, "Failed to register supplier"); } });
}
export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => supplierService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Supplier updated ✅"); }, onError: (err) => { showError(err, "Failed to update supplier"); } });
}
export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => supplierService.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Supplier deleted ✅"); }, onError: (err) => { showError(err, "Failed to delete supplier"); } });
}
