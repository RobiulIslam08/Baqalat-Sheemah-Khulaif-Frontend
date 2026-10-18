import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/services/api";

export function useZatcaDeviceStatus(branchId = "MAIN-BRANCH") {
  return useQuery({
    queryKey: ["zatcaDeviceStatus", branchId],
    queryFn: async () => {
      try {
        const res = await apiGet(`/zatca/device/${branchId}`);
        return res?.data || null;
      } catch (err) {
        if (err?.status === 404) return null;
        throw err;
      }
    },
    staleTime: 30_000,
  });
}

export function useZatcaOnboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiPost("/zatca/onboard", payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["zatcaDeviceStatus", variables?.branchId || "MAIN-BRANCH"] });
      queryClient.invalidateQueries({ queryKey: ["zatcaInvoices"] });
    },
  });
}

export function useZatcaInvoices(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set("page", params.page);
  if (params.limit) queryParams.set("limit", params.limit);
  if (params.status && params.status !== "all") queryParams.set("status", params.status);
  if (params.invoiceType && params.invoiceType !== "all") queryParams.set("invoiceType", params.invoiceType);
  if (params.startDate) queryParams.set("startDate", params.startDate);
  if (params.endDate) queryParams.set("endDate", params.endDate);
  if (params.search) queryParams.set("search", params.search);

  const qs = queryParams.toString();
  const endpoint = `/zatca/invoices${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["zatcaInvoices", params],
    queryFn: async () => {
      const res = await apiGet(endpoint);
      return res?.data || { meta: {}, stats: {}, invoices: [] };
    },
    staleTime: 10_000,
  });
}

export function useZatcaRetryInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId) => apiPost(`/zatca/invoices/retry/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zatcaInvoices"] });
    },
  });
}

export function useZatcaRetryAllInvoices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (branchId = "MAIN-BRANCH") => apiPost(`/zatca/invoices/retry-all?branchId=${branchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zatcaInvoices"] });
    },
  });
}

export function useZatcaHealth(environment = "sandbox") {
  return useQuery({
    queryKey: ["zatcaHealth", environment],
    queryFn: async () => {
      const res = await apiGet(`/zatca/health?environment=${environment}`);
      return res?.data || null;
    },
    staleTime: 60_000,
  });
}
