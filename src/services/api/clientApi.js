import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './globalApi';
import {
  dummyConstructionUpdates,
  dummyUpcomingProjects,
  dummyNotifications,
  dummyInstallments,
} from './dummyData';
import { useAuth } from '../../context/AuthContext';
useAuth;
// Simulate API delay
const simulateApiDelay = (data, delay = 1000) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
};

// Client API endpoints
const CLIENT_ENDPOINTS = {
  //Construction Updates
  CONSTRUCTION_UPDATES: '/clients/inprogress',
  CONSTRUCTION_UPDATES_ID: id => `/clients/project/${id}`,
  CONSTRUCTION_WEEK_ID: id => `/clients/construction_updates/${id}`,
  CONSTRUCTION_UPDATES_DETAILS: id => `/construction-updates/${id}`,
  //Upcoming projects
  UPCOMING_PROJECTS: '/upcoming-projects/get-all-upcoming-projects',
  CREATE_UPCOMING_PROJECT: '/upcoming-projects/create-upcoming-project',
  DELETE_UPCOMING_PROJECT: '/upcoming-projects/delete-upcoming-project',

  //Installement module
  CLIENT_SUMMARY: '/clients/installments/summary',
  // INSTALLMENTS: '/clients/inprogress',
  CLIENT_SUMMARY_ID: id => `/clients/installments/project/${id}`,
  //Inventory/Units module
  GET_ALL_UNITS: '/projects/get-all-units/',
  GET_ALL_UNITS_DROPDOWN: id => `/projects/${id}`,
  CREATE_UNIT: '/projects/units/',
  UPDATE_UNIT: id => `/projects/units/${id}`,
  DELETE_UNIT: id => `/projects/units/${id}`,
  //Clients module
  GET_ALL_CLIENTS: '/clients/get-all-clients',
  CREATE_CLIENT: '/clients/create-client',
  UPDATE_CLIENT: id => `/clients/update-client/${id}`,
  DELETE_CLIENT: id => `/clients/delete-client/${id}`,
  //Sales Offers module
  GET_ALL_SALES_OFFERS: '/sales-offers/all',
  ASSIGN_SALES_OFFER: id => `/sales-offers/assign/${id}`,
  DECLINE_SALES_OFFER: id => `/sales-offers/${id}`,
  //Notifications
  CLIENT_NOTIFFICATIONS: '/clients/notifications',
  ADMIN_NOTIFFICATIONS: '/users/notifications',
  MARK_NOTIFICATION_READ: id => `/notifications/${id}/mark-read`,
  //FCM Token
};
// API functions
export const clientApi = {
  getConstructionUpdates: async () => {
    try {
      // Try to fetch from API first
      console.log(
        'making api call here',
        CLIENT_ENDPOINTS.CONSTRUCTION_UPDATES,
      );

      return await apiClient.get(CLIENT_ENDPOINTS.CONSTRUCTION_UPDATES, {
        skipAuth: false,
      });
    } catch (error) {
      // If API fails, return dummy data
      console.log(
        'API not available, using dummy data for construction updates',
      );
      return [];
    }
  },
  getConsturctionUpdatesById: async inprogressId => {
    try {
      const url = CLIENT_ENDPOINTS.CONSTRUCTION_UPDATES_ID(inprogressId);
      return await apiClient.get(url, { skipAuth: false });
    } catch (error) {
      console.log(
        'API not available, using dummy data for construction updates',
        error,
      );
      return [];
    }
  },
  getConsturctionUpdatesByWeek: async update_id => {
    console.log('📡 Starting fetch for ID:', update_id);

    try {
      const url = CLIENT_ENDPOINTS.CONSTRUCTION_WEEK_ID(update_id);
      console.log('📍 URL:', url);

      const response = await apiClient.get(url, { skipAuth: false });

      console.log('✅ Response received:', response);
      console.log('✅ Response type:', typeof response);
      console.log(
        '✅ Response keys:',
        response ? Object.keys(response) : 'null',
      );

      return response;
    } catch (error) {
      console.error('❌ Error in getConsturctionUpdatesById:', error);
      throw error; // Re-throw instead of returning []
    }
  },
  getUpcomingProjects: async () => {
    try {
      return await apiClient.get(CLIENT_ENDPOINTS.UPCOMING_PROJECTS, {
        skipAuth: false,
      });
    } catch (error) {
      console.log('API not available, using dummy data for upcoming projects');
      // return simulateApiDelay(dummyUpcomingProjects);
    }
  },

  getNotifications: async userRole => {
    try {
      // Normalize & trim role
      const role =
        typeof userRole === 'string'
          ? userRole.trim().toLowerCase()
          : userRole?.role?.trim?.().toLowerCase?.() || 'client';

      //Support multiple admin-like roles
      const isAdmin = ['admin', 'superadmin', 'manager', 'salesagent'].includes(
        role,
      );

      // Select endpoint based on role type
      const endpoint = isAdmin
        ? CLIENT_ENDPOINTS.ADMIN_NOTIFFICATIONS
        : CLIENT_ENDPOINTS.CLIENT_NOTIFFICATIONS;


      // Make the API call
      const response = await apiClient.get(endpoint, { skipAuth: false });
      return response;
    } catch (error) {
      console.log(
        '❌ API not available, using dummy data for notifications',
        error,
      );
    }
  },
  //MARK as READ
  markReadNotification: async id => {
    try {
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.MARK_NOTIFICATION_READ(id),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return response;
    } catch (error) {
      console.error('Mark as read failed:', error);
      throw error;
    }
  },

  //get client summary
  getCilentSummary: async () => {
    try {
      return await apiClient.get(CLIENT_ENDPOINTS.CLIENT_SUMMARY);
    } catch (error) {
      console.log('API not available, using dummy data for installments');
      return simulateApiDelay(dummyInstallments);
    }
  },
  getInstallmentsById: async inprogressId => {
    try {
      console.log('Fetching installment details for ID:', inprogressId);
      const url = CLIENT_ENDPOINTS.CLIENT_SUMMARY_ID(inprogressId);
      return await apiClient.get(url, { skipAuth: false });
    } catch (error) {
      console.log(
        'API not available, using dummy data for construction updates',
        error,
      );
      return [];
    }
  },

  registerInterest: async formData => {
    try {
      console.log('registerInterest', formData);
      return await apiClient.post(CLIENT_ENDPOINTS.REGISTER_INTEREST, formData);
    } catch (error) {
      console.log('API not available, simulating successful registration');
      return simulateApiDelay(
        { success: true, message: 'Interest registered successfully' },
        2000,
      );
    }
  },

  // markNotificationRead: async notificationId => {
  //   try {
  //     return await apiClient.post(
  //       `${CLIENT_ENDPOINTS.MARK_NOTIFICATION_READ}/${notificationId}`,
  //     );
  //   } catch (error) {
  //     console.log('API not available, simulating mark as read');
  //     return simulateApiDelay({ success: true });
  //   }
  // },

  createUpcomingProject: async formData => {
    try {
      console.log('createUpcomingProject', formData);
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.CREATE_UPCOMING_PROJECT,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        },
      );
      return response;
    } catch (error) {
      console.error('Create upcoming project failed:', error);
      throw error;
    }
  },
  deleteUpcomingProject: async projectId => {
    try {
      return await apiClient.delete(
        `${CLIENT_ENDPOINTS.DELETE_UPCOMING_PROJECT}/${projectId}`,
      );
    } catch (error) {
      console.log('API not available, simulating upcoming project deletion');
      return simulateApiDelay({
        success: true,
        message: 'Upcoming Project deleted successfully',
      });
    }
  },
  // Units/Inventory API functions
  getAllUnits: async () => {
    try {
      return await apiClient.get(CLIENT_ENDPOINTS.GET_ALL_UNITS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all units failed:', error);
      throw error;
    }
  },

  getAllUnitsDropdwon: async selectedProjectId => {
    try {
      const url = CLIENT_ENDPOINTS.GET_ALL_UNITS_DROPDOWN(selectedProjectId);
      
      const response =  await apiClient.get(url, {
        skipAuth: false,
      });
      console.log(response, 'response');
      return response;
    } catch (error) {
      console.error('Get all units failed:', error);
      throw error;
    }
  },

  createUnit: async formData => {
    try {
      console.log(formData, 'formData');
      const response = await apiClient.request(CLIENT_ENDPOINTS.CREATE_UNIT, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      return response;
    } catch (error) {
      console.error('Create unit failed:', error);
      throw error;
    }
  },

  updateUnit: async (unitId, formData) => {
    try {
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.UPDATE_UNIT(unitId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        },
      );
      return response;
    } catch (error) {
      console.error('Update unit failed:', error);
      throw error;
    }
  },

  deleteUnit: async unitId => {
    try {
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.DELETE_UNIT(unitId),
        {
          method: 'DELETE',
        },
      );
      return response;
    } catch (error) {
      console.error('Delete unit failed:', error);
      throw error;
    }
  },

  // Clients API functions
  getAllClients: async () => {
    try {
      return await apiClient.get(CLIENT_ENDPOINTS.GET_ALL_CLIENTS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all clients failed:', error);
      throw error;
    }
  },

  createClient: async data => {
    try {
      const response = await apiClient.request(CLIENT_ENDPOINTS.CREATE_CLIENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response;
    } catch (error) {
      console.error('Create client failed:', error);
      throw error;
    }
  },

  updateClient: async (clientId, data) => {
    try {
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.UPDATE_CLIENT(clientId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
      );
      return response;
    } catch (error) {
      console.error('Update client failed:', error);
      throw error;
    }
  },

  deleteClient: async clientId => {
    try {
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.DELETE_CLIENT(clientId),
        {
          method: 'DELETE',
        },
      );
      return response;
    } catch (error) {
      console.error('Delete client failed:', error);
      throw error;
    }
  },

  // Sales Offers API functions
  getAllSalesOffers: async () => {
    try {
      return await apiClient.get(CLIENT_ENDPOINTS.GET_ALL_SALES_OFFERS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all sales offers failed:', error);
      throw error;
    }
  },

  assignSalesOffer: async (offerId, password) => {
    try {
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.ASSIGN_SALES_OFFER(offerId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        },
      );
      return response;
    } catch (error) {
      console.error('Assign sales offer failed:', error);
      throw error;
    }
  },

  declineSalesOffer: async offerId => {
    try {
      const response = await apiClient.request(
        CLIENT_ENDPOINTS.DECLINE_SALES_OFFER(offerId),
        {
          method: 'DELETE',
        },
      );
      return response;
    } catch (error) {
      console.error('Decline sales offer failed:', error);
      throw error;
    }
  },
};

