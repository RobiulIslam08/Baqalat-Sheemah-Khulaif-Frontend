import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productLinkService } from "@/services/product-link.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "productLinks";

export function useProductLinks(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => productLinkService.getAll(params), select: (res) => ({ links: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useCreateProductLink() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => productLinkService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Product linked successfully ✅"); }, onError: (err) => { showError(err, "Failed to link product"); } });
}
