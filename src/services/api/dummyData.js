// Dummy data for TanStack Query
export const dummyConstructionUpdates = [
  {
    id: 1,
    projectName: 'Azad Tower',
    totalProgress: 'Q2',
    date: 'Aug 19, 2025',
    status: 'View updates',
    images: [],
    weeklyUpdates: [
      { week: 'Week 04', progress: 85, color: '#336699' },
      { week: 'Week 03', progress: 70, color: '#336699' },
      { week: 'Week 02', progress: 55, color: '#336699' },
      { week: 'Week 01', progress: 40, color: '#336699' },
    ]
  },
  {
    id: 2,
    projectName: 'Downtown Office',
    totalProgress: 'Q2',
    date: 'Aug 19, 2025',
    status: 'View updates',
    images: [],
    weeklyUpdates: [
      { week: 'Week 04', progress: 75, color: '#336699' },
      { week: 'Week 03', progress: 60, color: '#336699' },
      { week: 'Week 02', progress: 45, color: '#336699' },
      { week: 'Week 01', progress: 30, color: '#336699' },
    ]
  }
];

export const dummyUpcomingProjects = [
  {
    id: 1,
    title: 'Green Residency Flats',
    subtitle: 'Spacious 2-bedroom flats',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
    status: 'Coming Soon',
    description: 'Modern residential complex with all amenities.',
    features: ['2 Bedrooms', '2 Bathrooms', 'Balcony', 'Parking'],
    location: 'Downtown Area',
    price: 'Starting from $150,000'
  },
  {
    id: 2,
    title: 'Skyline Heights',
    subtitle: 'Luxury 3-bedroom apartments',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
    status: 'Pre-Launch',
    description: 'Premium living with city views.',
    features: ['3 Bedrooms', '3 Bathrooms', 'Terrace', '2 Parking'],
    location: 'City Center',
    price: 'Starting from $250,000'
  }
];

export const dummyInstallments = [
  {
    id: 1,
    projectName: 'Azad Tower',
    totalPayments: 100970,
    remainingPayments: 875540,
    currency: 'AED',
    date: 'Aug 19, 2025',
    status: 'View installment plan',
    installmentDetails: [
      {
        id: 1,
        installmentNo: 5,
        date: 'Sept 19, 2025',
        status: 'Pending',
        amount: 67540,
        dueDate: '01.02',
        payableAmount: 67540,
        statusColor: '#FFA500'
      },
      {
        id: 2,
        installmentNo: 4,
        date: 'Aug 19, 2025',
        status: 'Overdue',
        amount: 67540,
        dueDate: '01.02',
        payableAmount: 67540,
        statusColor: '#DC2626'
      },
      {
        id: 3,
        installmentNo: 3,
        date: 'July 19, 2025',
        status: 'Paid',
        amount: 67540,
        dueDate: '01.02',
        payableAmount: 67540,
        statusColor: '#259800'
      }
    ]
  },
  {
    id: 2,
    projectName: 'Downtown Office',
    totalPayments: 70970,
    remainingPayments: 675540,
    currency: 'AED',
    date: 'Aug 19, 2025',
    status: 'View installment plan',
    installmentDetails: [
      {
        id: 1,
        installmentNo: 2,
        date: 'Aug 30, 2025',
        status: 'Pending',
        amount: 67540,
        dueDate: '01.02',
        payableAmount: 67540,
        statusColor: '#FFA500'
      }
    ]
  }
];

// Admin dummy data
export const dummyLeads = [
  {
    id: 1,
    name: 'Jakson Saris',
    email: 'jakson@gmail.com',
    phone: '+971 5 8909',
    project: 'Oceanica',
    status: 'Available lead',
    statusColor: '#259800',
    additionalMessage: 'I am interested in this project'
  },
  {
    id: 2,
    name: 'Akram Laphulz',
    email: 'akram@gmail.com',
    phone: '+971 5 8909',
    project: 'Oceanica',
    status: 'Available lead',
    statusColor: '#259800',
    additionalMessage: 'Looking for 2 bedroom apartment'
  },
  {
    id: 3,
    name: 'Akram Laphulz',
    email: 'akram@gmail.com',
    phone: '+971 5 8909',
    project: 'Oceanica',
    status: 'Available lead',
    statusColor: '#259800',
    additionalMessage: 'Need more information about amenities'
  }
];

export const dummyInventory = [
  {
    id: 1,
    projectName: 'Azad Tower',
    unitNo: '310',
    type: 'Apartment',
    size: 456,
    sizeUnit: 'sq. ft.',
    price: 678540,
    currency: 'AED',
    status: 'Available',
    statusColor: '#259800',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400'
    ]
  },
  {
    id: 2,
    projectName: 'Downtown Office',
    unitNo: '205',
    type: 'Office',
    size: 750,
    sizeUnit: 'sq. ft.',
    price: 890000,
    currency: 'AED',
    status: 'Reserved',
    statusColor: '#FFA500',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
    ]
  },
  {
    id: 3,
    projectName: 'Green Residency',
    unitNo: '102',
    type: 'Villa',
    size: 1200,
    sizeUnit: 'sq. ft.',
    price: 1250000,
    currency: 'AED',
    status: 'Sold',
    statusColor: '#DC2626',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400'
    ]
  }
];

