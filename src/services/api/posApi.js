import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Pagination helpers ───────────────────────────────────────────────────────
export const getNextPage = (lastPage) => {
  try {
    if (!lastPage || typeof lastPage !== 'object' || Array.isArray(lastPage)) return undefined;
    if (lastPage.pagination && typeof lastPage.pagination === 'object') {
      const { page, totalPages } = lastPage.pagination;
      if (typeof page === 'number' && typeof totalPages === 'number') {
        return page < totalPages ? page + 1 : undefined;
      }
    }
    const page = typeof lastPage.page === 'number' ? lastPage.page : 1;
    const total = typeof lastPage.total === 'number' ? lastPage.total : 0;
    const limit = typeof lastPage.limit === 'number' ? lastPage.limit : 20;
    const totalPages = typeof lastPage.totalPages === 'number' ? lastPage.totalPages : Math.ceil(total / (limit || 20));
    return page < totalPages ? page + 1 : undefined;
  } catch {
    return undefined;
  }
};

export const flattenPages = (data) =>
  data?.pages?.flatMap(p =>
    Array.isArray(p) ? p :
    Array.isArray(p?.data) ? p.data :
    []
  ) ?? [];
import apiClient from './globalApi';
import { todayDateOnly } from '../../utils/formatDate';

// ─── Products ────────────────────────────────────────────────────────────────
export const useProducts = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/products${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
    enabled,
  });

export const useProductsInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['products-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/admin/products?${qs}`);
      return res?.data ?? res ?? {};
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/products', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    meta: { successMessage: 'Product created' },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    meta: { successMessage: 'Product updated' },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    meta: { successMessage: 'Product deleted' },
  });
};

export const useBulkDeleteProducts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ids => apiClient.delete('/admin/products/bulk', { body: JSON.stringify({ ids }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    meta: { successMessage: 'Products deleted' },
  });
};

export const useImportProducts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rows => apiClient.post('/admin/products/import', { rows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['import-batches'] });
    },
  });
};

export const useImportBatches = module =>
  useQuery({
    queryKey: ['import-batches', module],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/import-batches?module=${module}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useDeleteImportBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/import-batches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import-batches'] }),
  });
};

// ─── Categories ──────────────────────────────────────────────────────────────
export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/categories');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    meta: { successMessage: 'Category created' },
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    meta: { successMessage: 'Category updated' },
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
    meta: { successMessage: 'Category deleted' },
  });
};

// ─── Customers ───────────────────────────────────────────────────────────────
export const useCustomers = (params = {}) =>
  useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/customers${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCustomersInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['customers-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/admin/customers?${qs}`);
      return res?.data ?? res ?? {};
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/customers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
    meta: { successMessage: 'Customer added' },
  });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
    meta: { successMessage: 'Customer updated' },
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
    meta: { successMessage: 'Customer removed' },
  });
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const useOrders = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/orders${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
    enabled,
  });

export const useOrdersInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['orders-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/admin/orders?${qs}`);
      return res?.data ?? res ?? {};
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useOrder = id =>
  useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/orders/${id}`);
      return res?.data ?? res;
    },
    enabled: !!id,
  });

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
    meta: { successMessage: 'Invoice deleted' },
  });
};

// ─── POS Checkout ────────────────────────────────────────────────────────────
export const useCheckout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/pos/checkout', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    meta: { successMessage: 'Sale completed!' },
  });
};

// ─── Staff ───────────────────────────────────────────────────────────────────
export const useStaff = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/staff');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
    enabled,
  });

export const useStaffInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['staff-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/admin/staff?${qs}`);
      return res?.data ?? res ?? {};
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 60_000,
  });

export const useCreateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/staff', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    meta: { successMessage: 'Employee added' },
  });
};

export const useUpdateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    meta: { successMessage: 'Employee updated' },
  });
};

export const useDeleteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    meta: { successMessage: 'Employee removed' },
  });
};

// ─── Custom Roles ────────────────────────────────────────────────────────────
export const useCustomRoles = () =>
  useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/custom-roles');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateCustomRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/custom-roles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles'] }),
    meta: { successMessage: 'Role created' },
  });
};

export const useUpdateCustomRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/custom-roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles'] }),
    meta: { successMessage: 'Role updated' },
  });
};

export const useDeleteCustomRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/custom-roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles'] }),
    meta: { successMessage: 'Role deleted' },
  });
};

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/suppliers');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/suppliers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    meta: { successMessage: 'Supplier added' },
  });
};

export const useUpdateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/suppliers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    meta: { successMessage: 'Supplier updated' },
  });
};

export const useDeleteSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    meta: { successMessage: 'Supplier deleted' },
  });
};

// ─── Manufacturers ───────────────────────────────────────────────────────────
export const useManufacturers = () =>
  useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/manufacturers');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateManufacturer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/manufacturers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }),
    meta: { successMessage: 'Manufacturer added' },
  });
};

export const useUpdateManufacturer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/manufacturers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }),
    meta: { successMessage: 'Manufacturer updated' },
  });
};

export const useDeleteManufacturer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/manufacturers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }),
    meta: { successMessage: 'Manufacturer deleted' },
  });
};

export const useDevices = manufacturerId =>
  useQuery({
    queryKey: ['devices', manufacturerId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/manufacturers/${manufacturerId}/devices`);
      return res?.data ?? res ?? [];
    },
    enabled: !!manufacturerId,
    staleTime: 60_000,
  });

export const useCreateDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ manufacturerId, ...data }) => apiClient.post(`/admin/manufacturers/${manufacturerId}/devices`, data),
    onSuccess: (_, { manufacturerId }) => qc.invalidateQueries({ queryKey: ['devices', manufacturerId] }),
  });
};

export const useUpdateDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, manufacturerId, ...data }) => apiClient.patch(`/admin/manufacturers/devices/${deviceId}`, data),
    onSuccess: (_, { manufacturerId }) => qc.invalidateQueries({ queryKey: ['devices', manufacturerId] }),
  });
};

export const useDeleteDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId }) => apiClient.delete(`/admin/manufacturers/devices/${deviceId}`),
    onSuccess: (_, { manufacturerId }) => qc.invalidateQueries({ queryKey: ['devices', manufacturerId] }),
  });
};

// ─── Device Conditions ───────────────────────────────────────────────────────
export const useDeviceConditions = () =>
  useQuery({
    queryKey: ['device-conditions'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/device-conditions');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateDeviceCondition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/device-conditions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-conditions'] }),
    meta: { successMessage: 'Condition added' },
  });
};

export const useUpdateDeviceCondition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/device-conditions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-conditions'] }),
    meta: { successMessage: 'Condition updated' },
  });
};

export const useDeleteDeviceCondition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/device-conditions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-conditions'] }),
    meta: { successMessage: 'Condition deleted' },
  });
};

// ─── Taxes ───────────────────────────────────────────────────────────────────
export const useTaxes = () =>
  useQuery({
    queryKey: ['taxes'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/taxes');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateTax = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/taxes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
    meta: { successMessage: 'Tax created' },
  });
};

export const useToggleTax = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => apiClient.put(`/admin/taxes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
  });
};

// Generic update alias (PATCH instead of full-field PUT)
export const useUpdateTax = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/taxes/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
  });
};

export const useDeleteTax = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/taxes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
    meta: { successMessage: 'Tax deleted' },
  });
};

// ─── Misc Charges ────────────────────────────────────────────────────────────
export const useMiscCharges = () =>
  useQuery({
    queryKey: ['misc-charges'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/misc-charges');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateMiscCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/misc-charges', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['misc-charges'] }),
    meta: { successMessage: 'Charge added' },
  });
};

export const useUpdateMiscCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/misc-charges/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['misc-charges'] }),
    meta: { successMessage: 'Charge updated' },
  });
};

export const useDeleteMiscCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/misc-charges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['misc-charges'] }),
    meta: { successMessage: 'Charge deleted' },
  });
};

// ─── Tickets ─────────────────────────────────────────────────────────────────
export const useTickets = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/tickets${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
    enabled,
  });

