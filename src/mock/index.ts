export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'engineer' | 'manager' | 'user';
  phone: string;
  email: string;
  avatar?: string;
  department: string;
  skills?: string[];
}

export interface Device {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  purchaseDate: string;
  warrantyExpire: string;
  status: 'normal' | 'warning' | 'fault' | 'maintenance' | 'scrapped';
  location: string;
  department: string;
  lastMaintenance: string;
  nextMaintenance: string;
  qrCode: string;
  specifications: Record<string, string>;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  deviceId: string;
  deviceName: string;
  type: 'repair' | 'maintenance' | 'inspection' | 'install';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'accepted' | 'processing' | 'completed' | 'cancelled' | 'transferred';
  reporterId: string;
  reporterName: string;
  assigneeId?: string;
  assigneeName?: string;
  parts?: WorkOrderPart[];
  estimatedTime?: number;
  actualTime?: number;
  createdAt: string;
  assignedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
  transferCount: number;
  transferHistory?: TransferRecord[];
  failureAnalysis?: string;
  solution?: string;
  images?: string[];
}

export interface WorkOrderPart {
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  inStock: boolean;
}

export interface TransferRecord {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  reason: string;
  timestamp: string;
}

export interface Message {
  id: string;
  type: 'system' | 'notification' | 'workorder' | 'device';
  title: string;
  content: string;
  senderId?: string;
  senderName?: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
}

export interface PartInventory {
  id: string;
  name: string;
  model: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
}

const mockUsers: User[] = [
  { id: '1', username: 'admin', name: '系统管理员', role: 'admin', phone: '13800138000', email: 'admin@hospital.com', department: '信息科', skills: ['系统管理', '网络维护'] },
  { id: '2', username: 'engineer1', name: '张工', role: 'engineer', phone: '13800138001', email: 'zhang@hospital.com', department: '设备科', skills: ['影像设备', '电子设备'] },
  { id: '3', username: 'engineer2', name: '李工', role: 'engineer', phone: '13800138002', email: 'li@hospital.com', department: '设备科', skills: ['检验设备', '生命支持设备'] },
  { id: '4', username: 'manager1', name: '王主任', role: 'manager', phone: '13800138003', email: 'wang@hospital.com', department: '设备科' },
  { id: '5', username: 'user1', name: '刘护士', role: 'user', phone: '13800138004', email: 'liu@hospital.com', department: '内科' },
];

const mockDevices: Device[] = [
  {
    id: 'D001',
    name: 'CT扫描仪',
    model: 'SOMATOM Force',
    serialNumber: 'SN-CT-2023-0001',
    manufacturer: '西门子',
    purchaseDate: '2023-01-15',
    warrantyExpire: '2026-01-14',
    status: 'normal',
    location: '放射科-1号机房',
    department: '放射科',
    lastMaintenance: '2025-12-01',
    nextMaintenance: '2026-02-01',
    qrCode: 'D001-SN-CT-2023-0001',
    specifications: { '扫描层数': '128层', '扫描时间': '0.25秒/圈', '孔径': '78cm' },
    createdAt: '2023-01-20',
  },
  {
    id: 'D002',
    name: '核磁共振仪',
    model: 'MAGNETOM Vida',
    serialNumber: 'SN-MRI-2022-0001',
    manufacturer: '西门子',
    purchaseDate: '2022-06-10',
    warrantyExpire: '2025-06-09',
    status: 'warning',
    location: '放射科-2号机房',
    department: '放射科',
    lastMaintenance: '2025-11-15',
    nextMaintenance: '2026-01-15',
    qrCode: 'D002-SN-MRI-2022-0001',
    specifications: { '磁场强度': '3.0T', '孔径': '70cm', '静音技术': '支持' },
    createdAt: '2022-06-20',
  },
  {
    id: 'D003',
    name: '全自动生化分析仪',
    model: 'AU5800',
    serialNumber: 'SN-LAB-2023-0001',
    manufacturer: '贝克曼库尔特',
    purchaseDate: '2023-03-20',
    warrantyExpire: '2026-03-19',
    status: 'fault',
    location: '检验科-生化室',
    department: '检验科',
    lastMaintenance: '2025-12-10',
    nextMaintenance: '2026-03-10',
    qrCode: 'D003-SN-LAB-2023-0001',
    specifications: { '测试速度': '2000测试/小时', '样本位': '200个', '试剂位': '40个' },
    createdAt: '2023-03-25',
  },
  {
    id: 'D004',
    name: '呼吸机',
    model: 'Servo-i',
    serialNumber: 'SN-ICU-2024-0001',
    manufacturer: '迈柯唯',
    purchaseDate: '2024-02-01',
    warrantyExpire: '2027-01-31',
    status: 'maintenance',
    location: 'ICU-1床',
    department: 'ICU',
    lastMaintenance: '2025-10-01',
    nextMaintenance: '2026-01-01',
    qrCode: 'D004-SN-ICU-2024-0001',
    specifications: { '通气模式': '多种', '潮气量': '2-2000ml', '呼吸频率': '1-100次/分' },
    createdAt: '2024-02-10',
  },
  {
    id: 'D005',
    name: 'X光机',
    model: 'DR-F',
    serialNumber: 'SN-XRAY-2021-0001',
    manufacturer: 'GE医疗',
    purchaseDate: '2021-08-15',
    warrantyExpire: '2024-08-14',
    status: 'normal',
    location: '放射科-3号机房',
    department: '放射科',
    lastMaintenance: '2025-11-20',
    nextMaintenance: '2026-02-20',
    qrCode: 'D005-SN-XRAY-2021-0001',
    specifications: { '功率': '50kW', '探测器': '无线平板', '像素': '3072x3072' },
    createdAt: '2021-08-20',
  },
];

