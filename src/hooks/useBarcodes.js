import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { barcodeService } from "@/services/barcode.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "barcodeJobs";

export function useBarcodeJobs(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => barcodeService.getJobs(params), select: (res) => ({ jobs: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useGenerateBarcode() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => barcodeService.generate(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Barcode labels generated ✅"); }, onError: (err) => { showError(err, "Failed to generate barcodes"); } });
}
