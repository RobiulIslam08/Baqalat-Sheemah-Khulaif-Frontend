import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "settings";

export function useSettings(options = {}) {
  return useQuery({ queryKey: [QUERY_KEY], queryFn: () => settingsService.get(), select: (res) => res?.data, ...options });
}
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => settingsService.update(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("Settings saved ✅"); }, onError: (err) => { showError(err, "Failed to save settings"); } });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsService.resetDemo(),
    onSuccess: () => {
      qc.invalidateQueries();
      showSuccess("Demo data cleared. Products and your account were kept.");
    },
    onError: (err) => {
      showError(err, "Failed to clear demo data");
    },
  });
}
