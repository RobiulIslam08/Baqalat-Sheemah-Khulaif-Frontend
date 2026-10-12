/**
 * useProducts Hook
 * React Query hooks for product CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/product.service";
import { showSuccess, showError } from "@/lib/toast-helpers";

const QUERY_KEY = "products";

/** Fetch all products with optional filters. */
export function useProducts(params = {}, options = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => productService.getAll(params),
    select: (res) => ({
      products: res?.data || [],
      meta: res?.meta || {},
    }),
    ...options,
  });
}

/** Fetch a single product by ID. */
export function useProduct(id, options = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => productService.getById(id),
    select: (res) => res?.data,
    enabled: !!id,
    ...options,
  });
}

/** Create a new product. */
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => productService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      showSuccess("Product created successfully ✅");
    },
    onError: (err) => {
      showError(err, "Failed to create product");
    },
  });
}

/** Update a product by ID. */
export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      showSuccess("Product updated successfully ✅");
    },
    onError: (err) => {
      showError(err, "Failed to update product");
    },
  });
}

/** Delete a product by ID. */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => productService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      showSuccess("Product deleted successfully ✅");
    },
    onError: (err) => {
      showError(err, "Failed to delete product");
    },
  });
}
