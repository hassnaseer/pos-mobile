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
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/products/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
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
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
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
  });
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/customers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
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
  });
};

export const useUpdateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.put(`/admin/staff/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
};

export const useDeleteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/staff/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
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
  });
};

export const useDeleteCustomRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/custom-roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-roles'] }),
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
  });
};

export const useUpdateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/suppliers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useDeleteSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
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
  });
};

export const useUpdateManufacturer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/manufacturers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }),
  });
};

export const useDeleteManufacturer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/manufacturers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }),
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
  });
};

export const useUpdateDeviceCondition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/device-conditions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-conditions'] }),
  });
};

export const useDeleteDeviceCondition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/device-conditions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-conditions'] }),
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
  });
};

export const useToggleTax = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => apiClient.put(`/admin/taxes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
  });
};

export const useDeleteTax = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/taxes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
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
  });
};

export const useUpdateMiscCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/misc-charges/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['misc-charges'] }),
  });
};

export const useDeleteMiscCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/misc-charges/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['misc-charges'] }),
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
  });
};

export const useUpdateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/tickets/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
};

export const useDeleteTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/tickets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
};

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
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: data => apiClient.patch('/user/change-password', data),
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