export const useTicketsInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['tickets-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/admin/tickets?${qs}`);
      return res?.data ?? res ?? {};
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useCreateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/tickets', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
    meta: { successMessage: 'Ticket created' },
  });
};

export const useUpdateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/tickets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
    meta: { successMessage: 'Ticket updated' },
  });
};

export const useDeleteTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/tickets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
    meta: { successMessage: 'Ticket deleted' },
  });
};

export const useTicketDetail = (id) =>
  useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/tickets/${id}`);
      return res?.data ?? res ?? null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

// ─── Notifications ───────────────────────────────────────────────────────────
export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      // Backend returns { data: { data: Notification[], total, unreadCount } }
      return res?.data?.data ?? res?.data ?? res ?? [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/reports/dashboard');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

export const useDashboardReport = (period = '7d', { enabled = true } = {}) =>
  useQuery({
    queryKey: ['dashboard', 'report', period],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/reports/summary?period=${period}`);
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
    enabled,
  });

// ─── Reports ─────────────────────────────────────────────────────────────────
export const useSalesReport = (params = {}) =>
  useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/reports/sales${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

export const useStockReport = () =>
  useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/reports/stock');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

// ─── Super Admin ─────────────────────────────────────────────────────────────
export const useSABusinesses = (params = {}) =>
  useQuery({
    queryKey: ['sa-businesses', params],
    queryFn: async () => {
      const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''));
      const qs = new URLSearchParams(clean).toString();
      const res = await apiClient.get(`/super-admin/businesses${qs ? `?${qs}` : ''}`);
      if (Array.isArray(res)) return { data: res, pagination: {} };
      return { data: res?.data ?? [], pagination: res?.pagination ?? {} };
    },
    staleTime: 30_000,
  });

export const useSABusinessesInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['sa-businesses-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const clean = Object.fromEntries(Object.entries({ ...params, page: pageParam, limit: 20 }).filter(([, v]) => v != null && v !== ''));
      const qs = new URLSearchParams(clean).toString();
      const res = await apiClient.get(`/super-admin/businesses?${qs}`);
      if (Array.isArray(res)) return { data: res, pagination: { page: 1, totalPages: 1 } };
      return { data: res?.data ?? [], pagination: res?.pagination ?? { page: pageParam, totalPages: 1 } };
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useSABusinessTypes = () =>
  useQuery({
    queryKey: ['sa-business-types'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/business-types');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateSABusinessType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/business-types', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-business-types'] }),
  });
};

export const useUpdateSABusinessType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/business-types/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-business-types'] }),
  });
};

export const useDeleteSABusinessType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/business-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-business-types'] }),
  });
};

export const useSARoles = (params = {}) =>
  useQuery({
    queryKey: ['sa-roles', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/super-admin/roles${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateSARole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/roles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-roles'] }),
  });
};

export const useUpdateSARole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-roles'] }),
  });
};

export const useDeleteSARole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-roles'] }),
  });
};