// React Query hooks
export const useConstructionUpdates = (options = {}) => {
  return useQuery({
    queryKey: ['construction-updates'],
    queryFn: clientApi.getConstructionUpdates,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options, // ← allows passing `enabled`
  });
};

export const useConstructionUpdatesById = (inprogressId, options = {}) => {
  return useQuery({
    queryKey: ['construction-updates-by-id', inprogressId], // ✅ Changed key
    queryFn: () => clientApi.getConsturctionUpdatesById(inprogressId),
    enabled: false, // ✅ Disabled by default
    staleTime: 5 * 60 * 1000,
    ...options, // Allow passing enabled from component
  });
};
export const useUpcomingProjects = () => {
  return useQuery({
    queryKey: ['upcoming-projects'],
    queryFn: clientApi.getUpcomingProjects,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};
export const useDeleteUpcomingProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectId => clientApi.deleteUpcomingProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-projects'] });
    },
    onError: error => {
      console.error('Delete upcoming project failed:', error);
    },
  });
};
//Notifications API
export const useNotifications = userRole => {
  const query = useQuery({
    queryKey: ['notifications', userRole],
    queryFn: () => clientApi.getNotifications(userRole),
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: !!userRole,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch, // ✅ expose refetch here
  };
};

//get client summary
export const useClientSummary = (options = {}) => {
  return useQuery({
    queryKey: ['summary'],
    queryFn: clientApi.getCilentSummary,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    ...options,
  });
};
export const useInstallments = () => {
  return useQuery({
    queryKey: ['installments'],
    queryFn: clientApi.getInstallments,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

export const useRegisterInterest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.registerInterest,
    onSuccess: () => {
      // Could invalidate upcoming projects to refresh data
      queryClient.invalidateQueries({ queryKey: ['upcoming-projects'] });
    },
    onError: error => {
      console.error('Registration failed:', error);
    },
  });
};
//Mark as read api
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: id => clientApi.markReadNotification(id),
    onSuccess: () => {
      // Refresh notifications after marking as read
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: error => {
      console.error('Mark notification read failed:', error);
    },
  });
};
export const useConstructionUpdatesByWeek = (update_id, options = {}) => {
  return useQuery({
    queryKey: ['construction-updates-by-week', update_id], // ✅ Changed key
    queryFn: () => clientApi.getConsturctionUpdatesByWeek(update_id),
    enabled: !!update_id, // Only fetch when update_id exists
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useCreateUpcomingProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.createUpcomingProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-projects'] });
    },
    onError: error => {
      console.error('Create upcoming project failed:', error);
    },
  });
};

