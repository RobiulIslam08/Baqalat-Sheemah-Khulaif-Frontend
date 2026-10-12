import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "users";

export function useUsers(params = {}, options = {}) {
  return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => userService.getAll(params), select: (res) => ({ users: res?.data || [], meta: res?.meta || {} }), ...options });
}
export function useRegisterUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => userService.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("User created successfully ✅"); }, onError: (err) => { showError(err, "Failed to create user"); } });
}
export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => userService.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [QUERY_KEY] }); showSuccess("User status updated successfully ✅"); },
    onError: (err) => { showError(err, "Failed to update user status"); },
  });
}
export function useChangePassword() {
  return useMutation({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => { showSuccess("Password changed successfully ✅"); },
    onError: (err) => { showError(err, "Failed to change password"); },
  });
}