const mockWorkOrders: WorkOrder[] = [
  {
    id: 'WO202601001',
    title: 'CT扫描仪图像模糊',
    description: '最近一周CT扫描图像出现模糊现象，影响诊断准确性，需要紧急检修。',
    deviceId: 'D001',
    deviceName: 'CT扫描仪',
    type: 'repair',
    priority: 'high',
    status: 'processing',
    reporterId: '5',
    reporterName: '刘护士',
    assigneeId: '2',
    assigneeName: '张工',
    estimatedTime: 120,
    actualTime: 90,
    createdAt: '2026-01-10 09:30:00',
    assignedAt: '2026-01-10 09:35:00',
    acceptedAt: '2026-01-10 09:40:00',
    startedAt: '2026-01-10 10:00:00',
    deadline: '2026-01-10 14:00:00',
    transferCount: 0,
  },
  {
    id: 'WO202601002',
    title: '生化分析仪报警E-101',
    description: '设备开机后显示E-101错误代码，无法进行样本检测，检验科工作受阻。',
    deviceId: 'D003',
    deviceName: '全自动生化分析仪',
    type: 'repair',
    priority: 'urgent',
    status: 'assigned',
    reporterId: '5',
    reporterName: '刘护士',
    assigneeId: '3',
    assigneeName: '李工',
    estimatedTime: 180,
    createdAt: '2026-01-10 08:00:00',
    assignedAt: '2026-01-10 08:05:00',
    deadline: '2026-01-10 12:00:00',
    transferCount: 0,
  },
  {
    id: 'WO202601003',
    title: '核磁共振仪季度保养',
    description: '按照保养计划进行季度维护，包括冷却系统检查、磁体匀场校准等。',
    deviceId: 'D002',
    deviceName: '核磁共振仪',
    type: 'maintenance',
    priority: 'medium',
    status: 'pending',
    reporterId: '4',
    reporterName: '王主任',
    estimatedTime: 240,
    createdAt: '2026-01-09 14:00:00',
    deadline: '2026-01-15 18:00:00',
    transferCount: 0,
  },
  {
    id: 'WO202601004',
    title: '呼吸机预防性维护',
    description: '对呼吸机进行全面检查，更换过滤棉，校准流量传感器和氧浓度。',
    deviceId: 'D004',
    deviceName: '呼吸机',
    type: 'maintenance',
    priority: 'low',
    status: 'completed',
    reporterId: '4',
    reporterName: '王主任',
    assigneeId: '3',
    assigneeName: '李工',
    estimatedTime: 60,
    actualTime: 75,
    createdAt: '2026-01-05 10:00:00',
    assignedAt: '2026-01-05 10:10:00',
    acceptedAt: '2026-01-05 10:15:00',
    startedAt: '2026-01-05 14:00:00',
    completedAt: '2026-01-05 15:15:00',
    transferCount: 0,
    failureAnalysis: '预防性维护，无故障',
    solution: '更换过滤棉，校准流量传感器，测试氧浓度正常',
  },
];

const mockMessages: Message[] = [
  {
    id: 'M001',
    type: 'workorder',
    title: '新工单分配',
    content: '您有一个新的工单 WO202601002 已分配，请及时处理。',
    senderId: '1',
    senderName: '系统管理员',
    receiverId: '3',
    read: false,
    createdAt: '2026-01-10 08:05:00',
    relatedId: 'WO202601002',
    relatedType: 'workorder',
  },
  {
    id: 'M002',
    type: 'device',
    title: '设备状态告警',
    content: '核磁共振仪（D002）检测到异常，状态已更新为警告，请关注。',
    senderId: '1',
    senderName: '系统管理员',
    receiverId: '4',
    read: false,
    createdAt: '2026-01-10 07:00:00',
    relatedId: 'D002',
    relatedType: 'device',
  },
  {
    id: 'M003',
    type: 'system',
    title: '系统维护通知',
    content: '系统将于今晚22:00-24:00进行例行维护，期间可能影响部分功能。',
    senderId: '1',
    senderName: '系统管理员',
    receiverId: '2',
    read: true,
    createdAt: '2026-01-09 16:00:00',
  },
  {
    id: 'M004',
    type: 'workorder',
    title: '工单完成提醒',
    content: '工单 WO202601004 已完成，维修时间75分钟，请确认。',
    senderId: '3',
    senderName: '李工',
    receiverId: '4',
    read: true,
    createdAt: '2026-01-05 15:15:00',
    relatedId: 'WO202601004',
    relatedType: 'workorder',
  },
];

