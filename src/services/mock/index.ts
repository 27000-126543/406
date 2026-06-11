import type {
  User,
  Device,
  WorkOrder,
  RepairRecord,
  Inventory,
  MaintenancePlan,
  CalibrationRecord,
  ScrapApplication,
  Message,
  InspectionPlan,
  WorkOrderStatus,
  DeviceStatus,
} from '../../types';
import {
  mockUsers,
  mockDevices,
  mockWorkOrders,
  mockRepairRecords,
  mockInventory,
  mockMaintenancePlans,
  mockCalibrationRecords,
  mockScrapApplications,
  mockMessages,
  mockInspectionPlans,
  saveMockDataToStorage,
} from './data';

const generateId = (prefix: string): string => {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
};

const delay = (ms: number = 300): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// 用户服务
export const userService = {
  async getAll(): Promise<User[]> {
    await delay();
    return [...mockUsers];
  },

  async getById(id: string): Promise<User | undefined> {
    await delay();
    return mockUsers.find((u) => u.id === id);
  },

  async getByRole(role: string): Promise<User[]> {
    await delay();
    return mockUsers.filter((u) => u.role === role);
  },

  async login(username: string, password: string, expectedRole?: string): Promise<User | null> {
    await delay(500);
    const user = mockUsers.find(
      (u) => u.username === username && u.status === 'active'
    );
    if (!user) return null;
    if (password !== (user.password || '123456')) return null;
    if (expectedRole && user.role !== expectedRole) return null;
    return user;
  },

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    await delay();
    const newUser: User = {
      ...user,
      id: generateId('u'),
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    saveMockDataToStorage();
    return newUser;
  },

  async update(id: string, updates: Partial<User>): Promise<User | undefined> {
    await delay();
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    mockUsers[index] = { ...mockUsers[index], ...updates };
    saveMockDataToStorage();
    return mockUsers[index];
  },

  async delete(id: string): Promise<boolean> {
    await delay();
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) return false;
    mockUsers.splice(index, 1);
    saveMockDataToStorage();
    return true;
  },
};