export const useSAPackagePlans = () =>
  useQuery({
    queryKey: ['sa-package-plans'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/package-plans');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useSARevenueReports = (params = {}) =>
  useQuery({
    queryKey: ['sa-revenue-reports', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/super-admin/revenue-reports${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

export const useSADashboard = (params = {}) =>
  useQuery({
    queryKey: ['sa-dashboard', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/super-admin/dashboard${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

export const useSAPlatformSettings = () =>
  useQuery({
    queryKey: ['sa-platform-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/platform-settings');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useUpdateSAPlatformSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }) => apiClient.put(`/super-admin/platform-settings/${id}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-platform-settings'] }),
  });
};

// ─── SA Package Plans ─────────────────────────────────────────────────────────
export const useCreateSAPackagePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/package-plans', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-package-plans'] }),
  });
};

export const useUpdateSAPackagePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/package-plans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-package-plans'] }),
  });
};

export const useDeleteSAPackagePlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/package-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-package-plans'] }),
  });
};

// ─── SA Legal Pages ───────────────────────────────────────────────────────────
export const useSALegalPage = type =>
  useQuery({
    queryKey: ['sa-legal', type],
    queryFn: async () => {
      const res = await apiClient.get(`/super-admin/legal/${type}`);
      return res?.data ?? res ?? { content: '' };
    },
    staleTime: 60_000,
  });

export const useUpdateSALegalPage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, content }) => apiClient.put(`/super-admin/legal/${type}`, { content }),
    onSuccess: (_, { type }) => qc.invalidateQueries({ queryKey: ['sa-legal', type] }),
  });
};

// ─── Admin Branches (My Businesses) ──────────────────────────────────────────
export const useAdminBranches = () =>
  useQuery({
    queryKey: ['admin-branches'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/branches');
      return res?.data ?? res ?? { main: null, branches: [] };
    },
    staleTime: 30_000,
  });

export const useCreateBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/branches', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-branches'] }),
  });
};

export const useUpdateBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/branches/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-branches'] }),
  });
};

export const useDeleteBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-branches'] }),
  });
};

// ─── User Profile ─────────────────────────────────────────────────────────────
export const useProfile = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get('/user/profile');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.patch('/user/profile', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
    meta: { successMessage: 'Profile updated' },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: data => apiClient.patch('/user/change-password', data),
    meta: { successMessage: 'Password changed' },
  });

// Re-fetch current user profile (used to sync permissions on foreground)
export const useMyProfile = () =>
  useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/user/profile');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

// ─── Admin Settings ───────────────────────────────────────────────────────────
export const useAdminSettings = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/settings');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
    enabled,
  });

export const useUpdateAdminSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.patch('/admin/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
    meta: { successMessage: 'Settings saved' },
  });
};

export const useUpdateAdminProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.patch('/admin/settings/profile', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
    meta: { successMessage: 'Settings saved' },
  });
};

// ─── Invoice Template ─────────────────────────────────────────────────────────
export const useInvoiceTemplate = () =>
  useQuery({
    queryKey: ['invoice-template'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/invoice-template');
      return r?.data?.config ?? r?.config ?? {};
    },
    staleTime: 60_000,
  });

export const useUpdateInvoiceTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cfg => apiClient.put('/admin/invoice-template', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice-template'] }),
  });
};

// ─── Payslip Template ─────────────────────────────────────────────────────────
export const usePayslipTemplate = () =>
  useQuery({
    queryKey: ['payslip-template'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/payslip-template');
      return r?.data?.config ?? r?.config ?? {};
    },
    staleTime: 60_000,
  });

export const useUpdatePayslipTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cfg => apiClient.put('/admin/payslip-template', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payslip-template'] }),
  });
};

// ─── Rent Invoice Template (Real Estate) ───────────────────────────────────────
export const useRentInvoiceTemplate = () =>
  useQuery({
    queryKey: ['rent-invoice-template'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/real-estate/rent-invoice-template');
      return r?.data?.config ?? r?.config ?? {};
    },
    staleTime: 60_000,
  });

export const useUpdateRentInvoiceTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cfg => apiClient.put('/admin/real-estate/rent-invoice-template', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rent-invoice-template'] }),
  });
};

// ─── Gaming Ticket Template ─────────────────────────────────────────────────────
export const useGamingTicketTemplate = () =>
  useQuery({
    queryKey: ['gaming-ticket-template'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/gaming-ticket-template');
      return r?.data?.config ?? r?.config ?? {};
    },
    staleTime: 60_000,
  });

export const useUpdateGamingTicketTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cfg => apiClient.put('/admin/gaming-ticket-template', cfg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gaming-ticket-template'] }),
  });
};

// ─── Email Templates ────────────────────────────────────────────────────────────
export const useEmailTemplates = () =>
  useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/email-templates');
      return r?.data ?? r ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateEmailTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/email-templates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
    meta: { successMessage: 'Template created' },
  });
};

export const useUpdateEmailTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/email-templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
    meta: { successMessage: 'Template updated' },
  });
};

export const useDeleteEmailTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/email-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
    meta: { successMessage: 'Template deleted' },
  });
};

// ─── Email Accounts ─────────────────────────────────────────────────────────────
export const useEmailAccounts = () =>
  useQuery({
    queryKey: ['email-accounts'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/email-accounts');
      return r?.data ?? r ?? [];
    },
    staleTime: 15_000,
  });

export const useConnectSmtpAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/email-accounts/smtp', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-accounts'] }),
    meta: { successMessage: 'Email account connected' },
  });
};

export const useDeleteEmailAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/email-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-accounts'] }),
    meta: { successMessage: 'Account removed' },
  });
};

export const useSetDefaultEmailAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.post(`/admin/email-accounts/${id}/set-default`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-accounts'] }),
    meta: { successMessage: 'Default account set' },
  });
};

// ─── Email Inbox (threads / messages / reply) ────────────────────────────────────
export const useEmailThreads = () =>
  useQuery({
    queryKey: ['email-threads'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/email-inbox/threads');
      return r?.data ?? r ?? [];
    },
    staleTime: 15_000,
  });

export const useThreadMessages = threadKey =>
  useQuery({
    queryKey: ['email-thread', threadKey],
    enabled: !!threadKey,
    queryFn: async () => {
      const r = await apiClient.get(`/admin/email-inbox/threads/${encodeURIComponent(threadKey)}`);
      return r?.data ?? r ?? [];
    },
  });

export const useSendThreadReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadKey, ...data }) =>
      apiClient.post(`/admin/email-inbox/threads/${encodeURIComponent(threadKey)}/reply`, data),
    onSuccess: (_r, { threadKey }) => {
      qc.invalidateQueries({ queryKey: ['email-thread', threadKey] });
      qc.invalidateQueries({ queryKey: ['email-threads'] });
    },
    meta: { successMessage: 'Reply sent' },
  });
};

// ─── Client Portal (role: project-client) ────────────────────────────────────────
export const useClientDashboard = () =>
  useQuery({
    queryKey: ['client-dashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/client/dashboard');
      return r?.data ?? r ?? null;
    },
    staleTime: 30_000,
  });

export const useClientProjects = (params = {}) =>
  useQuery({
    queryKey: ['client-projects', params],
    queryFn: async () => {
      const qs = params.startDate || params.endDate
        ? `?${new URLSearchParams({
            ...(params.startDate ? { startDate: params.startDate } : {}),
            ...(params.endDate ? { endDate: params.endDate } : {}),
          }).toString()}`
        : '';
      const r = await apiClient.get(`/client/projects${qs}`);
      return r?.data ?? r ?? [];
    },
    staleTime: 30_000,
  });

export const useClientProject = id =>
  useQuery({
    queryKey: ['client-project', id],
    enabled: !!id,
    queryFn: async () => {
      const r = await apiClient.get(`/client/projects/${id}`);
      return r?.data ?? r ?? null;
    },
  });

export const useClientInvoices = () =>
  useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      const r = await apiClient.get('/client/invoices');
      return r?.data ?? r ?? [];
    },
    staleTime: 20_000,
  });

export const useSubmitClientProof = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, proofUrl }) => apiClient.patch(`/client/invoices/${invoiceId}/submit-proof`, { proofUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-invoices'] }),
    meta: { successMessage: 'Payment proof submitted' },
  });
};

// ─── SA Business Detail ───────────────────────────────────────────────────────
export const useSABusinessDetail = id =>
  useQuery({
    queryKey: ['sa-business', id],
    queryFn: async () => {
      const res = await apiClient.get(`/super-admin/businesses/${id}`);
      return res?.data ?? res ?? {};
    },
    enabled: !!id,
    staleTime: 30_000,
  });

export const useExtendBusinessTrial = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expiryDate }) => apiClient.patch(`/super-admin/businesses/${id}`, { expiryDate }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sa-business', id] });
      qc.invalidateQueries({ queryKey: ['sa-businesses'] });
    },
  });
};

export const useBlockBusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }) => apiClient.patch(`/super-admin/businesses/${id}`, { status: blocked ? 'Blocked' : 'Active' }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sa-business', id] });
      qc.invalidateQueries({ queryKey: ['sa-businesses'] });
    },
  });
};

export const useGrantBusinessSlots = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, slotType, slotsCount }) =>
      apiClient.patch(`/super-admin/businesses/${id}/grant-slots`, { slotType, slotsCount }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sa-business', id] });
      qc.invalidateQueries({ queryKey: ['sa-business-stats', id] });
    },
  });
};

export const useCreateSABusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/businesses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-businesses'] }),
  });
};

export const useUpdateSABusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/businesses/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sa-businesses'] });
      qc.invalidateQueries({ queryKey: ['sa-business', id] });
    },
  });
};

export const useDeleteSABusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/businesses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-businesses'] }),
  });
};

export const useSABusinessStats = id =>
  useQuery({
    queryKey: ['sa-business-stats', id],
    queryFn: async () => {
      const res = await apiClient.get(`/super-admin/businesses/${id}/stats`);
      return res?.data ?? res ?? {};
    },
    enabled: !!id,
    staleTime: 30_000,
  });

export const useSABusinessStaff = id =>
  useQuery({
    queryKey: ['sa-business-staff', id],
    queryFn: async () => {
      const res = await apiClient.get(`/super-admin/businesses/${id}/staff`);
      return res?.data ?? res ?? [];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

export const useSABusinessSubscriptions = id =>
  useQuery({
    queryKey: ['sa-business-subs', id],
    queryFn: async () => {
      const res = await apiClient.get(`/super-admin/businesses/${id}/subscriptions`);
      return res?.data ?? res ?? [];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

export const useSAPermissions = () =>
  useQuery({
    queryKey: ['sa-permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/permissions');
      return res?.data ?? res ?? [];
    },
    staleTime: 300_000,
  });

// ─── Activity Logs ────────────────────────────────────────────────────────────
export const useActivityLogs = (params = {}) =>
  useQuery({
    queryKey: ['activity-logs', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/activity-log${qs ? `?${qs}` : ''}`);
      // Backend returns: { status, data: { data: [...], pagination: {...} } }
      const inner = res?.data ?? res ?? {};
      return {
        data:       inner?.data        ?? [],
        pagination: inner?.pagination  ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    },
    staleTime: 30_000,
  });

// ─── HRMS Dashboard ───────────────────────────────────────────────────────────
export const useHRMSDashboard = () =>
  useQuery({
    queryKey: ['hrms-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/hrms/dashboard');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

export const useHRMSAttendanceTrend = () =>
  useQuery({
    queryKey: ['hrms-attendance-trend'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/hrms/attendance-trend');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useInternalChatDirectory = () =>
  useQuery({
    queryKey: ['internal-chat-directory'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/internal-chat/directory');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useHRMSUpcomingEvents = () =>
  useQuery({
    queryKey: ['hrms-upcoming-events'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/attendance/upcoming-events');
      return res?.data ?? res ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const useMyLeaveQuotaUsage = () =>
  useQuery({
    queryKey: ['my-leave-quota-usage'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/leave-quotas/my-usage');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useHRMSOrgChart = () =>
  useQuery({
    queryKey: ['hrms-org-chart'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/hrms/org-chart');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── HRMS Staff Profile (designation, shift timing, reports-to, employee type…) ─
export const useHRMSStaffProfile = id =>
  useQuery({
    queryKey: ['hrms-staff-profile', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/hrms/staff/${id}`);
      return res?.data ?? res ?? {};
    },
    enabled: !!id,
  });

export const useUpdateHRMSStaffProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/hrms/staff/${id}`, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['hrms-staff-profile', id] });
      qc.invalidateQueries({ queryKey: ['staff-inf'] });
    },
    meta: { successMessage: 'HRMS profile saved' },
  });
};

// ─── Leave ────────────────────────────────────────────────────────────────────
export const useLeaveRequests = (params = {}) =>
  useQuery({
    queryKey: ['leave-requests', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/leave${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

// "Add Leave for Staff" (admin picks a staff member and adds leave on their behalf —
// distinct from the self-service /admin/leave POST, which always applies for the caller).
export const useCreateLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/leave/add-for-staff', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    meta: { successMessage: 'Leave added for staff' },
  });
};

export const useApproveLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }) => apiClient.patch(`/admin/leave/${id}/approve`, { adminNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    meta: { successMessage: 'Leave approved' },
  });
};

export const useRejectLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }) => apiClient.patch(`/admin/leave/${id}/reject`, { adminNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    meta: { successMessage: 'Leave rejected' },
  });
};

export const useDeleteLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/leave/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    meta: { successMessage: 'Leave request deleted' },
  });
};

// ─── Claims ───────────────────────────────────────────────────────────────────
export const useClaims = (params = {}) =>
  useQuery({
    queryKey: ['claims', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/claims${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/claims', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
    meta: { successMessage: 'Claim submitted' },
  });
};

export const useApproveClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }) => apiClient.patch(`/admin/claims/${id}/approve`, { adminNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
    meta: { successMessage: 'Claim approved' },
  });
};

export const useRejectClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }) => apiClient.patch(`/admin/claims/${id}/reject`, { adminNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
    meta: { successMessage: 'Claim rejected' },
  });
};

export const useDeleteClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/claims/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
    meta: { successMessage: 'Claim deleted' },
  });
};

// ─── Expense Categories ───────────────────────────────────────────────────────
export const useExpenseCategories = () =>
  useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => { const res = await apiClient.get('/admin/expense-categories'); return res?.data ?? res ?? []; },
    staleTime: 60_000,
  });

export const useCreateExpenseCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/expense-categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-categories'] }),
    meta: { successMessage: 'Category created' },
  });
};

export const useUpdateExpenseCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/expense-categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-categories'] }),
    meta: { successMessage: 'Category updated' },
  });
};

