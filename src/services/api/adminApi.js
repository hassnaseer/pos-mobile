import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './globalApi';
import {
  dummyLeads,
  dummyInventory,
  dummyAdminUpcomingProjects,
  dummyAdminConstructionUpdates,
  dummyConstructionUpdateDetails,
  dummyRolesPermissions,
  dummySalesOffers,
  dummyClients,
  dummySalesOffersData,
} from './dummyData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { ensureStoragePermission } from '../../utils/permissionsAndroid';
import { Alert, Platform } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import { Buffer } from 'buffer';

// Simulate API delay
const simulateApiDelay = (data, delay = 1000) => {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
};

// Admin API endpoints
const ADMIN_ENDPOINTS = {
  LEADS: '/admin/leads',
  INVENTORY: '/admin/inventory',
  ADMIN_UPCOMING_PROJECTS: '/admin/upcoming-projects',
  DELETE_LEAD: '/admin/leads',
  DELETE_INVENTORY: '/admin/inventory',
  CONSTRUCTION_UPDATES: '/clients/inprogress',
  CREATE_INVENTORY: '/admin/inventory',
  UPDATE_INVENTORY: '/admin/inventory',
  UPLOAD_PROJECT: '/admin/upcoming-projects',
  ADMIN_CONSTRUCTION_UPDATES: '/inprogress/',
  CONSTRUCTION_CLIENT_DETAILS: '/inprogress/client',
  CONSTRUCTION_PROJECT_UPDATES: '/construction-updates/project',
  UPLOAD_CONSTRUCTION_UPDATE: '/construction-updates/',
  CONSTRUCTION_UPDATE_DETAILS: '/admin/construction-updates/details',
  GET_USERS: '/users/',
  GET_USER_BY_ID: id => `/users/${id}`,
  CREATE_MEMBER: '/users/create-member',
  UPDATE_MEMBER: id => `/users/${id}`,
  DELETE_MEMBER: id => `/users/${id}`,
  GET_USER_PERMISSIONS: id => `/rbac/user-modules/${id}`,
  ASSIGN_PERMISSIONS: '/rbac/assign',
  SALES_OFFERS: '/admin/sales-offers',
  SEND_SALES_OFFER: '/sales-offers/send-offer-to-lead',
  SEND_SALES_OFFER_TO_CLIENT: '/sales-offers/send-offer-to-client',
  SEND_SPA: '/admin/sales-offers/spa',
  CONVERT_TO_CLIENT: '/admin/leads/convert',
  CLIENTS: '/clients/get-all-clients',
  CREATE_CLIENT: '/clients/create-client',
  CONSTRUCTION_CLIENT_DETAILS_WEEK: `/construction-updates`,
  UPDATE_CLIENT: id => `/clients/update-client/${id}`,
  DELETE_CLIENT: id => `/clients/delete-client/${id}`,
  SALES_OFFERS_ALL: '/sales-offers/all',
  SALES_OFFERS_LEADS: '/sales-offers/leads',
  SALES_OFFERS_CLIENTS: '/sales-offers/clients',
  ASSIGN_SALES_OFFER: id => `/sales-offers/assign/${id}`,
  DECLINE_SALES_OFFER: id => `/sales-offers/${id}`,
  DELETE_OFFER: id => `/sales-offers/${id}`,
  GET_ALL_PROJECTS: '/projects/get-all-units/',
  GET_PROJECTS:'/projects/',
  GET_ALL_LEADS: '/leads/get-all-leads',
  DELETE_OFFER: id => `/sales-offers/${id}`,
  DELETE_LEAD_NEW: id => `/leads/delete/${id}`,
  CONVERT_LEAD_TO_CLIENT: id => `/sales-offers/convert/${id}`,
  SEND_SIGN_REQUEST_LEAD: '/odoo/send-sign-request-lead',
  SEND_SIGN_REQUEST_CLIENT: '/odoo/send-sign-request-client',
  UPDATE_SALES_OFFER_STATUS: id => `/sales-offers/${id}`,
  GET_TEMPLATES: '/odoo/templates',
  DOWNLOAD_SPA: id => `/odoo/download-signed-document/${id}`,
  GET_LEAD_BY_ID: id => `/leads/get-lead-id/${id}`,
  GET_AGENCY_BROKERS: '/agency-broker/',
  CREATE_AGENCY_BROKER: '/agency-broker/',
  DELETE_AGENCY_BROKER: id => `/agency-broker/${id}`,
  UPDATE_AGENCY_BROKER: id => `/agency-broker/${id}`,
  GET_INDIVIDUAL_BROKERS: '/individual-brokers/',
  CREATE_INDIVIDUAL_BROKER: '/individual-brokers/',
  DELETE_INDIVIDUAL_BROKER: id => `/individual-brokers/${id}`,
  UPDATE_INDIVIDUAL_BROKER: id => `/individual-brokers/${id}`,
};

