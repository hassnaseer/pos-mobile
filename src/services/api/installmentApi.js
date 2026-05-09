import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './globalApi';

// Dummy data
const dummyInstallmentsData = [
  {
    in_progress_project_id: 1,
    status: 'in_progress',
    date: '2025-08-19',
    price_on_invoice: '67890',
    id: 1,
    invoice_number: '0102',
    unit_id: 101,
    created_at: '2025-08-01T10:00:00.000Z',
    expires_at: '2025-08-19T23:59:59.000Z',
    client_name: 'Abram Lipshutz',
    client_email: 'pheonix@untitledui.com',
    client_phone: '+234 8122 4948 27',
    project_name: 'Aizel Tower',
    project_address: 'Aizel Tower, Downtown Office',
    total_projects: 120,
    total_payments: 789870,
    remaining_payments: 678540,
    progress_percentage: 30,
  },
  {
    in_progress_project_id: 2,
    status: 'completed',
    date: '2025-07-15',
    price_on_invoice: '67890',
    id: 2,
    invoice_number: '0103',
    unit_id: 102,
    created_at: '2025-07-01T10:00:00.000Z',
    expires_at: '2025-07-15T23:59:59.000Z',
    client_name: 'Jaxon Saris',
    client_email: 'jaxon@gmail.com',
    client_phone: '+971 5 67890',
    project_name: 'Aizel Tower',
    project_address: 'Aizel Tower, Downtown Office',
    total_projects: 80,
    total_payments: 789870,
    remaining_payments: 0,
    progress_percentage: 70,
  },
];

const dummyClientProjects = [
  {
    id: 1,
    project_name: 'Aizel Tower',
    project_address: 'Downtown Office',
    date: '2025-08-19',
    progress_percentage: 30,
  },
  {
    id: 2,
    project_name: 'Downtown Office',
    project_address: 'Downtown Office',
    date: '2025-08-19',
    progress_percentage: 70,
  },
];

const dummyInstallmentPlans = [
  {
    id: 5,
    number: 5,
    date: '2025-09-19',
    status: 'pending',
    amount: 67540,
    invoiceNumber: '0102',
  },
  {
    id: 4,
    number: 4,
    date: '2025-08-19',
    status: 'overdue',
    amount: 67540,
    invoiceNumber: '0102',
  },
  {
    id: 3,
    number: 3,
    date: '2025-07-19',
    status: 'paid',
    amount: 67540,
    invoiceNumber: '0102',
  },
];

// Simulate API delay
const simulateApiDelay = (data, delay = 1000) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

// Installment API endpoints
const INSTALLMENT_ENDPOINTS = {
  GET_ALL_INSTALLMENTS: '/inprogress/',
  SEND_INVOICE: '/installments/',
  INPROGRESS_CLIENT: (clientId) => `/inprogress/client/${clientId}`,
  GET_CLIENT_PROJECTS: (clientId) => `/installments/client/${clientId}/summary`,
  VIEW_INVOICE: (installmentId) => `/clients/view_invoice/${installmentId}`,
  GET_INSTALLMENT_PLAN: (projectId) => `/installments/unit/${projectId}/installments`,
  UPDATE_INSTALLMENT_STATUS: (installmentId) => `/installments/${installmentId}`,
  DELETE_INSTALLMENT: (installmentId) => `/installments/${installmentId}`,
  SEND_INVOICE_EMAIL: (installmentId) => `/installments/${installmentId}/send-invoice`,
};


