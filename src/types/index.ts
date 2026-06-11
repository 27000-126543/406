export type UserRole = 'director' | 'engineer' | 'nurse' | 'finance' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  phone: string;
  email: string;
  avatar?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export type DeviceStatus = 'normal' | 'warning' | 'fault' | 'maintenance' | 'scrapped' | 'calibrating';

export interface Device {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  type: string;
  department: string;
  location: string;
  status: DeviceStatus;
  purchaseDate: string;
  warrantyExpire: string;
  purchasePrice: number;
  currentValue: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  lastCalibration?: string;
  nextCalibration?: string;
  qrCode?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QRCode {
  id: string;
  deviceId: string;
  code: string;
  url: string;
  createdAt: string;
  expiresAt?: string;
}

export type WorkOrderStatus = 'pending' | 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkOrder {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'repair' | 'maintenance' | 'calibration' | 'inspection';
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reporterId: string;
  reporterName: string;
  assigneeId?: string;
  assigneeName?: string;
  department: string;
  location: string;
  estimatedTime?: number;
  actualTime?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepairRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  workOrderId: string;
  faultDescription: string;
  diagnosis: string;
  solution: string;
  partsUsed: RepairPart[];
  technicianId: string;
  technicianName: string;
  startTime: string;
  endTime: string;
  totalCost: number;
  warranty: boolean;
  status: 'completed' | 'pending_approval';
  remarks?: string;
  createdAt: string;
}

export interface RepairPart {
  id: string;
  name: string;
  model: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fromInventory: boolean;
}

export interface Inventory {
  id: string;
  name: string;
  model: string;
  category: string;
  manufacturer: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  totalValue: number;
  location: string;
  lastRestock?: string;
  expiryDate?: string;
  status: 'normal' | 'low_stock' | 'out_of_stock' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface MaintenancePlan {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'preventive' | 'corrective' | 'predictive';
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastDate?: string;
  nextDate: string;
  assigneeId?: string;
  assigneeName?: string;
  status: 'active' | 'paused' | 'completed';
  checkItems: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'internal' | 'external';
  calibrationDate: string;
  nextCalibrationDate: string;
  calibrationAgency: string;
  calibrationPerson: string;
  certificateNumber: string;
  certificateUrl?: string;
  result: 'pass' | 'fail' | 'conditional';
  deviation?: string;
  remarks?: string;
  cost: number;
  createdAt: string;
}

export interface ScrapApplication {
  id: string;
  deviceId: string;
  deviceName: string;
  model: string;
  serialNumber: string;
  reason: string;
  applicantId: string;
  applicantName: string;
  department: string;
  applicationDate: string;
  estimatedValue: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approverId?: string;
  approverName?: string;
  approvalDate?: string;
  approvalComments?: string;
  scrapDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderPart {
  id?: string;
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  inStock: boolean;
}

export interface Message {
  id: string;
  receiverId: string;
  type: 'system' | 'work_order' | 'device' | 'inventory' | 'approval' | 'maintenance' | 'calibration' | 'scrap';
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface InspectionPlan {
  id: string;
  title: string;
  type: 'routine' | 'special' | 'safety';
  description: string;
  department: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastInspection?: string;
  nextInspection: string;
  assigneeId?: string;
  assigneeName?: string;
  status: 'active' | 'paused' | 'completed';
  checkItems: InspectionCheckItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InspectionCheckItem {
  id: string;
  name: string;
  description: string;
  standard: string;
  isRequired: boolean;
}