// API functions
export const adminApi = {
  getLeads: async (filters = {}) => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.LEADS, { params: filters });
    } catch (error) {
      console.log('API not available, using dummy data for leads');
      return simulateApiDelay(dummyLeads);
    }
  },

  deleteOffer: async offerId => {
    try {
      console.log('Deleting offer with ID:', offerId);
      return await apiClient.delete(ADMIN_ENDPOINTS.DELETE_OFFER(offerId));
    } catch (error) {
      console.log('API not available, simulating offer deletion');
      return simulateApiDelay({
        success: true,
        message: 'Offer deleted successfully',
      });
    }
  },

  deleteLead: async leadId => {
    try {
      return await apiClient.delete(`${ADMIN_ENDPOINTS.DELETE_LEAD}/${leadId}`);
    } catch (error) {
      console.log('API not available, simulating lead deletion');
      return simulateApiDelay({
        success: true,
        message: 'Lead deleted successfully',
      });
    }
  },

  getInventory: async (filters = {}) => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.INVENTORY, {
        params: filters,
      });
    } catch (error) {
      console.log('API not available, using dummy data for inventory');
      return simulateApiDelay(dummyInventory);
    }
  },

  createInventoryItem: async itemData => {
    try {
      return await apiClient.post(ADMIN_ENDPOINTS.CREATE_INVENTORY, itemData);
    } catch (error) {
      console.log('API not available, simulating inventory creation');
      return simulateApiDelay({
        success: true,
        message: 'Inventory item created successfully',
        data: { id: Date.now(), ...itemData },
      });
    }
  },

  updateInventoryItem: async (itemId, itemData) => {
    try {
      return await apiClient.put(
        `${ADMIN_ENDPOINTS.UPDATE_INVENTORY}/${itemId}`,
        itemData,
      );
    } catch (error) {
      console.log('API not available, simulating inventory update');
      return simulateApiDelay({
        success: true,
        message: 'Inventory item updated successfully',
        data: { id: itemId, ...itemData },
      });
    }
  },

  deleteInventoryItem: async itemId => {
    try {
      return await apiClient.delete(
        `${ADMIN_ENDPOINTS.DELETE_INVENTORY}/${itemId}`,
      );
    } catch (error) {
      console.log('API not available, simulating inventory deletion');
      return simulateApiDelay({
        success: true,
        message: 'Inventory item deleted successfully',
      });
    }
  },

  getAdminUpcomingProjects: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.ADMIN_UPCOMING_PROJECTS);
    } catch (error) {
      console.log(
        'API not available, using dummy data for admin upcoming projects',
      );
      return simulateApiDelay(dummyAdminUpcomingProjects);
    }
  },

  uploadProject: async projectData => {
    try {
      return await apiClient.post(ADMIN_ENDPOINTS.UPLOAD_PROJECT, projectData);
    } catch (error) {
      console.log('API not available, simulating project upload');
      return simulateApiDelay({
        success: true,
        message: 'Project uploaded successfully',
        data: { id: Date.now(), ...projectData },
      });
    }
  },

  // Admin Construction Updates
  getAdminConstructionUpdates: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.ADMIN_CONSTRUCTION_UPDATES);
    } catch (error) {
      console.log(
        'API not available, using dummy data for admin construction updates',
      );
    }
  },

  uploadConstructionUpdate: async updateData => {
    try {
      return await apiClient.request(
        ADMIN_ENDPOINTS.UPLOAD_CONSTRUCTION_UPDATE,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: updateData,
        },
      );
    } catch (error) {
      console.log('API not available, simulating construction update upload');
      throw error;
    }
  },

  getConstructionUpdateDetails: async updateId => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      const EndPoint =
        role === 'client'
          ? ADMIN_ENDPOINTS.CONSTRUCTION_UPDATES
          : ADMIN_ENDPOINTS.CONSTRUCTION_UPDATE_DETAILS;
      return await apiClient.get(`${EndPoint}/${updateId}`);
    } catch (error) {
      console.log(
        'API not available, using dummy data for construction update details',
      );
      return simulateApiDelay(dummyConstructionUpdateDetails);
    }
  },

  getConstructionClientDetails: async clientId => {
    try {
      return await apiClient.get(
        `${ADMIN_ENDPOINTS.CONSTRUCTION_CLIENT_DETAILS}/${clientId}`,
      );
    } catch (error) {
      console.log(
        'API not available, using dummy data for construction client details',
      );
      return simulateApiDelay(dummyConstructionUpdateDetails);
    }
  },

  getConstructionClientDetailsWeek: async clientId => {
    try {
      console.log(clientId, 'clientId');

      return await apiClient.get(
        `${ADMIN_ENDPOINTS.CONSTRUCTION_CLIENT_DETAILS_WEEK}/${clientId}`,
      );
    } catch (error) {
      console.log(
        'API not available, using dummy data for construction client details',
      );
      throw error;
    }
  },

  getConstructionProjectUpdates: async inprogressId => {
    try {
      return await apiClient.get(
        `${ADMIN_ENDPOINTS.CONSTRUCTION_PROJECT_UPDATES}/${inprogressId}`,
      );
    } catch (error) {
      console.log(
        'API not available, using dummy data for construction project updates',
      );
      return simulateApiDelay([]);
    }
  },

  // Users Management
  getUsers: async () => {
    try {
      const response = await apiClient.get(ADMIN_ENDPOINTS.GET_USERS);
      // Return the data array from the response
      return response?.data || [];
    } catch (error) {
      console.log('API not available, using dummy data for users');
    }
  },

  getUserById: async userId => {
    try {
      const response = await apiClient.get(
        ADMIN_ENDPOINTS.GET_USER_BY_ID(userId),
      );
      console.log(userId, 'responseresponseresponse');

      return response;
    } catch (error) {
      console.log('API not available, simulating get user by ID');
      throw error;
    }
  },

  createMember: async memberData => {
    try {
      const response = await apiClient.post(
        ADMIN_ENDPOINTS.CREATE_MEMBER,
        memberData,
      );
      return response;
    } catch (error) {
      console.log('API not available, simulating member creation');
      throw error;
    }
  },

  updateMember: async (memberId, memberData) => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.UPDATE_MEMBER(memberId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(memberData),
        },
      );
      return response;
    } catch (error) {
      console.log('API not available, simulating member update');
      throw error;
    }
  },

  deleteMember: async memberId => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.DELETE_MEMBER(memberId),
        {
          method: 'DELETE',
        },
      );
      return response;
    } catch (error) {
      console.log('API not available, simulating member deletion');
      throw error;
    }
  },

  getUserPermissions: async userId => {
    try {
      const response = await apiClient.get(
        ADMIN_ENDPOINTS.GET_USER_PERMISSIONS(userId),
      );
      return response;
    } catch (error) {
      console.log('API not available, simulating get permissions');
      throw error;
    }
  },

  assignPermissions: async permissionsData => {
    try {
      const response = await apiClient.post(
        ADMIN_ENDPOINTS.ASSIGN_PERMISSIONS,
        permissionsData,
      );
      return response;
    } catch (error) {
      console.log('API not available, simulating assign permissions');
      throw error;
    }
  },

  // Sales Offers
  getSalesOffers: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.SALES_OFFERS);
    } catch (error) {
      console.log('API not available, using dummy data for sales offers');
      return simulateApiDelay(dummySalesOffers);
    }
  },

  sendSalesOffer: async offerData => {
    try {
      console.log('offerData', offerData);
      return await apiClient.post(ADMIN_ENDPOINTS.SEND_SALES_OFFER, offerData);
    } catch (error) {
      console.log('API not available, simulating sales offer send');
      throw error;
    }
  },

  sendSalesOfferToClient: async offerData => {
    try {
      console.log('offerData to client', offerData);
      return await apiClient.post(
        ADMIN_ENDPOINTS.SEND_SALES_OFFER_TO_CLIENT,
        offerData,
      );
    } catch (error) {
      console.log('API not available, simulating sales offer send to client');
      throw error;
    }
  },

  sendSPA: async offerId => {
    try {
      return await apiClient.post(`${ADMIN_ENDPOINTS.SEND_SPA}/${offerId}`);
    } catch (error) {
      console.log('API not available, simulating SPA send');
      return simulateApiDelay({
        success: true,
        message: 'SPA sent successfully',
      });
    }
  },
  // DOWNLOAD SPA
  getdownloadSPA: async signId => {
    try {
      const response = await apiClient.get(
        ADMIN_ENDPOINTS.DOWNLOAD_SPA(signId),
        { responseType: 'arraybuffer' },
      );
      return response;
    } catch (error) {
      console.log('Failed to download SPA:', error);
      throw error;
    }
  },

  convertToClient: async (leadId, clientData) => {
    try {
      return await apiClient.post(
        `${ADMIN_ENDPOINTS.CONVERT_TO_CLIENT}/${leadId}`,
        clientData,
      );
    } catch (error) {
      console.log('API not available, simulating convert to client');
      return simulateApiDelay({
        success: true,
        message: 'Lead converted to client successfully',
        data: { id: leadId, ...clientData },
      });
    }
  },

  // Clients
  getClients: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.CLIENTS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all clients failed:', error);
      throw error;
    }
  },

  createClient: async clientData => {
    try {
      const response = await apiClient.request(ADMIN_ENDPOINTS.CREATE_CLIENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });
      return response;
    } catch (error) {
      console.error('Create client failed:', error);
      throw error;
    }
  },

  updateClient: async (clientId, clientData) => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.UPDATE_CLIENT(clientId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData),
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
        ADMIN_ENDPOINTS.DELETE_CLIENT(clientId),
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

  // Sales Offers - All
  getSalesOffersAll: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.SALES_OFFERS_ALL, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all sales offers failed:', error);
      throw error;
    }
  },
  getSalesOffersLeads: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.SALES_OFFERS_LEADS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all leads sales offers failed:', error);
      throw error;
    }
  },
  getSalesOffersClients: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.SALES_OFFERS_CLIENTS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all clients sales offers failed:', error);
      throw error;
    }
  },

  assignSalesOffer: async (offerId, password) => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.ASSIGN_SALES_OFFER(offerId),
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
        ADMIN_ENDPOINTS.DECLINE_SALES_OFFER(offerId),
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
  //get all units
  getAllProjects: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.GET_ALL_PROJECTS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all projects failed:', error);
      throw error;
    }
  },
  //projects
   getProjects: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.GET_PROJECTS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all projects failed:', error);
      throw error;
    }
  },
  // Leads Management
  getLeadById: async leadId => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.GET_LEAD_BY_ID(leadId), {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get lead by ID failed:', error);
      throw error;
    }
  },
  getAllLeads: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.GET_ALL_LEADS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get all leads failed:', error);
      throw error;
    }
  },

  deleteLeadNew: async leadId => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.DELETE_LEAD_NEW(leadId),
        {
          method: 'DELETE',
        },
      );
      return response;
    } catch (error) {
      console.error('Delete lead failed:', error);
      throw error;
    }
  },

  convertLeadToClient: async (salesOfferId, password) => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.CONVERT_LEAD_TO_CLIENT(salesOfferId),
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
      console.error('Convert lead to client failed:', error);
      throw error;
    }
  },

  sendSignRequestLead: async payload => {
    try {
      console.log('sendSignRequestLead payload', payload);
      return await apiClient.post(
        ADMIN_ENDPOINTS.SEND_SIGN_REQUEST_LEAD,
        payload,
      );
    } catch (error) {
      console.error('Send sign request lead failed:', error);
      throw error;
    }
  },

  getTemplates: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.GET_TEMPLATES);
    } catch (error) {
      console.error('Get templates failed:', error);
      throw error;
    }
  },

  sendSignRequestClient: async payload => {
    try {
      console.log('sendSignRequestClient payload', payload);
      return await apiClient.post(
        ADMIN_ENDPOINTS.SEND_SIGN_REQUEST_CLIENT,
        payload,
      );
    } catch (error) {
      console.error('Send sign request client failed:', error);
      throw error;
    }
  },

  updateSalesOfferStatus: async (offerId, payload) => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.UPDATE_SALES_OFFER_STATUS(offerId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      return response;
    } catch (error) {
      console.error('Update sales offer status failed:', error);
      throw error;
    }
  },

  // Brokers - Agency
  getAgencyBrokers: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.GET_AGENCY_BROKERS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get agency brokers failed:', error);
      throw error;
    }
  },

  createAgencyBroker: async brokerData => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.CREATE_AGENCY_BROKER,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: brokerData,
        },
      );
      return response;
    } catch (error) {
      console.error('Create agency broker failed:', error);
      throw error;
    }
  },

  deleteAgencyBroker: async brokerId => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.DELETE_AGENCY_BROKER(brokerId),
        {
          method: 'DELETE',
        },
      );
      return response;
    } catch (error) {
      console.error('Delete agency broker failed:', error);
      throw error;
    }
  },

  updateAgencyBroker: async (brokerId, brokerData) => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.UPDATE_AGENCY_BROKER(brokerId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: brokerData,
        },
      );
      return response;
    } catch (error) {
      console.error('Update agency broker failed:', error);
      throw error;
    }
  },

  // Brokers - Individual
  getIndividualBrokers: async () => {
    try {
      return await apiClient.get(ADMIN_ENDPOINTS.GET_INDIVIDUAL_BROKERS, {
        skipAuth: false,
      });
    } catch (error) {
      console.error('Get individual brokers failed:', error);
      throw error;
    }
  },

  createIndividualBroker: async brokerData => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.CREATE_INDIVIDUAL_BROKER,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: brokerData,
        },
      );
      return response;
    } catch (error) {
      console.error('Create individual broker failed:', error);
      throw error;
    }
  },

  deleteIndividualBroker: async brokerId => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.DELETE_INDIVIDUAL_BROKER(brokerId),
        {
          method: 'DELETE',
        },
      );
      return response;
    } catch (error) {
      console.error('Delete individual broker failed:', error);
      throw error;
    }
  },

  updateIndividualBroker: async (brokerId, brokerData) => {
    try {
      const response = await apiClient.request(
        ADMIN_ENDPOINTS.UPDATE_INDIVIDUAL_BROKER(brokerId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: brokerData,
        },
      );
      return response;
    } catch (error) {
      console.error('Update individual broker failed:', error);
      throw error;
    }
  },
};