// API functions
export const installmentApi = {
  getAllInstallments: async (filters = {}) => {
    try {
      return await apiClient.get(INSTALLMENT_ENDPOINTS.GET_ALL_INSTALLMENTS, {
        params: filters,
        skipAuth: false,
      });
    } catch (error) {
      console.log('API not available, using dummy data for installments');
    }
  },

  viewInvoice: async (installmentId) => {
    try {
      return await apiClient.get(INSTALLMENT_ENDPOINTS.VIEW_INVOICE(installmentId), {
        skipAuth: false,
      });
    } catch (error) {
      console.log('API not available, using dummy data for invoice');
      const dummyInvoice = dummyInstallmentsData.find((item) => item.id === installmentId) || dummyInstallmentsData[0];
      return simulateApiDelay(dummyInvoice);
    }
  },

  sendInvoice: async (payload) => {
    try {
      return await apiClient.post(INSTALLMENT_ENDPOINTS.SEND_INVOICE, payload, {
        skipAuth: false,
      });
    } catch (error) {
      console.log('API not available, simulating send invoice');
      throw error
    }
  },

  getClientProjects: async (clientName) => {
    try {
      return await apiClient.get(INSTALLMENT_ENDPOINTS.GET_CLIENT_PROJECTS(clientName), {
        skipAuth: false,
      });
    } catch (error) {
      console.log('API not available, using dummy data for client projects');
      return simulateApiDelay(dummyClientProjects);
    }
  },

  getInstallmentPlan: async (projectId) => {
    try {
      return await apiClient.get(INSTALLMENT_ENDPOINTS.GET_INSTALLMENT_PLAN(projectId), {
        skipAuth: false,
      });
    } catch (error) {
      console.log('API not available, using dummy data for installment plan');
      return simulateApiDelay(dummyInstallmentPlans);
    }
  },

  updateInstallmentStatus: async (installmentId, payload) => {
    try {
      return await apiClient.put(INSTALLMENT_ENDPOINTS.UPDATE_INSTALLMENT_STATUS(installmentId), payload, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Update installment status failed:', error);
      throw error;
    }
  },

  deleteInstallment: async (installmentId) => {
    try {
      return await apiClient.delete(INSTALLMENT_ENDPOINTS.DELETE_INSTALLMENT(installmentId), {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Delete installment failed:', error);
      throw error;
    }
  },

  sendInvoiceEmail: async (installmentId, payload) => {
    try {
      return await apiClient.post(INSTALLMENT_ENDPOINTS.SEND_INVOICE_EMAIL(installmentId), payload, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Send invoice email failed:', error);
      throw error;
    }
  },
};

// React Query hooks
export const useAllInstallments = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['all-installments', filters],
    queryFn: () => installmentApi.getAllInstallments(filters),
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useViewInvoice = (installmentId, options = {}) => {
  return useQuery({
    queryKey: ['view-invoice', installmentId],
    queryFn: () => installmentApi.viewInvoice(installmentId),
    enabled: options.enabled !== undefined ? options.enabled : !!installmentId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};

export const useSendInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: installmentApi.sendInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-installments'] });
    },
    onError: (error) => {
      console.error('Send invoice failed:', error);
    },
  });
};

export const useInProgressClient = (clientId) => {
  return useQuery({
    queryKey: ['inprogress-client', clientId],
    queryFn: () => apiClient.get(INSTALLMENT_ENDPOINTS.INPROGRESS_CLIENT(clientId)),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};

export const useClientProjects = (clientName) => {
  return useQuery({
    queryKey: ['client-projects', clientName],
    queryFn: () => installmentApi.getClientProjects(clientName),
    enabled: !!clientName,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};

export const useInstallmentPlan = (projectId) => {
  return useQuery({
    queryKey: ['installment-plan', projectId],
    queryFn: () => installmentApi.getInstallmentPlan(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};

export const useUpdateInstallmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ installmentId, status }) =>
      installmentApi.updateInstallmentStatus(installmentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-plan'] });
      queryClient.invalidateQueries({ queryKey: ['all-installments'] });
    },
    onError: (error) => {
      console.error('Update installment status failed:', error);
    },
  });
};

export const useDeleteInstallment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (installmentId) => installmentApi.deleteInstallment(installmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-plan'] });
      queryClient.invalidateQueries({ queryKey: ['all-installments'] });
    },
    onError: (error) => {
      console.error('Delete installment failed:', error);
    },
  });
};

export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ installmentId, subject, message }) =>
      installmentApi.sendInvoiceEmail(installmentId, { subject, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installment-plan'] });
      queryClient.invalidateQueries({ queryKey: ['all-installments'] });
    },
    onError: (error) => {
      console.error('Send invoice email failed:', error);
    },
  });
};