export const dummyAdminUpcomingProjects = [
  {
    id: 1,
    title: 'Green Residency Flats',
    subtitle: 'Launch Expected Date: Sept 2024',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
    status: 'Coming Soon',
    description: 'Modern residential complex with all amenities.',
    brochureUrl: 'brochure.pdf'
  },
  {
    id: 2,
    title: 'Skyline Heights',
    subtitle: 'Launch Expected Date: Dec 2024',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
    status: 'Pre-Launch',
    description: 'Premium living with city views.',
    brochureUrl: 'skyline-brochure.pdf'
  }
];

// Construction Update Details
export const dummyConstructionUpdateDetails = {
  id: 1,
  projectName: 'Downtown Office',
  updateName: 'Flooring & Tiling Works - Week 4',
  date: 'Aug 19, 2025',
  progress: 65,
  totalProgress: '65% Complete',
  details: 'The flooring and tiling phase is progressing according to schedule. The ground floor marble installation has been completed successfully, and we are moving to the second floor. On the first floor, ceramic tiles are being laid in the bathroom and kitchen areas, with about 70% completion. The marble flooring in the living areas is also underway with 60% completion. Quality checks have been conducted to ensure proper grout lines and leveling.',
  nextSteps: [
    'Complete remaining tiling work on the first floor',
    'Begin grout application and polishing for the ground floor',
    'Start bathroom ceramic tile installation on the second floor',
    'Quality inspection before moving to second floor tiles'
  ],
  visualsAttached: [
    { id: 1, name: 'Photo 1', type: 'image', url: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=400' },
    { id: 2, name: 'Photo 2', type: 'image', url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400' },
    { id: 3, name: 'Photo 3', type: 'image', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400' }
  ]
};

// Roles & Permissions Data
// Clients Data
export const dummyClients = [
  {
    id: 1,
    name: 'Jaxson Saris',
    email: 'jaxsonsaris@gmail.com',
    phone: '+971 5 8909',
    project: 'Azad Tower',
    interestedIn: 'Studio',
    status: 'Social media lead',
    statusColor: '#336699',
    additionalMessage: 'View additional message'
  },
  {
    id: 2,
    name: 'Akram Laphulz',
    email: 'jaxsonsaris@gmail.com',
    phone: '+971 5 8909',
    project: 'Azad Tower',
    interestedIn: '1 Bedroom',
    status: 'Website lead',
    statusColor: '#259800',
    additionalMessage: 'View additional message'
  },
  {
    id: 3,
    name: 'Jaxson Saris',
    email: 'jaxsonsaris@gmail.com',
    phone: '+971 5 8909',
    project: 'Azad Tower',
    interestedIn: 'Studio',
    status: 'Social media lead',
    statusColor: '#336699',
    additionalMessage: 'View additional message'
  }
];

// Sales Offers Data
export const dummySalesOffersData = [
  {
    id: 1,
    clientName: 'Jaxson Saris',
    date: 'Aug 22, 2025',
    status: 'Accepted',
    statusColor: '#259800',
    hasSPA: true,
    spaStatus: 'Signed',
    project: 'Azad Tower',
    unit: 'Studio',
    price: '625,000 AED'
  },
  {
    id: 2,
    clientName: 'Akram Laphulz',
    date: 'Aug 22, 2025',
    status: 'Sent',
    statusColor: '#336699',
    hasSPA: false,
    spaStatus: null,
    project: 'Downtown Office',
    unit: '1 Bedroom',
    price: '750,000 AED'
  },
  {
    id: 3,
    clientName: 'Akram Laphulz',
    date: 'Aug 22, 2025',
    status: 'Viewed',
    statusColor: '#FFA500',
    hasSPA: false,
    spaStatus: null,
    project: 'Green Tower',
    unit: '2 Bedrooms',
    price: '950,000 AED'
  },
  {
    id: 4,
    clientName: 'Akram Laphulz',
    date: 'Aug 22, 2025',
    status: 'Declined',
    statusColor: '#DC2626',
    hasSPA: false,
    spaStatus: null,
    project: 'Marina View',
    unit: 'Studio',
    price: '580,000 AED'
  },
  {
    id: 5,
    clientName: 'Jaxson Saris',
    date: 'Aug 22, 2025',
    status: 'Accepted',
    statusColor: '#259800',
    hasSPA: true,
    spaStatus: 'Signed',
    project: 'City Center',
    unit: '1 Bedroom',
    price: '825,000 AED'
  }
];

export const dummyRolesPermissions = [
  {
    id: 1,
    name: 'Jaxson Saris',
    roleId: 'MAAK-9087',
    roleTitle: 'Super Admin',
    isActive: true,
    accessTo: 'CRM',
    permissions: {
      leadsManagement: { canView: true, canDelete: true, canMarkAsClient: false },
      inventoryManagement: { canView: true, canCreateProject: true, canEdit: true, canDelete: false },
      salesOffer: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      constructionUpdates: { canView: true, canUpload: true, canEdit: true, canDelete: false },
      upcomingProjects: { canView: true, canUpload: true, canEdit: false, canDelete: false },
      installmentManagement: { canView: false, canCreate: false, canEdit: false, canDelete: false }
    }
  },
  {
    id: 2,
    name: 'Akram',
    roleId: 'MAAK-4567',
    roleTitle: 'Admin',
    isActive: true,
    accessTo: 'CRM',
    permissions: {
      leadsManagement: { canView: true, canDelete: false, canMarkAsClient: true },
      inventoryManagement: { canView: true, canCreateProject: false, canEdit: true, canDelete: false },
      salesOffer: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      constructionUpdates: { canView: true, canUpload: false, canEdit: false, canDelete: false },
      upcomingProjects: { canView: true, canUpload: false, canEdit: false, canDelete: false },
      installmentManagement: { canView: true, canCreate: false, canEdit: false, canDelete: false }
    }
  },
  {
    id: 3,
    name: 'Akram Laphulz',
    roleId: 'MAAK-4567',
    roleTitle: 'Task only',
    isActive: false,
    accessTo: 'Task only',
    permissions: {
      leadsManagement: { canView: false, canDelete: false, canMarkAsClient: false },
      inventoryManagement: { canView: false, canCreateProject: false, canEdit: false, canDelete: false },
      salesOffer: { canView: false, canCreate: false, canEdit: false, canDelete: false },
      constructionUpdates: { canView: false, canUpload: false, canEdit: false, canDelete: false },
      upcomingProjects: { canView: false, canUpload: false, canEdit: false, canDelete: false },
      installmentManagement: { canView: false, canCreate: false, canEdit: false, canDelete: false }
    }
  },
  {
    id: 4,
    name: 'Jaxson Saris',
    roleId: 'MAAK-9087',
    roleTitle: 'Super Admin',
    isActive: true,
    accessTo: 'CRM',
    permissions: {
      leadsManagement: { canView: true, canDelete: true, canMarkAsClient: true },
      inventoryManagement: { canView: true, canCreateProject: true, canEdit: true, canDelete: true },
      salesOffer: { canView: true, canCreate: true, canEdit: true, canDelete: true },
      constructionUpdates: { canView: true, canUpload: true, canEdit: true, canDelete: true },
      upcomingProjects: { canView: true, canUpload: true, canEdit: true, canDelete: true },
      installmentManagement: { canView: true, canCreate: true, canEdit: true, canDelete: true }
    }
  }
];

// Admin Construction Updates Data
export const dummyAdminConstructionUpdates = [
  {
    id: 1,
    clientName: 'Akram Laphulz',
    email: 'akram.laphulz@email.com',
    phone: '+234 8922 (Whatsap 27',
    projectName: 'Azad Tower, Downtown Office',
    date: 'Aug 19, 2025',
    status: 'In progress',
    statusColor: '#FFA500',
    weeklyUpdates: [
      { week: 'Week 04', progress: 85, color: '#336699' },
      { week: 'Week 03', progress: 70, color: '#336699' },
      { week: 'Week 02', progress: 55, color: '#336699' },
      { week: 'Week 01', progress: 40, color: '#336699' },
    ]
  },
  {
    id: 2,
    clientName: 'Jaxson Saris',
    email: 'jaxson.saris@email.com',
    phone: '+971 5 8909',
    projectName: 'Downtown Office',
    date: 'Aug 19, 2025',
    status: 'Completed',
    statusColor: '#259800',
    weeklyUpdates: [
      { week: 'Week 04', progress: 100, color: '#259800' },
      { week: 'Week 03', progress: 95, color: '#259800' },
      { week: 'Week 02', progress: 80, color: '#259800' },
      { week: 'Week 01', progress: 65, color: '#259800' },
    ]
  },
  {
    id: 3,
    clientName: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    phone: '+971 50 123 4567',
    projectName: 'Marina View Apartments',
    date: 'Aug 20, 2025',
    status: 'In progress',
    statusColor: '#FFA500',
    weeklyUpdates: [
      { week: 'Week 03', progress: 60, color: '#336699' },
      { week: 'Week 02', progress: 40, color: '#336699' },
      { week: 'Week 01', progress: 25, color: '#336699' },
    ]
  }
];