// 设备服务
export const deviceService = {
  async getAll(params?: {
    status?: DeviceStatus;
    department?: string;
    type?: string;
    keyword?: string;
  }): Promise<Device[]> {
    await delay();
    let devices = [...mockDevices];
    if (params?.status) {
      devices = devices.filter((d) => d.status === params.status);
    }
    if (params?.department) {
      devices = devices.filter((d) => d.department === params.department);
    }
    if (params?.type) {
      devices = devices.filter((d) => d.type === params.type);
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      devices = devices.filter(
        (d) =>
          d.name.toLowerCase().includes(kw) ||
          d.model.toLowerCase().includes(kw) ||
          d.serialNumber.toLowerCase().includes(kw)
      );
    }
    return devices;
  },

  async getById(id: string): Promise<Device | undefined> {
    await delay();
    return mockDevices.find((d) => d.id === id);
  },

  async getByQRCode(qrCode: string): Promise<Device | undefined> {
    await delay();
    return mockDevices.find((d) => d.qrCode === qrCode);
  },

  async getStatusSummary(): Promise<{
    total: number;
    normal: number;
    warning: number;
    fault: number;
    maintenance: number;
    calibrating: number;
    scrapped: number;
  }> {
    await delay();
    return {
      total: mockDevices.length,
      normal: mockDevices.filter((d) => d.status === 'normal').length,
      warning: mockDevices.filter((d) => d.status === 'warning').length,
      fault: mockDevices.filter((d) => d.status === 'fault').length,
      maintenance: mockDevices.filter((d) => d.status === 'maintenance').length,
      calibrating: mockDevices.filter((d) => d.status === 'calibrating').length,
      scrapped: mockDevices.filter((d) => d.status === 'scrapped').length,
    };
  },

  async create(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Promise<Device> {
    await delay();
    const now = new Date().toISOString();
    const newDevice: Device = {
      ...device,
      id: generateId('d'),
      createdAt: now,
      updatedAt: now,
    };
    mockDevices.push(newDevice);
    saveMockDataToStorage();
    return newDevice;
  },

  async update(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    await delay();
    const index = mockDevices.findIndex((d) => d.id === id);
    if (index === -1) return undefined;
    mockDevices[index] = {
      ...mockDevices[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveMockDataToStorage();
    return mockDevices[index];
  },

  async updateStatus(id: string, status: DeviceStatus): Promise<Device | undefined> {
    return this.update(id, { status });
  },

  async delete(id: string): Promise<boolean> {
    await delay();
    const index = mockDevices.findIndex((d) => d.id === id);
    if (index === -1) return false;
    mockDevices.splice(index, 1);
    saveMockDataToStorage();
    return true;
  },
};

// 工单服务
export const workOrderService = {
  async getAll(params?: {
    status?: WorkOrderStatus;
    type?: string;
    priority?: string;
    assigneeId?: string;
    department?: string;
  }): Promise<WorkOrder[]> {
    await delay();
    let orders = [...mockWorkOrders];
    if (params?.status) {
      orders = orders.filter((o) => o.status === params.status);
    }
    if (params?.type) {
      orders = orders.filter((o) => o.type === params.type);
    }
    if (params?.priority) {
      orders = orders.filter((o) => o.priority === params.priority);
    }
    if (params?.assigneeId) {
      orders = orders.filter((o) => o.assigneeId === params.assigneeId);
    }
    if (params?.department) {
      orders = orders.filter((o) => o.department === params.department);
    }
    return orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getById(id: string): Promise<WorkOrder | undefined> {
    await delay();
    return mockWorkOrders.find((o) => o.id === id);
  },

  async getByDeviceId(deviceId: string): Promise<WorkOrder[]> {
    await delay();
    return mockWorkOrders
      .filter((o) => o.deviceId === deviceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getStatusSummary(): Promise<{
    total: number;
    pending: number;
    assigned: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  }> {
    await delay();
    return {
      total: mockWorkOrders.length,
      pending: mockWorkOrders.filter((o) => o.status === 'pending').length,
      assigned: mockWorkOrders.filter((o) => o.status === 'assigned').length,
      in_progress: mockWorkOrders.filter((o) => o.status === 'in_progress').length,
      completed: mockWorkOrders.filter((o) => o.status === 'completed').length,
      cancelled: mockWorkOrders.filter((o) => o.status === 'cancelled').length,
    };
  },

  async create(
    order: Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<WorkOrder> {
    await delay();
    const now = new Date().toISOString();
    const newOrder: WorkOrder = {
      ...order,
      id: generateId('wo'),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    mockWorkOrders.unshift(newOrder);
    saveMockDataToStorage();
    return newOrder;
  },

  async update(
    id: string,
    updates: Partial<WorkOrder>
  ): Promise<WorkOrder | undefined> {
    await delay();
    const index = mockWorkOrders.findIndex((o) => o.id === id);
    if (index === -1) return undefined;
    mockWorkOrders[index] = {
      ...mockWorkOrders[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveMockDataToStorage();
    return mockWorkOrders[index];
  },

  async assign(
    id: string,
    assigneeId: string,
    assigneeName: string,
    options?: {
      backupAssigneeId?: string;
      backupAssigneeName?: string;
      isLocked?: boolean;
      autoReassignedCount?: number;
    }
  ): Promise<WorkOrder | undefined> {
    const updates: Partial<WorkOrder> = {
      assigneeId,
      assigneeName,
      status: 'assigned',
    };
    if (options?.backupAssigneeId) updates.backupAssigneeId = options.backupAssigneeId;
    if (options?.backupAssigneeName) updates.backupAssigneeName = options.backupAssigneeName;
    if (options?.isLocked !== undefined) updates.isLocked = options.isLocked;
    if (options?.autoReassignedCount !== undefined) updates.autoReassignedCount = options.autoReassignedCount;
    return this.update(id, updates);
  },

  async startProgress(id: string): Promise<WorkOrder | undefined> {
    return this.update(id, { status: 'in_progress' });
  },

  async complete(
    id: string,
    actualTime?: number
  ): Promise<WorkOrder | undefined> {
    const updates: Partial<WorkOrder> = {
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    if (actualTime) updates.actualTime = actualTime;
    return this.update(id, updates);
  },

  async cancel(id: string): Promise<WorkOrder | undefined> {
    return this.update(id, { status: 'cancelled' });
  },

  async delete(id: string): Promise<boolean> {
    await delay();
    const index = mockWorkOrders.findIndex((o) => o.id === id);
    if (index === -1) return false;
    mockWorkOrders.splice(index, 1);
    saveMockDataToStorage();
    return true;
  },
};

// 维修记录服务
export const repairRecordService = {
  async getAll(params?: {
    deviceId?: string;
    workOrderId?: string;
    status?: string;
  }): Promise<RepairRecord[]> {
    await delay();
    let records = [...mockRepairRecords];
    if (params?.deviceId) {
      records = records.filter((r) => r.deviceId === params.deviceId);
    }
    if (params?.workOrderId) {
      records = records.filter((r) => r.workOrderId === params.workOrderId);
    }
    if (params?.status) {
      records = records.filter((r) => r.status === params.status);
    }
    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getById(id: string): Promise<RepairRecord | undefined> {
    await delay();
    return mockRepairRecords.find((r) => r.id === id);
  },

  async getByDeviceId(deviceId: string): Promise<RepairRecord[]> {
    await delay();
    return mockRepairRecords
      .filter((r) => r.deviceId === deviceId)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  async getByWorkOrderId(workOrderId: string): Promise<RepairRecord[]> {
    await delay();
    return mockRepairRecords
      .filter((r) => r.workOrderId === workOrderId)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  async create(
    record: Omit<RepairRecord, 'id' | 'createdAt'>
  ): Promise<RepairRecord> {
    await delay();
    const newRecord: RepairRecord = {
      ...record,
      id: generateId('rr'),
      createdAt: new Date().toISOString(),
    };
    mockRepairRecords.unshift(newRecord);
    saveMockDataToStorage();
    return newRecord;
  },

  async update(
    id: string,
    updates: Partial<RepairRecord>
  ): Promise<RepairRecord | undefined> {
    await delay();
    const index = mockRepairRecords.findIndex((r) => r.id === id);
    if (index === -1) return undefined;
    mockRepairRecords[index] = { ...mockRepairRecords[index], ...updates };
    saveMockDataToStorage();
    return mockRepairRecords[index];
  },

  async approve(id: string): Promise<RepairRecord | undefined> {
    return this.update(id, { status: 'completed' });
  },
};

// 库存服务
export const inventoryService = {
  async getAll(params?: {
    category?: string;
    status?: string;
    keyword?: string;
  }): Promise<Inventory[]> {
    await delay();
    let items = [...mockInventory];
    if (params?.category) {
      items = items.filter((i) => i.category === params.category);
    }
    if (params?.status) {
      items = items.filter((i) => i.status === params.status);
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(kw) ||
          i.model.toLowerCase().includes(kw)
      );
    }
    return items;
  },

  async getById(id: string): Promise<Inventory | undefined> {
    await delay();
    return mockInventory.find((i) => i.id === id);
  },

  async getLowStockItems(): Promise<Inventory[]> {
    await delay();
    return mockInventory.filter(
      (i) => i.status === 'low_stock' || i.status === 'out_of_stock'
    );
  },

  async create(
    item: Omit<Inventory, 'id' | 'createdAt' | 'updatedAt' | 'totalValue'>
  ): Promise<Inventory> {
    await delay();
    const now = new Date().toISOString();
    const newItem: Inventory = {
      ...item,
      id: generateId('inv'),
      totalValue: item.quantity * item.unitPrice,
      createdAt: now,
      updatedAt: now,
    };
    mockInventory.push(newItem);
    saveMockDataToStorage();
    return newItem;
  },

  async update(
    id: string,
    updates: Partial<Inventory>
  ): Promise<Inventory | undefined> {
    await delay();
    const index = mockInventory.findIndex((i) => i.id === id);
    if (index === -1) return undefined;
    const updated = { ...mockInventory[index], ...updates };
    updated.totalValue = updated.quantity * updated.unitPrice;
    updated.updatedAt = new Date().toISOString();
    mockInventory[index] = updated;
    saveMockDataToStorage();
    return mockInventory[index];
  },

  async adjustStock(
    id: string,
    quantityChange: number
  ): Promise<Inventory | undefined> {
    const item = mockInventory.find((i) => i.id === id);
    if (!item) return undefined;
    const newQuantity = Math.max(0, item.quantity + quantityChange);
    let status: Inventory['status'] = 'normal';
    if (newQuantity === 0) status = 'out_of_stock';
    else if (newQuantity < item.minStock) status = 'low_stock';
    return this.update(id, {
      quantity: newQuantity,
      status,
      lastRestock: quantityChange > 0 ? new Date().toISOString().split('T')[0] : item.lastRestock,
    });
  },

  async delete(id: string): Promise<boolean> {
    await delay();
    const index = mockInventory.findIndex((i) => i.id === id);
    if (index === -1) return false;
    mockInventory.splice(index, 1);
    saveMockDataToStorage();
    return true;
  },
};

// 保养计划服务
export const maintenancePlanService = {
  async getAll(params?: {
    status?: string;
    deviceId?: string;
    assigneeId?: string;
  }): Promise<MaintenancePlan[]> {
    await delay();
    let plans = [...mockMaintenancePlans];
    if (params?.status) {
      plans = plans.filter((p) => p.status === params.status);
    }
    if (params?.deviceId) {
      plans = plans.filter((p) => p.deviceId === params.deviceId);
    }
    if (params?.assigneeId) {
      plans = plans.filter((p) => p.assigneeId === params.assigneeId);
    }
    return plans;
  },

  async getById(id: string): Promise<MaintenancePlan | undefined> {
    await delay();
    return mockMaintenancePlans.find((p) => p.id === id);
  },

  async getUpcoming(days: number = 7): Promise<MaintenancePlan[]> {
    await delay();
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return mockMaintenancePlans.filter(
      (p) =>
        p.status === 'active' &&
        new Date(p.nextDate) <= cutoff &&
        new Date(p.nextDate) >= now
    );
  },

  async create(
    plan: Omit<MaintenancePlan, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MaintenancePlan> {
    await delay();
    const now = new Date().toISOString();
    const newPlan: MaintenancePlan = {
      ...plan,
      id: generateId('mp'),
      createdAt: now,
      updatedAt: now,
    };
    mockMaintenancePlans.push(newPlan);
    saveMockDataToStorage();
    return newPlan;
  },

  async update(
    id: string,
    updates: Partial<MaintenancePlan>
  ): Promise<MaintenancePlan | undefined> {
    await delay();
    const index = mockMaintenancePlans.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    mockMaintenancePlans[index] = {
      ...mockMaintenancePlans[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveMockDataToStorage();
    return mockMaintenancePlans[index];
  },

  async complete(id: string): Promise<MaintenancePlan | undefined> {
    const plan = mockMaintenancePlans.find((p) => p.id === id);
    if (!plan) return undefined;
    const lastDate = new Date().toISOString().split('T')[0];
    let nextDate = '';
    const current = new Date(lastDate);
    switch (plan.frequency) {
      case 'daily':
        nextDate = new Date(current.getTime() + 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
      case 'weekly':
        nextDate = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
      case 'monthly':
        nextDate = new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          current.getDate()
        )
          .toISOString()
          .split('T')[0];
        break;
      case 'quarterly':
        nextDate = new Date(
          current.getFullYear(),
          current.getMonth() + 3,
          current.getDate()
        )
          .toISOString()
          .split('T')[0];
        break;
      case 'yearly':
        nextDate = new Date(
          current.getFullYear() + 1,
          current.getMonth(),
          current.getDate()
        )
          .toISOString()
          .split('T')[0];
        break;
    }
    return this.update(id, { lastDate, nextDate });
  },

  async toggleStatus(
    id: string
  ): Promise<MaintenancePlan | undefined> {
    const plan = mockMaintenancePlans.find((p) => p.id === id);
    if (!plan) return undefined;
    const newStatus = plan.status === 'active' ? 'paused' : 'active';
    return this.update(id, { status: newStatus });
  },
};

// 校准记录服务
export const calibrationRecordService = {
  async getAll(params?: {
    deviceId?: string;
    type?: string;
    result?: string;
  }): Promise<CalibrationRecord[]> {
    await delay();
    let records = [...mockCalibrationRecords];
    if (params?.deviceId) {
      records = records.filter((r) => r.deviceId === params.deviceId);
    }
    if (params?.type) {
      records = records.filter((r) => r.type === params.type);
    }
    if (params?.result) {
      records = records.filter((r) => r.result === params.result);
    }
    return records.sort(
      (a, b) =>
        new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime()
    );
  },

  async getById(id: string): Promise<CalibrationRecord | undefined> {
    await delay();
    return mockCalibrationRecords.find((r) => r.id === id);
  },

  async create(
    record: Omit<CalibrationRecord, 'id' | 'createdAt'>
  ): Promise<CalibrationRecord> {
    await delay();
    const newRecord: CalibrationRecord = {
      ...record,
      id: generateId('cr'),
      createdAt: new Date().toISOString(),
    };
    mockCalibrationRecords.unshift(newRecord);
    saveMockDataToStorage();
    return newRecord;
  },
};

// 报废申请服务
export const scrapApplicationService = {
  async getAll(params?: {
    status?: string;
    department?: string;
    applicantId?: string;
  }): Promise<ScrapApplication[]> {
    await delay();
    let apps = [...mockScrapApplications];
    if (params?.status) {
      apps = apps.filter((a) => a.status === params.status);
    }
    if (params?.department) {
      apps = apps.filter((a) => a.department === params.department);
    }
    if (params?.applicantId) {
      apps = apps.filter((a) => a.applicantId === params.applicantId);
    }
    return apps.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getById(id: string): Promise<ScrapApplication | undefined> {
    await delay();
    return mockScrapApplications.find((a) => a.id === id);
  },

  async create(
    app: Omit<ScrapApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<ScrapApplication> {
    await delay();
    const now = new Date().toISOString();
    const newApp: ScrapApplication = {
      ...app,
      id: generateId('sa'),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    mockScrapApplications.unshift(newApp);
    saveMockDataToStorage();
    return newApp;
  },

  async update(
    id: string,
    updates: Partial<ScrapApplication>
  ): Promise<ScrapApplication | undefined> {
    await delay();
    const index = mockScrapApplications.findIndex((a) => a.id === id);
    if (index === -1) return undefined;
    mockScrapApplications[index] = {
      ...mockScrapApplications[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveMockDataToStorage();
    return mockScrapApplications[index];
  },

  async approve(
    id: string,
    approverId: string,
    approverName: string,
    comments?: string
  ): Promise<ScrapApplication | undefined> {
    return this.update(id, {
      status: 'approved',
      approverId,
      approverName,
      approvalDate: new Date().toISOString().split('T')[0],
      approvalComments: comments,
    });
  },

  async reject(
    id: string,
    approverId: string,
    approverName: string,
    comments: string
  ): Promise<ScrapApplication | undefined> {
    return this.update(id, {
      status: 'rejected',
      approverId,
      approverName,
      approvalDate: new Date().toISOString().split('T')[0],
      approvalComments: comments,
    });
  },

  async complete(id: string): Promise<ScrapApplication | undefined> {
    return this.update(id, {
      status: 'completed',
      scrapDate: new Date().toISOString().split('T')[0],
    });
  },
};

// 消息服务
export const messageService = {
  async getByReceiver(receiverId: string, params?: {
    isRead?: boolean;
    type?: string;
  }): Promise<Message[]> {
    await delay();
    let messages = mockMessages.filter((m) => m.receiverId === receiverId);
    if (params?.isRead !== undefined) {
      messages = messages.filter((m) => m.isRead === params.isRead);
    }
    if (params?.type) {
      messages = messages.filter((m) => m.type === params.type);
    }
    return messages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getUnreadCount(receiverId: string): Promise<number> {
    await delay();
    return mockMessages.filter((m) => m.receiverId === receiverId && !m.isRead).length;
  },

  async create(
    message: Omit<Message, 'id' | 'isRead' | 'createdAt'>
  ): Promise<Message> {
    await delay();
    const newMessage: Message = {
      ...message,
      id: generateId('msg'),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    mockMessages.unshift(newMessage);
    saveMockDataToStorage();
    return newMessage;
  },

  async markAsRead(id: string): Promise<Message | undefined> {
    await delay();
    const index = mockMessages.findIndex((m) => m.id === id);
    if (index === -1) return undefined;
    mockMessages[index] = {
      ...mockMessages[index],
      isRead: true,
      readAt: new Date().toISOString(),
    };
    saveMockDataToStorage();
    return mockMessages[index];
  },

  async markAllAsRead(receiverId: string): Promise<number> {
    await delay();
    let count = 0;
    mockMessages.forEach((m, index) => {
      if (m.receiverId === receiverId && !m.isRead) {
        mockMessages[index] = {
          ...m,
          isRead: true,
          readAt: new Date().toISOString(),
        };
        count++;
      }
    });
    if (count > 0) saveMockDataToStorage();
    return count;
  },
};

// 巡检计划服务
export const inspectionPlanService = {
  async getAll(params?: {
    status?: string;
    department?: string;
    type?: string;
    assigneeId?: string;
  }): Promise<InspectionPlan[]> {
    await delay();
    let plans = [...mockInspectionPlans];
    if (params?.status) {
      plans = plans.filter((p) => p.status === params.status);
    }
    if (params?.department) {
      plans = plans.filter((p) => p.department === params.department);
    }
    if (params?.type) {
      plans = plans.filter((p) => p.type === params.type);
    }
    if (params?.assigneeId) {
      plans = plans.filter((p) => p.assigneeId === params.assigneeId);
    }
    return plans;
  },

  async getById(id: string): Promise<InspectionPlan | undefined> {
    await delay();
    return mockInspectionPlans.find((p) => p.id === id);
  },

  async getUpcoming(days: number = 7): Promise<InspectionPlan[]> {
    await delay();
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return mockInspectionPlans.filter(
      (p) =>
        p.status === 'active' &&
        new Date(p.nextInspection) <= cutoff &&
        new Date(p.nextInspection) >= now
    );
  },

  async create(
    plan: Omit<InspectionPlan, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<InspectionPlan> {
    await delay();
    const now = new Date().toISOString();
    const newPlan: InspectionPlan = {
      ...plan,
      id: generateId('ip'),
      createdAt: now,
      updatedAt: now,
    };
    mockInspectionPlans.push(newPlan);
    saveMockDataToStorage();
    return newPlan;
  },

  async update(
    id: string,
    updates: Partial<InspectionPlan>
  ): Promise<InspectionPlan | undefined> {
    await delay();
    const index = mockInspectionPlans.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    mockInspectionPlans[index] = {
      ...mockInspectionPlans[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveMockDataToStorage();
    return mockInspectionPlans[index];
  },

  async complete(id: string): Promise<InspectionPlan | undefined> {
    const plan = mockInspectionPlans.find((p) => p.id === id);
    if (!plan) return undefined;
    const lastInspection = new Date().toISOString().split('T')[0];
    let nextInspection = '';
    const current = new Date(lastInspection);
    switch (plan.frequency) {
      case 'daily':
        nextInspection = new Date(current.getTime() + 1 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
      case 'weekly':
        nextInspection = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        break;
      case 'monthly':
        nextInspection = new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          current.getDate()
        )
          .toISOString()
          .split('T')[0];
        break;
      case 'quarterly':
        nextInspection = new Date(
          current.getFullYear(),
          current.getMonth() + 3,
          current.getDate()
        )
          .toISOString()
          .split('T')[0];
        break;
    }
    return this.update(id, { lastInspection, nextInspection });
  },

  async toggleStatus(id: string): Promise<InspectionPlan | undefined> {
    const plan = mockInspectionPlans.find((p) => p.id === id);
    if (!plan) return undefined;
    const newStatus = plan.status === 'active' ? 'paused' : 'active';
    return this.update(id, { status: newStatus });
  },
};