export const useDeleteExpenseCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/expense-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-categories'] }),
    meta: { successMessage: 'Category deleted' },
  });
};

// ─── Project Marketplaces ─────────────────────────────────────────────────────
export const useProjectMarketplaces = () =>
  useQuery({
    queryKey: ['project-marketplaces'],
    queryFn: async () => { const res = await apiClient.get('/admin/project-marketplaces'); return res?.data ?? res ?? []; },
    staleTime: 60_000,
  });

export const useCreateProjectMarketplace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/project-marketplaces', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-marketplaces'] }),
    meta: { successMessage: 'Marketplace created' },
  });
};

export const useUpdateProjectMarketplace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/project-marketplaces/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-marketplaces'] }),
    meta: { successMessage: 'Marketplace updated' },
  });
};

export const useDeleteProjectMarketplace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/project-marketplaces/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-marketplaces'] }),
    meta: { successMessage: 'Marketplace deleted' },
  });
};

// ─── Vendor Dashboard ─────────────────────────────────────────────────────────
export const useVendorDashboard = () =>
  useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: async () => { const res = await apiClient.get('/admin/vendor/dashboard'); return res?.data ?? res ?? null; },
    staleTime: 30_000,
  });

// ─── Rider (Delivery) ─────────────────────────────────────────────────────────
export const useRiderDashboard = () =>
  useQuery({
    queryKey: ['rider-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/vendor/rider/dashboard');
      return res?.data ?? res ?? { assigned: 0, outForDelivery: 0, delivered: 0, total: 0 };
    },
    staleTime: 30_000,
  });

export const useMyDeliveries = () =>
  useQuery({
    queryKey: ['rider-deliveries'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/vendor/rider/deliveries');
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

export const useMarkPickedUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderId => apiClient.patch(`/admin/vendor/rider/orders/${orderId}/pickup`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rider-deliveries'] });
      qc.invalidateQueries({ queryKey: ['rider-dashboard'] });
    },
    meta: { successMessage: 'Order marked as picked up' },
  });
};

export const useMarkDelivered = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, ...data }) => apiClient.patch(`/admin/vendor/rider/orders/${orderId}/deliver`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rider-deliveries'] });
      qc.invalidateQueries({ queryKey: ['rider-dashboard'] });
    },
    meta: { successMessage: 'Order marked as delivered' },
  });
};

// ─── Fines ────────────────────────────────────────────────────────────────────
export const useFines = (params = {}) =>
  useQuery({
    queryKey: ['fines', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/fines${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateFine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/fines', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fines'] }),
    meta: { successMessage: 'Fine applied' },
  });
};

export const useUpdateFine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/fines/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fines'] }),
    meta: { successMessage: 'Fine updated' },
  });
};

export const useDeleteFine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/fines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fines'] }),
    meta: { successMessage: 'Fine deleted' },
  });
};

// ─── Salary Advances ──────────────────────────────────────────────────────────
export const useSalaryAdvances = (params = {}) =>
  useQuery({
    queryKey: ['salary-advances', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/salary-advances${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateSalaryAdvance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/salary-advances', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-advances'] }),
    meta: { successMessage: 'Salary advance added' },
  });
};

export const useUpdateSalaryAdvance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/salary-advances/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-advances'] }),
    meta: { successMessage: 'Salary advance updated' },
  });
};

export const useDeleteSalaryAdvance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/salary-advances/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salary-advances'] }),
    meta: { successMessage: 'Salary advance deleted' },
  });
};

// ─── Announcements ────────────────────────────────────────────────────────────
export const useAnnouncements = (params = {}) =>
  useQuery({
    queryKey: ['announcements', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/announcements${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/announcements', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
    meta: { successMessage: 'Announcement published' },
  });
};

export const useUpdateAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/announcements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
    meta: { successMessage: 'Announcement updated' },
  });
};

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
    meta: { successMessage: 'Announcement deleted' },
  });
};

// ─── Payroll ──────────────────────────────────────────────────────────────────
export const usePayrollRuns = () =>
  useQuery({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/payroll/runs');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useRunPayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/payroll/run', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-all-slips'] });
    },
  });
};

export const useDeletePayrollRun = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/payroll/runs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
};

export const usePayrollSlips = (runId) =>
  useQuery({
    queryKey: ['payroll-slips', runId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/payroll/runs/${runId}/slips`);
      return res?.data ?? res ?? [];
    },
    enabled: !!runId,
    staleTime: 60_000,
  });

// Cross-run, filterable slip listing — powers the per-employee payslip list (unlike
// usePayrollSlips above, which is scoped to one run id).
export const useAllPayrollSlips = (filters = {}) =>
  useQuery({
    queryKey: ['payroll-all-slips', filters],
    queryFn: async () => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')),
      ).toString();
      const res = await apiClient.get(`/admin/payroll/slips${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

// Computes a payslip's numbers without persisting anything — lets the admin review before
// clicking Generate (useRunPayroll, above).
export const usePreviewPayslip = () =>
  useMutation({
    mutationFn: data => apiClient.post('/admin/payroll/preview', data),
  });

export const usePayroll = (params = {}) =>
  useQuery({
    queryKey: ['payroll', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/payroll${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useProcessPayroll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/payroll/process', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });
};

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const useTasks = (params = {}) =>
  useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/tasks${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/tasks', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};

// ─── Reviews (Annual) ─────────────────────────────────────────────────────────
export const useReviews = (params = {}) =>
  useQuery({
    queryKey: ['reviews', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/reviews${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/reviews', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
};

export const useUpdateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/reviews/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
};

// ─── Job Board (Internal Jobs) ────────────────────────────────────────────────
export const useJobListings = (params = {}) =>
  useQuery({
    queryKey: ['job-listings', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/internal-jobs${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateJobListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/internal-jobs', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-listings'] }),
  });
};

export const useDeleteJobListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/internal-jobs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-listings'] }),
  });
};

// ─── HR Documents ─────────────────────────────────────────────────────────────
export const useHRDocuments = (params = {}) =>
  useQuery({
    queryKey: ['hr-documents', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/hr-documents${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateHRDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/hr-documents', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-documents'] }),
  });
};

export const useDeleteHRDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/hr-documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-documents'] }),
  });
};

// ─── Trainings ────────────────────────────────────────────────────────────────
export const useTrainings = (params = {}) =>
  useQuery({
    queryKey: ['trainings', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/trainings${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/trainings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
};

export const useUpdateTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/trainings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
};

export const useDeleteTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/trainings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings'] }),
  });
};