// React Query hooks
export const useLeads = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['admin-leads', filters],
    queryFn: () => adminApi.getLeads(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
    },
    onError: error => {
      console.error('Delete lead failed:', error);
    },
  });
};

export const useInventory = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['admin-inventory', filters],
    queryFn: () => adminApi.getInventory(filters),
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: error => {
      console.error('Create inventory item failed:', error);
    },
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateInventoryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: error => {
      console.error('Update inventory item failed:', error);
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: error => {
      console.error('Delete inventory item failed:', error);
    },
  });
};

export const useAdminUpcomingProjects = (options = {}) => {
  return useQuery({
    queryKey: ['admin-upcoming-projects'],
    queryFn: adminApi.getAdminUpcomingProjects,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useUploadProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.uploadProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-upcoming-projects'] });
    },
    onError: error => {
      console.error('Upload project failed:', error);
    },
  });
};

// Admin Construction Updates hooks
export const useAdminConstructionUpdates = (options = {}) => {
  return useQuery({
    queryKey: ['admin-construction-updates'],
    queryFn: adminApi.getAdminConstructionUpdates,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useUploadConstructionUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.uploadConstructionUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-construction-updates'],
      });
      queryClient.invalidateQueries({
        queryKey: ['construction-update-details'],
      });
      queryClient.invalidateQueries({
        queryKey: ['construction-client-details'],
      });
      queryClient.invalidateQueries({
        queryKey: ['construction-project-updates'],
      });
    },
    onError: error => {
      console.error('Upload construction update failed:', error);
    },
  });
};