// Units/Inventory hooks
export const useAllUnits = () => {
  return useQuery({
    queryKey: ['all-units'],
    queryFn: clientApi.getAllUnits,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

export const useAllUnitsDropdown = selectedProjectId => {
  return useQuery({
    queryKey: ['all-units-dropdown', selectedProjectId],
    queryFn:() => clientApi.getAllUnitsDropdwon(selectedProjectId),
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

export const useCreateUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.createUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-units'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: error => {
      console.error('Create unit failed:', error);
    },
  });
};

export const useUpdateUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ unitId, formData }) =>
      clientApi.updateUnit(unitId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-units'] });
    },
    onError: error => {
      console.error('Update unit failed:', error);
    },
  });
};

export const useDeleteUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-units'] });
    },
    onError: error => {
      console.error('Delete unit failed:', error);
    },
  });
};

// Clients hooks
export const useAllClients = () => {
  return useQuery({
    queryKey: ['all-clients'],
    queryFn: clientApi.getAllClients,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
    },
    onError: error => {
      console.error('Create client failed:', error);
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, data }) => clientApi.updateClient(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
    },
    onError: error => {
      console.error('Update client failed:', error);
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
    },
    onError: error => {
      console.error('Delete client failed:', error);
    },
  });
};

// Sales Offers hooks
export const useAllSalesOffers = () => {
  return useQuery({
    queryKey: ['all-sales-offers'],
    queryFn: clientApi.getAllSalesOffers,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

export const useAssignSalesOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offerId, password }) =>
      clientApi.assignSalesOffer(offerId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sales-offers'] });
    },
    onError: error => {
      console.error('Assign sales offer failed:', error);
    },
  });
};

export const useDeclineSalesOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clientApi.declineSalesOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-sales-offers'] });
    },
    onError: error => {
      console.error('Decline sales offer failed:', error);
    },
  });
};

export const useInstallmentDetails = inprogressId => {
  return useQuery({
    queryKey: ['installmentDetails', inprogressId],
    queryFn: async () => {
      const data = await clientApi.getInstallmentsById(inprogressId);
      return data;
    },
    enabled: !!inprogressId, // only fetch when id is available
    retry: 1, // optional: retry once on failure
    staleTime: 1000 * 60, // optional: cache for 1 minute
  });
};