// ─── Vendor / Marketplace ─────────────────────────────────────────────────────
export const useMarketplace = (params = {}) =>
  useQuery({
    queryKey: ['marketplace', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/vendor/marketplace${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useVendorOrders = (params = {}) =>
  useQuery({
    queryKey: ['vendor-orders', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/vendor/orders/mine${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useVendorProfile = () =>
  useQuery({
    queryKey: ['vendor-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/vendor-profile');
      return res?.data !== undefined ? res.data : (res ?? null);
    },
    staleTime: 60_000,
  });

export const useUpdateVendorProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.put('/admin/vendor-profile', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-profile'] }),
  });
};

export const useVendorListings = (params = {}) =>
  useQuery({
    queryKey: ['vendor-listings', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/vendor/listings${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateVendorListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/vendor/listings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-listings'] }),
  });
};

export const useUpdateVendorListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/vendor/listings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-listings'] }),
  });
};

export const useDeleteVendorListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/vendor/listings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-listings'] }),
  });
};

export const useIncomingOrders = (params = {}) =>
  useQuery({
    queryKey: ['incoming-orders', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/vendor/orders/incoming${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateIncomingOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, ...data }) => apiClient.patch(`/admin/vendor/orders/${id}/status`, { status, ...data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incoming-orders'] }),
    meta: { successMessage: 'Order status updated' },
  });
};

export const useAssignRiderToOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, riderId }) => apiClient.patch(`/admin/vendor/orders/${id}/assign`, { riderId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incoming-orders'] }),
    meta: { successMessage: 'Rider assigned successfully' },
  });
};

// ─── Appointment Types (Medical) ──────────────────────────────────────────────
export const useAppointmentTypes = () =>
  useQuery({
    queryKey: ['appointment-types'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/medical/appointment-types');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateAppointmentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/medical/appointment-types', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-types'] }),
  });
};

export const useUpdateAppointmentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/appointment-types/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-types'] }),
  });
};

export const useDeleteAppointmentType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/appointment-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointment-types'] }),
  });
};

// ─── Factory Connections ──────────────────────────────────────────────────────
export const useFactoryConnections = () =>
  useQuery({
    queryKey: ['factory-connections'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/factory/connections');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateFactoryConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/factory/connections/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factory-connections'] }),
  });
};

// ─── Pharmacy Connections ─────────────────────────────────────────────────────
export const usePharmacyConnections = () =>
  useQuery({
    queryKey: ['pharmacy-connections'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/pharmacy/connections');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdatePharmacyConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/pharmacy/connections/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-connections'] }),
  });
};

// ─── Departments ──────────────────────────────────────────────────────────────
export const useDepartments = () =>
  useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/departments');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/departments', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

export const useUpdateDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/departments/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

export const useDeleteDepartment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
};

// ─── Staff Personal — My Attendance ──────────────────────────────────────────
// NOTE: self-service attendance lives on the same /admin/attendance endpoints as
// admin management — the backend scopes clock-in/out and history to the caller.
export const useMyAttendance = (params = {}) =>
  useQuery({
    queryKey: ['my-attendance', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/attendance/history${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useClockIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/attendance/clock-in', { ...data, clientDate: todayDateOnly() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
  });
};

export const useClockOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/attendance/clock-out', { ...data, clientDate: todayDateOnly() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
  });
};

export const useBreakStart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/admin/attendance/break-start', { clientDate: todayDateOnly() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
  });
};

export const useBreakEnd = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/admin/attendance/break-end', { clientDate: todayDateOnly() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
  });
};

// ─── Staff Personal — My Leave ────────────────────────────────────────────────
// NOTE: self-service leave lives on the same /admin/leave endpoints as admin
// management — the backend scopes GET to the caller's own records, and POST
// always applies for the caller (res.locals.user), regardless of role.
export const useMyLeaveRequests = (statusFilter = '') =>
  useInfiniteQuery({
    queryKey: ['my-leave-inf', statusFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ page: pageParam, limit: 10, ...(statusFilter ? { status: statusFilter } : {}) }).toString();
      const res = await apiClient.get(`/admin/leave?${qs}`);
      return { data: res?.data ?? [], total: res?.total ?? 0, statusCounts: res?.statusCounts ?? {}, page: pageParam, limit: 10 };
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useApplyLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/leave', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leave'] }),
  });
};

export const useMyLeaveUsage = () =>
  useQuery({
    queryKey: ['my-leave-usage'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/leave-quotas/my-usage');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

// ─── Staff Personal — My Payslips ─────────────────────────────────────────────
export const useMyPayslips = (month, year) =>
  useQuery({
    queryKey: ['my-payslips', month, year],
    queryFn: async () => {
      const qs = new URLSearchParams({ ...(month ? { month } : {}), ...(year ? { year } : {}) }).toString();
      const res = await apiClient.get(`/admin/payroll/my-slips${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── Staff Personal — My Claims ───────────────────────────────────────────────
// NOTE: self-service claims live on the same /admin/claims endpoints as admin
// management — the backend scopes GET/POST to the caller when not an admin.
export const useMyClaims = () =>
  useQuery({
    queryKey: ['my-claims'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/claims');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useSubmitClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/claims', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-claims'] }),
  });
};

// ─── Staff Personal — My Announcements ───────────────────────────────────────
export const useMyAnnouncements = () =>
  useQuery({
    queryKey: ['my-announcements'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/announcements');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

// ─── Staff Personal — My Tasks ────────────────────────────────────────────────
export const useMyTasks = () =>
  useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/tasks');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateMyTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/admin/tasks/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tasks'] }),
  });
};

// ─── Staff Personal — My Reviews ─────────────────────────────────────────────
export const useMyReviews = () =>
  useQuery({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/reviews');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── Staff Personal — Job Board (Staff view) ──────────────────────────────────
export const useStaffJobBoard = () =>
  useQuery({
    queryKey: ['staff-job-board'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/internal-jobs');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useApplyToJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, ...data }) => apiClient.post(`/admin/internal-jobs/${jobId}/apply`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-job-board'] }),
  });
};

// ─── Staff Personal — My Documents ───────────────────────────────────────────
export const useMyDocuments = () =>
  useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/hr-documents');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── Staff Personal — My Trainings ────────────────────────────────────────────
// Full catalog + the caller's own enrollment records, matching
// frontend/src/store/employee/trainingsSlice.ts's fetchTrainings exactly.
export const useMyTrainings = () =>
  useQuery({
    queryKey: ['my-trainings'],
    queryFn: async () => {
      const [tRes, eRes] = await Promise.all([
        apiClient.get('/admin/trainings'),
        apiClient.get('/admin/trainings/my-enrollments').catch(() => null),
      ]);
      const trainings = tRes?.data ?? tRes ?? [];
      const enrolledIds = (eRes?.data ?? eRes ?? [])
        .map(e => e.training?.id)
        .filter(Boolean);
      return { trainings, enrolledIds };
    },
    staleTime: 60_000,
  });

export const useEnrollTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.post(`/admin/trainings/${id}/enroll`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-trainings'] }),
  });
};

export const useUnenrollTraining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/trainings/${id}/unenroll`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-trainings'] }),
  });
};

// ─── Ticket Statuses ─────────────────────────────────────────────────────────
export const useTicketStatuses = () =>
  useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/ticket-statuses');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/ticket-statuses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-statuses'] }),
  });
};

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/ticket-statuses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-statuses'] }),
  });
};

export const useDeleteTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/ticket-statuses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket-statuses'] }),
  });
};

// ─── Claim Categories ────────────────────────────────────────────────────────
export const useClaimCategories = () =>
  useQuery({
    queryKey: ['claim-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/claim-categories');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateClaimCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/claim-categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claim-categories'] }),
  });
};

export const useUpdateClaimCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/claim-categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claim-categories'] }),
  });
};

export const useDeleteClaimCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/claim-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claim-categories'] }),
  });
};

