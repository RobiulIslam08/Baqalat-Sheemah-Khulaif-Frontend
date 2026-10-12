import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productSupplierService } from "@/services/product-supplier.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "productSuppliers";

export function useProductSuppliers(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => productSupplierService.getAll(params), select: (res) => ({ links: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useCreateProductSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => productSupplierService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Product-Supplier linked ✅"); }, onError: (err) => { showError(err, "Failed to link supplier"); } });
}