const mockPartInventory: PartInventory[] = [
  { id: 'P001', name: 'X光球管', model: 'XRT-2000', stock: 2, minStock: 1, unit: '个', price: 25000 },
  { id: 'P002', name: 'CT探测器', model: 'CTD-128', stock: 1, minStock: 1, unit: '个', price: 120000 },
  { id: 'P003', name: '流量传感器', model: 'FS-100', stock: 5, minStock: 3, unit: '个', price: 800 },
  { id: 'P004', name: '氧电池', model: 'O2-500', stock: 3, minStock: 2, unit: '个', price: 1200 },
  { id: 'P005', name: '过滤棉（呼吸机）', model: 'FM-V', stock: 20, minStock: 10, unit: '包', price: 50 },
  { id: 'P006', name: '生化仪探针', model: 'BP-200', stock: 4, minStock: 2, unit: '个', price: 3500 },
];

export const mockService = {
  async login(username: string, password: string): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = mockUsers.find(u => u.username === username);
    if (user && password === '123456') {
      return { ...user };
    }
    return null;
  },

  async getUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockUsers];
  },

  async getUserById(id: string): Promise<User | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockUsers.find(u => u.id === id);
  },

  async getEngineers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockUsers.filter(u => u.role === 'engineer');
  },

  async getDevices(): Promise<Device[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockDevices];
  },

  async getDeviceById(id: string): Promise<Device | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockDevices.find(d => d.id === id);
  },

  async createDevice(device: Omit<Device, 'id' | 'qrCode' | 'createdAt'>): Promise<Device> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newId = `D${String(mockDevices.length + 1).padStart(3, '0')}`;
    const newDevice: Device = {
      ...device,
      id: newId,
      qrCode: `${newId}-${device.serialNumber}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    mockDevices.push(newDevice);
    return newDevice;
  },

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockDevices.findIndex(d => d.id === id);
    if (index !== -1) {
      mockDevices[index] = { ...mockDevices[index], ...updates };
      return mockDevices[index];
    }
    return null;
  },

  async deleteDevice(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockDevices.findIndex(d => d.id === id);
    if (index !== -1) {
      mockDevices.splice(index, 1);
      return true;
    }
    return false;
  },

  async getWorkOrders(): Promise<WorkOrder[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockWorkOrders];
  },

  async getWorkOrderById(id: string): Promise<WorkOrder | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockWorkOrders.find(w => w.id === id);
  },

  async createWorkOrder(workOrder: Omit<WorkOrder, 'id' | 'status' | 'transferCount'>): Promise<WorkOrder> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const newId = `WO${datePrefix}${String(mockWorkOrders.length + 1).padStart(3, '0')}`;
    const newWorkOrder: WorkOrder = {
      ...workOrder,
      id: newId,
      status: 'pending',
      transferCount: 0,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    mockWorkOrders.push(newWorkOrder);
    return newWorkOrder;
  },

  async updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockWorkOrders.findIndex(w => w.id === id);
    if (index !== -1) {
      mockWorkOrders[index] = { ...mockWorkOrders[index], ...updates };
      return mockWorkOrders[index];
    }
    return null;
  },

  async getMessages(): Promise<Message[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...mockMessages];
  },

  async getMessagesByReceiver(receiverId: string): Promise<Message[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockMessages.filter(m => m.receiverId === receiverId);
  },

  async sendMessage(message: Omit<Message, 'id' | 'read' | 'createdAt'>): Promise<Message> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const newMessage: Message = {
      ...message,
      id: `M${String(mockMessages.length + 1).padStart(3, '0')}`,
      read: false,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    mockMessages.push(newMessage);
    return newMessage;
  },

  async markMessageRead(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const message = mockMessages.find(m => m.id === id);
    if (message) {
      message.read = true;
      return true;
    }
    return false;
  },

  async markAllMessagesRead(receiverId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 300));
    let count = 0;
    mockMessages.forEach(m => {
      if (m.receiverId === receiverId && !m.read) {
        m.read = true;
        count++;
      }
    });
    return count;
  },

  async getPartInventory(): Promise<PartInventory[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...mockPartInventory];
  },

  async checkPartStock(partId: string, quantity: number): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const part = mockPartInventory.find(p => p.id === partId);
    return part ? part.stock >= quantity : false;
  },

  async deductPartStock(partId: string, quantity: number): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const part = mockPartInventory.find(p => p.id === partId);
    if (part && part.stock >= quantity) {
      part.stock -= quantity;
      return true;
    }
    return false;
  },
};

export type RoleType = User['role'];

export const rolePermissions: Record<RoleType, string[]> = {
  admin: ['all'],
  manager: ['workorder:view', 'workorder:assign', 'workorder:transfer', 'device:view', 'device:manage', 'user:view', 'report:view'],
  engineer: ['workorder:view', 'workorder:accept', 'workorder:process', 'workorder:complete', 'device:view', 'device:maintenance'],
  user: ['workorder:create', 'workorder:view', 'device:view'],
};