// ─── Leave Quotas ────────────────────────────────────────────────────────────
export const useLeaveQuotas = () =>
  useQuery({
    queryKey: ['leave-quotas'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/leave-quotas');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateLeaveQuota = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/leave-quotas', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-quotas'] }),
  });
};

export const useUpdateLeaveQuota = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/leave-quotas/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-quotas'] }),
  });
};

export const useDeleteLeaveQuota = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/leave-quotas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-quotas'] }),
  });
};

// ─── Document Categories ─────────────────────────────────────────────────────
export const useDocumentCategories = () =>
  useQuery({
    queryKey: ['document-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/document-categories');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateDocumentCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/document-categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-categories'] }),
  });
};

export const useDeleteDocumentCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/document-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-categories'] }),
  });
};

// ─── Fingerprint Devices ─────────────────────────────────────────────────────
export const useFingerprintDevices = () =>
  useQuery({
    queryKey: ['fingerprint-devices'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/fingerprint-devices');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateFingerprintDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/fingerprint-devices', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fingerprint-devices'] }),
  });
};

export const useUpdateFingerprintDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/fingerprint-devices/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fingerprint-devices'] }),
  });
};

export const useDeleteFingerprintDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/fingerprint-devices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fingerprint-devices'] }),
  });
};

export const useSyncFingerprintDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.post(`/admin/fingerprint-devices/${id}/sync`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fingerprint-devices'] }),
  });
};

export const useFingerprintStaffMappings = deviceId =>
  useQuery({
    queryKey: ['fingerprint-mappings', deviceId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/fingerprint-devices/${deviceId}/mappings`);
      return res?.data ?? res ?? [];
    },
    enabled: !!deviceId,
    staleTime: 30_000,
  });

export const useUpsertFingerprintMapping = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, ...data }) => apiClient.post(`/admin/fingerprint-devices/${deviceId}/mappings`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['fingerprint-mappings', vars.deviceId] }),
  });
};

// ─── Medical Staff Checkin (admin manual checkin) ─────────────────────────────
export const useMedicalStaffCheckins = (date) =>
  useQuery({
    queryKey: ['medical-staff-checkins', date],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/attendance/staff?date=${date}`);
      return res?.data ?? res ?? [];
    },
    enabled: !!date,
    staleTime: 30_000,
  });

export const useCreateMedicalCheckin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/attendance/staff', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-staff-checkins'] }),
  });
};

export const useUpdateMedicalCheckin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/attendance/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-staff-checkins'] }),
  });
};

export const useDeleteMedicalCheckin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/attendance/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-staff-checkins'] }),
  });
};

export const useStaffList = () =>
  useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/staff?limit=200');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── Staff Dashboard (general variant) ────────────────────────────────────────
// NOTE: there's no single aggregate endpoint — built by combining three calls,
// matching frontend/src/store/employee/staffDashboardSlice.ts. Unlike web (which fires
// all three unconditionally), each call here is gated behind the matching permission —
// a plain staff member with none of these should never even attempt them.
export const useStaffDashboard = (isTechnician = false, perms = {}) => {
  const { canViewOrders = false, canManageProducts = false, canCreateTickets = false } = perms;
  return useQuery({
    queryKey: ['staff-dashboard', isTechnician, canViewOrders, canManageProducts, canCreateTickets],
    queryFn: async () => {
      const calls = [
        canViewOrders ? apiClient.get('/admin/orders?page=1&limit=5').catch(() => null) : Promise.resolve(null),
        canManageProducts ? apiClient.get('/admin/products?limit=100').catch(() => null) : Promise.resolve(null),
        canCreateTickets
          ? (isTechnician
              ? apiClient.get('/admin/tickets?limit=20&status=In Progress').catch(() => null)
              : apiClient.get('/admin/tickets?limit=1&status=New').catch(() => null))
          : Promise.resolve(null),
        (canCreateTickets && isTechnician) ? apiClient.get('/admin/tickets?limit=1&status=New').catch(() => null) : Promise.resolve(null),
      ];
      const [ordRes, prodRes, firstRes, secondRes] = await Promise.all(calls);

      const orders = ordRes?.data ?? [];
      const todayOrdersCount = ordRes?.total ?? 0;
      const allProducts = prodRes?.data ?? [];
      const lowStockProducts = allProducts
        .filter(p => p.stock <= (p.lowStockThreshold ?? 10))
        .slice(0, 4);

      let tickets = [];
      let openTicketsCount = 0;
      if (isTechnician) {
        tickets = firstRes?.data ?? [];
        openTicketsCount = secondRes?.total ?? 0;
      } else {
        openTicketsCount = firstRes?.total ?? 0;
      }

      return { orders, tickets, lowStockProducts, openTicketsCount, todayOrdersCount };
    },
    staleTime: 30_000,
  });
};

// ─── Super Admin: Vendors ─────────────────────────────────────────────────────
export const useSAVendors = () =>
  useQuery({
    queryKey: ['sa-vendors'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/vendors');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateSAVendorStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, suspensionReason }) =>
      apiClient.patch(`/super-admin/vendors/${id}/status`, { status, suspensionReason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-vendors'] }),
  });
};

// ─── Super Admin: Demo Requests ───────────────────────────────────────────────
export const useSADemoRequests = (status = '') =>
  useQuery({
    queryKey: ['sa-demo-requests', status],
    queryFn: async () => {
      const qs = status ? `?status=${status}` : '';
      const res = await apiClient.get(`/super-admin/demo-requests${qs}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateSADemoStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => apiClient.patch(`/super-admin/demo-requests/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-demo-requests'] }),
  });
};

// ─── Super Admin: Platform Team ───────────────────────────────────────────────
export const useSAPlatformTeam = () =>
  useQuery({
    queryKey: ['sa-platform-team'],
    queryFn: async () => {
      const res = await apiClient.get('/support/staff');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateSAPlatformMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/support/staff', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-platform-team'] }),
  });
};

export const useUpdateSAPlatformMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/support/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-platform-team'] }),
  });
};

export const useDeleteSAPlatformMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/support/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-platform-team'] }),
  });
};

export const useCreateSACustomPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/custom-plans', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-custom-plans-inf'] }),
  });
};

export const useUpdateSACustomPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/custom-plans/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-custom-plans-inf'] }),
  });
};

// ─── Super Admin: Documents ───────────────────────────────────────────────────
export const useSADocuments = () =>
  useQuery({
    queryKey: ['sa-documents'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/documents');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateSADocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/documents', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-documents'] }),
  });
};

export const useUpdateSADocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/documents/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-documents'] }),
  });
};

export const useDeleteSADocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-documents'] }),
  });
};

// ─── Super Admin: Activity Logs ───────────────────────────────────────────────
export const useSAActivityLogs = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['sa-activity-logs-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 30 }).toString();
      const res = await apiClient.get(`/activity-log?${qs}`);
      const inner = res?.data ?? res;
      return {
        data: Array.isArray(inner) ? inner : (inner?.data ?? []),
        pagination: inner?.pagination ?? { page: pageParam, totalPages: Math.ceil((inner?.total ?? 0) / 30) },
      };
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 60_000,
  });

// ─── Super Admin: Learn Guides ────────────────────────────────────────────────
export const useSALearnGuides = () =>
  useQuery({
    queryKey: ['sa-learn-guides'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/learn-guides');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useUpsertSALearnGuide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, ...data }) => apiClient.put(`/super-admin/learn-guides/${key}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-learn-guides'] }),
  });
};

export const useCreateSALearnGuide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/learn-guides', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-learn-guides'] }),
  });
};

// ─── Super Admin: Business Categories ────────────────────────────────────────
export const useSABusinessCategories = () =>
  useQuery({
    queryKey: ['sa-business-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/business-categories');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateSABusinessCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/business-categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-business-categories'] }),
  });
};

export const useUpdateSABusinessCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/business-categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-business-categories'] }),
  });
};

export const useDeleteSABusinessCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/business-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-business-categories'] }),
  });
};