// export const useConstructionUpdateDetails = (updateId, options = {}) => {
//   return useQuery({
//     queryKey: ['construction-update-details', updateId],
//     queryFn: () => adminApi.getConstructionUpdateDetails(updateId),
//     staleTime: 2 * 60 * 1000,
//     cacheTime: 5 * 60 * 1000,
//     enabled: options.enabled !== undefined ? options.enabled : !!updateId,
//   });
// };

export const useConstructionClientDetails = (clientId, options = {}) => {
  return useQuery({
    queryKey: ['construction-client-details', clientId],
    queryFn: () => adminApi.getConstructionClientDetails(clientId),
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : !!clientId,
  });
};

export const useConstructionUpdatesByWeek = (clientId, options = {}) => {
  return useQuery({
    queryKey: ['construction-client-details-week', clientId],
    queryFn: () => adminApi.getConstructionClientDetailsWeek(clientId),
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : !!clientId,
  });
};

export const useConstructionProjectUpdates = (inprogressId, options = {}) => {
  return useQuery({
    queryKey: ['construction-project-updates', inprogressId],
    queryFn: () => adminApi.getConstructionProjectUpdates(inprogressId),
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : !!inprogressId,
  });
};

// Users Management hooks
export const useUsers = (options = {}) => {
  return useQuery({
    queryKey: ['users'],
    queryFn: adminApi.getUsers,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useLeadById = (leadId, options = {}) => {
  return useQuery({
    queryKey: ['lead-by-id', leadId],
    queryFn: () => adminApi.getLeadById(leadId),
    enabled: options.enabled !== undefined ? options.enabled : !!leadId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};
export const useUserById = (userId, options = {}) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => adminApi.getUserById(userId),
    enabled: options.enabled !== undefined ? options.enabled : !!userId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      console.error('Create member failed:', error);
    },
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      console.error('Update member failed:', error);
    },
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      console.error('Delete member failed:', error);
    },
  });
};

