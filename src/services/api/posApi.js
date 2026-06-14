import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './globalApi';

// ─── Products ────────────────────────────────────────────────────────────────
export const useProducts = (params = {}) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/products${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
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
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/products/${id}`, data),
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
export const useOrders = (params = {}) =>
  useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/orders${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
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
export const useStaff = () =>
  useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/staff');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

export const useCreateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/staff', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    meta: { successMessage: 'Staff member added' },
  });
};

export const useUpdateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    meta: { successMessage: 'Staff member updated' },
  });
};

export const useDeleteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    meta: { successMessage: 'Staff member removed' },
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
export const useTickets = (params = {}) =>
  useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/tickets${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
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

export const useDashboardReport = (period = '7d') =>
  useQuery({
    queryKey: ['dashboard', 'report', period],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/reports/summary?period=${period}`);
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
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
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/super-admin/businesses${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? { data: [], pagination: {} };
    },
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

export const useSARoles = () =>
  useQuery({
    queryKey: ['sa-roles'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/roles');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

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
    mutationFn: ({ id, ...data }) => apiClient.put(`/super-admin/package-plans/${id}`, data),
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
export const useAdminSettings = () =>
  useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/settings');
      return res?.data ?? res ?? {};
    },
    staleTime: 60_000,
  });

export const useUpdateAdminSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.put('/admin/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
    meta: { successMessage: 'Settings saved' },
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
    mutationFn: ({ id, expiryDate }) => apiClient.put(`/super-admin/businesses/${id}/extend-trial`, { expiryDate }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sa-business', id] });
      qc.invalidateQueries({ queryKey: ['sa-businesses'] });
    },
  });
};

export const useBlockBusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }) => apiClient.put(`/super-admin/businesses/${id}/block`, { blocked }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['sa-business', id] });
      qc.invalidateQueries({ queryKey: ['sa-businesses'] });
    },
  });
};

export const useSAResetBusinessPassword = () =>
  useMutation({
    mutationFn: id => apiClient.post(`/super-admin/businesses/${id}/reset-password`),
  });

// ─── Activity Logs ────────────────────────────────────────────────────────────
export const useActivityLogs = (params = {}) =>
  useQuery({
    queryKey: ['activity-logs', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/admin/activity-logs${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? { data: [], total: 0 };
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

export const useCreateLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/leave', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    meta: { successMessage: 'Leave request submitted' },
  });
};

export const useUpdateLeaveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/leave/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
    meta: { successMessage: 'Leave request updated' },
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

export const useUpdateClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/claims/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['claims'] }),
    meta: { successMessage: 'Claim updated' },
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
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

export const useUpdateJobListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/internal-jobs/${id}`, data),
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
      return res?.data ?? res ?? {};
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
export const useMyAttendance = (params = {}) =>
  useQuery({
    queryKey: ['my-attendance', params],
    queryFn: async () => {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient.get(`/staff/attendance${qs ? `?${qs}` : ''}`);
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useClockIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/staff/attendance/clock-in', data ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
  });
};

export const useClockOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/staff/attendance/clock-out', data ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-attendance'] }),
  });
};

// ─── Staff Personal — My Leave ────────────────────────────────────────────────
export const useMyLeaveRequests = () =>
  useQuery({
    queryKey: ['my-leave'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/leave');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useApplyLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/staff/leave', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leave'] }),
  });
};

export const useCancelLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/staff/leave/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leave'] }),
  });
};

// ─── Staff Personal — My Payslips ─────────────────────────────────────────────
export const useMyPayslips = () =>
  useQuery({
    queryKey: ['my-payslips'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/payslips');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── Staff Personal — My Claims ───────────────────────────────────────────────
export const useMyClaims = () =>
  useQuery({
    queryKey: ['my-claims'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/claims');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useSubmitClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/staff/claims', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-claims'] }),
  });
};

// ─── Staff Personal — My Announcements ───────────────────────────────────────
export const useMyAnnouncements = () =>
  useQuery({
    queryKey: ['my-announcements'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/announcements');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

// ─── Staff Personal — My Tasks ────────────────────────────────────────────────
export const useMyTasks = () =>
  useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/tasks');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useUpdateMyTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/staff/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tasks'] }),
  });
};

// ─── Staff Personal — My Reviews ─────────────────────────────────────────────
export const useMyReviews = () =>
  useQuery({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/reviews');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── Staff Personal — Job Board (Staff view) ──────────────────────────────────
export const useStaffJobBoard = () =>
  useQuery({
    queryKey: ['staff-job-board'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/job-board');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useApplyToJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, ...data }) => apiClient.post(`/staff/job-board/${jobId}/apply`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-job-board'] }),
  });
};

// ─── Staff Personal — My Documents ───────────────────────────────────────────
export const useMyDocuments = () =>
  useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/documents');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

// ─── Staff Personal — My Trainings ───────────────────────────────────────────
export const useMyTrainings = () =>
  useQuery({
    queryKey: ['my-trainings'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/trainings');
      return res?.data ?? res ?? [];
    },
    staleTime: 60_000,
  });

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

// ─── Staff Dashboard (general variant) ───────────────────────────────────────
export const useStaffDashboard = () =>
  useQuery({
    queryKey: ['staff-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/staff/dashboard');
      return res?.data ?? res ?? {};
    },
    staleTime: 30_000,
  });

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
      const res = await apiClient.get('/super-admin/platform-team');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useCreateSAPlatformMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/super-admin/platform-team', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-platform-team'] }),
  });
};

export const useUpdateSAPlatformMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/platform-team/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-platform-team'] }),
  });
};

export const useDeleteSAPlatformMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/super-admin/platform-team/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-platform-team'] }),
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
export const useSAActivityLogs = () =>
  useQuery({
    queryKey: ['sa-activity-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/activity-logs');
      return res?.data ?? res ?? [];
    },
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

// ─── Super Admin: Custom Plans ────────────────────────────────────────────────
export const useSACustomPlans = () =>
  useQuery({
    queryKey: ['sa-custom-plans'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/custom-plans');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useActivateSACustomPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/super-admin/custom-plans/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-custom-plans'] }),
  });
};

export const useWithdrawSACustomPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.patch(`/super-admin/custom-plans/${id}/withdraw`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-custom-plans'] }),
  });
};

// ─── Super Admin: Payment Queue ───────────────────────────────────────────────
export const useSAPaymentQueue = () =>
  useQuery({
    queryKey: ['sa-payment-queue'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/payment-requests');
      return res?.data ?? res ?? [];
    },
    staleTime: 30_000,
  });

export const useApproveSAPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/payment-requests/${id}/approve`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-payment-queue'] }),
  });
};

export const useRejectSAPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/super-admin/payment-requests/${id}/reject`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-payment-queue'] }),
  });
};

// ─── Super Admin: Error Logs ──────────────────────────────────────────────────
export const useSAErrorLogs = () =>
  useQuery({
    queryKey: ['sa-error-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/super-admin/error-logs');
      return res?.data ?? res ?? [];
    },
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