// ─── Super Admin: Support Tickets ────────────────────────────────────────────
export const useSASupportTickets = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['sa-support-tickets-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/support/tickets?${qs}`);
      const d = res?.data ?? res;
      return { data: Array.isArray(d) ? d : (d?.data ?? []), pagination: d?.pagination ?? { page: pageParam, totalPages: 1 } };
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useUpdateSASupportTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/support/tickets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-support-tickets-inf'] }),
  });
};

export const useDeleteSASupportTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/support/tickets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-support-tickets-inf'] }),
  });
};

export const useCreateSASupportTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/support/tickets', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-support-tickets-inf'] }),
  });
};

// ─── Super Admin: Custom Plans ────────────────────────────────────────────────
export const useSACustomPlans = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['sa-custom-plans-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/super-admin/custom-plans?${qs}`);
      const d = res?.data ?? res;
      return { data: Array.isArray(d) ? d : (d?.data ?? []), pagination: d?.pagination ?? { page: pageParam, totalPages: 1 } };
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useActivateSACustomPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/super-admin/custom-plans/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-custom-plans-inf'] }),
  });
};

export const useWithdrawSACustomPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/super-admin/custom-plans/${id}/withdraw`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-custom-plans-inf'] }),
  });
};

// ─── Super Admin: Payment Queue ───────────────────────────────────────────────
export const useSAPaymentQueue = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['sa-payment-queue-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/super-admin/payment-requests?${qs}`);
      const d = res?.data ?? res;
      return { data: Array.isArray(d) ? d : (d?.data ?? []), pagination: d?.pagination ?? { page: pageParam, totalPages: 1 } };
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useReviewSAPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/super-admin/payment-requests/${id}/review`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-payment-queue-inf'] }),
  });
};

export const useApproveSAPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/payment-requests/${id}/approve`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-payment-queue-inf'] }),
  });
};

export const useRejectSAPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/payment-requests/${id}/reject`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-payment-queue-inf'] }),
  });
};

// ─── Super Admin: Error Logs ──────────────────────────────────────────────────
export const useSAErrorLogs = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['sa-error-logs-inf', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/super-admin/error-logs?${qs}`);
      const d = res?.data ?? res;
      return { data: Array.isArray(d) ? d : (d?.data ?? []), pagination: res?.pagination ?? { page: pageParam, totalPages: 1 } };
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

// ─── Admin Medical: Reminders ─────────────────────────────────────────────────
export const useMedicalReminders = (patientId = '', status = '') =>
  useQuery({
    queryKey: ['medical-reminders', patientId, status],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (patientId) p.set('patientId', patientId);
      if (status) p.set('status', status);
      const res = await apiClient.get(`/admin/medical/reminders${p.toString() ? `?${p}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateMedicalReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/medical/reminders', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-reminders'] }),
  });
};

export const useUpdateMedicalReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/reminders/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-reminders'] }),
  });
};

export const useDeleteMedicalReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/reminders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-reminders'] }),
  });
};

// ─── Admin Medical: Insurance ─────────────────────────────────────────────────
export const useMedicalInsurance = (patientId = '') =>
  useQuery({
    queryKey: ['medical-insurance', patientId],
    queryFn: async () => {
      const p = patientId ? `?patientId=${patientId}` : '';
      const res = await apiClient.get(`/admin/medical/insurance${p}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateMedicalInsurance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/medical/insurance', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-insurance'] }),
  });
};

export const useUpdateMedicalInsurance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/insurance/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-insurance'] }),
  });
};

export const useDeleteMedicalInsurance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/insurance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-insurance'] }),
  });
};

// ─── Admin Medical: Patients list ────────────────────────────────────────────
export const usePatientsList = () =>
  useQuery({
    queryKey: ['medical-patients'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/medical/patients');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useMedicalPatientsInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['medical-patients', 'infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 20 }).toString();
      const res = await apiClient.get(`/admin/medical/patients?${qs}`);
      return res?.data ?? res ?? {};
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

export const useMedicalAppointmentsInfinite = (params = {}) =>
  useInfiniteQuery({
    queryKey: ['medical-appointments', 'infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ ...params, page: pageParam, limit: 15 }).toString();
      const res = await apiClient.get(`/admin/medical/appointments?${qs}`);
      return res?.data ?? res ?? {};
    },
    getNextPageParam: getNextPage,
    initialPageParam: 1,
    staleTime: 30_000,
  });

// ─── Admin Medical: Patient Visits (Tracking) ─────────────────────────────────
export const usePatientVisits = patientId =>
  useQuery({
    queryKey: ['patient-visits', patientId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/medical/patients/${patientId}/visits`);
      return res?.data ?? res ?? [];
    },
    enabled: !!patientId,
    staleTime: 30_000,
  });

export const useCreatePatientVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, ...data }) => apiClient.post(`/admin/medical/patients/${patientId}/visits`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-visits'] }),
  });
};

export const useUpdatePatientVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/visits/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-visits'] }),
  });
};

// ─── Super Admin: Bank Accounts ───────────────────────────────────────────────
export const useSABankAccounts = () =>
  useQuery({
    queryKey: ['sa-bank-accounts'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/bank-accounts');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateSABankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/bank-accounts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-bank-accounts'] }),
  });
};

export const useUpdateSABankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/bank-accounts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-bank-accounts'] }),
  });
};

export const useDeleteSABankAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/bank-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-bank-accounts'] }),
  });
};

// ─── Gaming Tickets ───────────────────────────────────────────────────────────
// Rate presets are mainly configured on web Settings, but can also be added inline
// from the mobile create-ticket form (mirrors the same "add new" pattern web has).
export const useGamingTicketRates = () =>
  useQuery({
    queryKey: ['gaming-ticket-rates'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/gaming-ticket-rates');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateGamingTicketRate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/gaming-ticket-rates', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gaming-ticket-rates'] }),
    meta: { successMessage: 'Rate added' },
  });
};

export const useDeleteGamingTicketRate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/gaming-ticket-rates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gaming-ticket-rates'] }),
    meta: { successMessage: 'Rate deleted' },
  });
};

// ─── Real Estate: Property Options (property_type | purpose | furnishing) ────────
export const usePropertyOptions = listType =>
  useQuery({
    queryKey: ['re-property-options', listType],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/property-options?listType=${listType}`);
      return res?.data ?? res ?? [];
    },
    enabled: !!listType,
    staleTime: 30_000,
  });

export const useCreatePropertyOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/property-options', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-property-options'] }),
    meta: { successMessage: 'Option added' },
  });
};

export const useDeletePropertyOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/real-estate/property-options/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-property-options'] }),
    meta: { successMessage: 'Option deleted' },
  });
};

export const useGamingTickets = (params = {}) =>
  useQuery({
    queryKey: ['gaming-tickets', params],
    queryFn: async () => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      ).toString();
      const res = await apiClient.get(`/admin/gaming-tickets${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 10_000,
  });

export const useCreateGamingTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/gaming-tickets', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gaming-tickets'] }),
    meta: { successMessage: 'Gaming ticket created' },
  });
};

// ─── Real Estate ───────────────────────────────────────────────────────────────
// Permission-gated module (any business can enable it) — 7 sub-modules:
// Properties/Units, Leads, Deals, Leases, Rent Invoices, Maintenance, Viewings.
// Reuses useCustomers/useCreateCustomer (Customers section above) and
// useStaff (Staff section above) rather than duplicating agent/tenant pickers.

const cleanParams = params =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ''));

// ── Properties & Units ──────────────────────────────────────────────────────
export const useREProperties = (params = {}) =>
  useQuery({
    queryKey: ['re-properties', params],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams(params)).toString();
      const res = await apiClient.get(`/admin/real-estate/properties${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useREProperty = id =>
  useQuery({
    queryKey: ['re-property', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/properties/${id}`);
      return res?.data ?? res ?? null;
    },
    staleTime: 15_000,
    enabled: !!id,
  });

export const useCreateREProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/properties', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-properties'] }),
    meta: { successMessage: 'Property created' },
  });
};