export const useUserPermissions = (userId, options = {}) => {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => adminApi.getUserPermissions(userId),
    enabled: options.enabled !== undefined ? options.enabled : !!userId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });
};

export const useAssignPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.assignPermissions,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user-permissions', variables.user_id],
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: error => {
      console.error('Assign permissions failed:', error);
    },
  });
};

// Sales Offers hooks
export const useSalesOffers = (options = {}) => {
  return useQuery({
    queryKey: ['sales-offers'],
    queryFn: adminApi.getSalesOffers,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useSendSalesOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.sendSalesOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
    },
    onError: error => {
      console.error('Send sales offer failed:', error);
    },
  });
};

export const useSendSalesOfferToClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.sendSalesOfferToClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: error => {
      return error;
    },
  });
};

export const useSendSPA = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.sendSPA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers'] });
    },
    onError: error => {
      console.error('Send SPA failed:', error);
    },
  });
};

export const useDownloadSPA = () => {
  return useMutation({
    mutationFn: async signId => {
      try {
        console.log('📥 Downloading SPA for signId:', signId);

        // 1️⃣ Fetch the PDF
        const response = await adminApi.getdownloadSPA(signId);
        const contentType = response.headers?.['content-type'];

        let base64Data;
        if (contentType?.includes('application/pdf')) {
          base64Data = Buffer.from(response.data, 'binary').toString('base64');
        } else if (typeof response.data === 'object' && response.data.file) {
          base64Data = response.data.file;
        } else {
          throw new Error('Invalid SPA response format');
        }

        // 2️⃣ Temporary internal path (no permission needed)
        const tempPath = `${RNFS.DocumentDirectoryPath}/signed_spa_${signId}.pdf`;

        // 3️⃣ Write PDF to internal storage
        await RNFS.writeFile(tempPath, base64Data, 'base64');
        console.log('✅ SPA temporarily saved at:', tempPath);

        // 4️⃣ Request storage permission for public move
        const permissionGranted = await ensureStoragePermission();
        if (!permissionGranted) throw new Error('Storage permission denied');

        // 5️⃣ Move to Downloads folder
        const downloadsPath = `${RNFS.DownloadDirectoryPath}/signed_spa_${signId}.pdf`;

        // Remove if file already exists (avoid rename error)
        const exists = await RNFS.exists(downloadsPath);
        if (exists) await RNFS.unlink(downloadsPath);

        await RNFS.copyFile(tempPath, downloadsPath);
        console.log('📂 SPA moved to:', downloadsPath);

        // 6️⃣ Optional: open automatically
        try {
          await FileViewer.open(downloadsPath, { showOpenWithDialog: true });
        } catch (err) {
          console.log('⚠️ Could not open automatically:', err);
          Alert.alert('Saved', `SPA downloaded to your Downloads folder.`);
        }

        return downloadsPath;
      } catch (error) {
        console.error('❌ Error in SPA download:', error);
        Alert.alert('Error', 'Failed to download SPA. Please try again.');
        throw error;
      }
    },
  });
};

export const useConvertToClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, clientData }) =>
      adminApi.convertToClient(leadId, clientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-offers'] });
    },
    onError: error => {
      console.error('Convert to client failed:', error);
    },
  });
};

// Clients hooks
export const useClients = (options = {}) => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: adminApi.getClients,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: error => {
      console.error('Create client failed:', error);
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: error => {
      console.error('Update client failed:', error);
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: error => {
      console.error('Delete client failed:', error);
    },
  });
};

export const useSalesOffersAll = (options = {}) => {
  return useQuery({
    queryKey: ['sales-offers-all'],
    queryFn: adminApi.getSalesOffersAll,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};
export const useSalesOffersLeads = (options = {}) => {
  return useQuery({
    queryKey: ['sales-offers-leads'],
    queryFn: adminApi.getSalesOffersLeads,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};
export const useSalesOffersClients = (options = {}) => {
  return useQuery({
    queryKey: ['sales-offers-clients'],
    queryFn: adminApi.getSalesOffersClients,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useAssignSalesOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offerId, password }) =>
      adminApi.assignSalesOffer(offerId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers-clients'] });
    },
    onError: error => {
      console.error('Assign sales offer failed:', error);
    },
  });
};

export const useDeclineSalesOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.declineSalesOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers-all'] });
    },
    onError: error => {
      console.error('Decline sales offer failed:', error);
    },
  });
};
//get all units
export const useAllProjects = (options = {}) => {
  return useQuery({
    queryKey: ['all-projects'],
    queryFn: adminApi.getAllProjects,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};
//get all projects
export const useGetProjects = (options = {}) => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: adminApi.getProjects,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

// Leads Management hooks
export const useAllLeads = (options = {}) => {
  return useQuery({
    queryKey: ['all-leads'],
    queryFn: adminApi.getAllLeads,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useDeleteLeadNew = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteLeadNew,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-leads'] });
    },
    onError: error => {
      console.error('Delete lead failed:', error);
    },
  });
};

export const useDeleteOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers-leads'] });
    },
    onError: error => {
      console.error('Delete lead failed:', error);
    },
  });
};