export const useUpdateREProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/properties/${id}`, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['re-properties'] });
      qc.invalidateQueries({ queryKey: ['re-property', id] });
    },
    meta: { successMessage: 'Property updated' },
  });
};

export const useDeleteREProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/real-estate/properties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-properties'] }),
    meta: { successMessage: 'Property deleted' },
  });
};

export const useREPropertyUnits = propertyId =>
  useQuery({
    queryKey: ['re-property-units', propertyId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/properties/${propertyId}/units`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
    enabled: !!propertyId,
  });

export const useCreateREUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, ...data }) => apiClient.post(`/admin/real-estate/properties/${propertyId}/units`, data),
    onSuccess: (_res, { propertyId }) => {
      qc.invalidateQueries({ queryKey: ['re-property-units', propertyId] });
      qc.invalidateQueries({ queryKey: ['re-property', propertyId] });
      qc.invalidateQueries({ queryKey: ['re-properties'] });
    },
    meta: { successMessage: 'Unit added' },
  });
};

export const useUpdateREUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/units/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-property-units'] });
      qc.invalidateQueries({ queryKey: ['re-properties'] });
    },
    meta: { successMessage: 'Unit updated' },
  });
};

export const useDeleteREUnit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/real-estate/units/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-property-units'] });
      qc.invalidateQueries({ queryKey: ['re-properties'] });
    },
    meta: { successMessage: 'Unit deleted' },
  });
};

export const useAddREPropertyImage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, ...data }) => apiClient.post(`/admin/real-estate/properties/${propertyId}/images`, data),
    onSuccess: (_res, { propertyId }) => qc.invalidateQueries({ queryKey: ['re-property', propertyId] }),
    meta: { successMessage: 'Image added' },
  });
};

// Lightweight picker used by Deals/Leases/Viewings/Maintenance screens.
export const useREUnitLookup = (search = '') =>
  useQuery({
    queryKey: ['re-unit-lookup', search],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams({ search })).toString();
      const res = await apiClient.get(`/admin/real-estate/unit-lookup${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

// ── Leads / CRM ──────────────────────────────────────────────────────────────
export const useRELeads = (params = {}) =>
  useQuery({
    queryKey: ['re-leads', params],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams(params)).toString();
      const res = await apiClient.get(`/admin/real-estate/leads${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

export const useRELead = id =>
  useQuery({
    queryKey: ['re-lead', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/leads/${id}`);
      return res?.data ?? res ?? null;
    },
    staleTime: 15_000,
    enabled: !!id,
  });

export const useRELeadsDashboard = () =>
  useQuery({
    queryKey: ['re-leads-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/real-estate/leads/dashboard');
      return res?.data ?? res ?? null;
    },
    staleTime: 15_000,
  });

export const useCreateRELead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/leads', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-leads'] }),
    meta: { successMessage: 'Lead created' },
  });
};

export const useUpdateRELead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/leads/${id}`, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['re-leads'] });
      qc.invalidateQueries({ queryKey: ['re-lead', id] });
    },
    meta: { successMessage: 'Lead updated' },
  });
};

export const useConvertRELead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.post(`/admin/real-estate/leads/${id}/convert`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-leads'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    meta: { successMessage: 'Lead converted to customer' },
  });
};

// ── Deals & Pipeline ─────────────────────────────────────────────────────────
export const useREDealColumns = () =>
  useQuery({
    queryKey: ['re-deal-columns'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/real-estate/deal-columns');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useREDeals = (params = {}) =>
  useQuery({
    queryKey: ['re-deals', params],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams(params)).toString();
      const res = await apiClient.get(`/admin/real-estate/deals${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

export const useCreateREDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/deals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-deals'] }),
    meta: { successMessage: 'Deal created' },
  });
};

export const useMoveREDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/deals/${id}/move`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-deals'] }),
    meta: { successMessage: 'Deal moved' },
  });
};

export const useCreateLeaseFromDeal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.post(`/admin/real-estate/deals/${id}/create-lease`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['re-deals'] });
      qc.invalidateQueries({ queryKey: ['re-leases'] });
    },
    meta: { successMessage: 'Lease finalized' },
  });
};

// ── Leases ───────────────────────────────────────────────────────────────────
export const useRELeases = (params = {}) =>
  useQuery({
    queryKey: ['re-leases', params],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams(params)).toString();
      const res = await apiClient.get(`/admin/real-estate/leases${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

export const useRELease = id =>
  useQuery({
    queryKey: ['re-lease', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/leases/${id}`);
      return res?.data ?? res ?? null;
    },
    staleTime: 15_000,
    enabled: !!id,
  });

export const useCreateRELease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/leases', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-leases'] }),
    meta: { successMessage: 'Lease created' },
  });
};

export const useRenewRELease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.post(`/admin/real-estate/leases/${id}/renew`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-leases'] }),
    meta: { successMessage: 'Lease renewed' },
  });
};

export const useTerminateRELease = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.post(`/admin/real-estate/leases/${id}/terminate`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-leases'] }),
    meta: { successMessage: 'Lease terminated' },
  });
};

// Sub-action off the Leases screen only (not its own permission) — gated server-side
// by manage_re_leases OR manage_re_deals.
export const useCreateRESignatureRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/signature-requests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-leases'] }),
    meta: { successMessage: 'Signature request sent' },
  });
};

// ── Rent Collection ──────────────────────────────────────────────────────────
export const useRERentInvoices = (params = {}) =>
  useQuery({
    queryKey: ['re-rent-invoices', params],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams(params)).toString();
      const res = await apiClient.get(`/admin/real-estate/rent-invoices${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

export const useRERentInvoice = id =>
  useQuery({
    queryKey: ['re-rent-invoice', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/rent-invoices/${id}`);
      return res?.data ?? res ?? null;
    },
    staleTime: 15_000,
    enabled: !!id,
  });

export const useMarkRERentInvoicePaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/rent-invoices/${id}/mark-paid`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-rent-invoices'] }),
    meta: { successMessage: 'Invoice marked as paid' },
  });
};

export const useCancelRERentInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/admin/real-estate/rent-invoices/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-rent-invoices'] }),
    meta: { successMessage: 'Invoice cancelled' },
  });
};

// ── Maintenance Requests ─────────────────────────────────────────────────────
export const useREMaintenanceRequests = (params = {}) =>
  useQuery({
    queryKey: ['re-maintenance', params],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams(params)).toString();
      const res = await apiClient.get(`/admin/real-estate/maintenance-requests${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

export const useREMaintenanceRequest = id =>
  useQuery({
    queryKey: ['re-maintenance-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/maintenance-requests/${id}`);
      return res?.data ?? res ?? null;
    },
    staleTime: 15_000,
    enabled: !!id,
  });

export const useCreateREMaintenanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/maintenance-requests', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-maintenance'] }),
    meta: { successMessage: 'Maintenance request logged' },
  });
};

export const useUpdateREMaintenanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/maintenance-requests/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-maintenance'] }),
    meta: { successMessage: 'Maintenance request updated' },
  });
};

export const useAssignREMaintenanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/maintenance-requests/${id}/assign`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-maintenance'] }),
    meta: { successMessage: 'Request assigned' },
  });
};

export const useResolveREMaintenanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/maintenance-requests/${id}/resolve`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-maintenance'] }),
    meta: { successMessage: 'Request resolved' },
  });
};

// ── Property Viewings ────────────────────────────────────────────────────────
export const useREViewings = (params = {}) =>
  useQuery({
    queryKey: ['re-viewings', params],
    queryFn: async () => {
      const qs = new URLSearchParams(cleanParams(params)).toString();
      const res = await apiClient.get(`/admin/real-estate/viewings${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 15_000,
  });

export const useREViewing = id =>
  useQuery({
    queryKey: ['re-viewing', id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/real-estate/viewings/${id}`);
      return res?.data ?? res ?? null;
    },
    staleTime: 15_000,
    enabled: !!id,
  });

export const useCreateREViewing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/real-estate/viewings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-viewings'] }),
    meta: { successMessage: 'Viewing scheduled' },
  });
};

export const useCompleteREViewing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/real-estate/viewings/${id}/complete`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['re-viewings'] }),
    meta: { successMessage: 'Viewing updated' },
  });
};