export const useConvertLeadToClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ salesOfferId, password }) =>
      adminApi.convertLeadToClient(salesOfferId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-leads'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['sales-offers-leads'] });
    },
    onError: error => {
      console.error('Convert lead to client failed:', error);
    },
  });
};

export const useSendSignRequestLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.sendSignRequestLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers-all'] });
    },
    onError: error => {
      console.error('Send sign request lead failed:', error);
    },
  });
};

export const useSendSignRequestClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.sendSignRequestClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers-all'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: error => {
      console.error('Send sign request client failed:', error);
    },
  });
};

export const useUpdateSalesOfferStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ offerId, ...payload }) =>
      adminApi.updateSalesOfferStatus(offerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-offers-all'] });
      queryClient.invalidateQueries({ queryKey: ['sales-offers-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-offers-clients'] });
    },
    onError: error => {
      console.error('Update sales offer status failed:', error);
    },
  });
};

export const useTemplates = (options = {}) => {
  return useQuery({
    queryKey: ['templates'],
    queryFn: adminApi.getTemplates,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

// Brokers - Agency hooks
export const useAgencyBrokers = (options = {}) => {
  return useQuery({
    queryKey: ['agency-brokers'],
    queryFn: adminApi.getAgencyBrokers,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useCreateAgencyBroker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createAgencyBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-brokers'] });
    },
    onError: error => {
      console.error('Create agency broker failed:', error);
    },
  });
};

export const useDeleteAgencyBroker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteAgencyBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-brokers'] });
    },
    onError: error => {
      console.error('Delete agency broker failed:', error);
    },
  });
};

export const useUpdateAgencyBroker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateAgencyBroker(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-brokers'] });
    },
    onError: error => {
      console.error('Update agency broker failed:', error);
    },
  });
};

// Brokers - Individual hooks
export const useIndividualBrokers = (options = {}) => {
  return useQuery({
    queryKey: ['individual-brokers'],
    queryFn: adminApi.getIndividualBrokers,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
};

export const useCreateIndividualBroker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createIndividualBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-brokers'] });
    },
    onError: error => {
      console.error('Create individual broker failed:', error);
    },
  });
};

export const useDeleteIndividualBroker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteIndividualBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-brokers'] });
    },
    onError: error => {
      console.error('Delete individual broker failed:', error);
    },
  });
};

export const useUpdateIndividualBroker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateIndividualBroker(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-brokers'] });
    },
    onError: error => {
      console.error('Update individual broker failed:', error);
    },
  });
};
