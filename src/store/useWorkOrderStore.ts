import { create } from 'zustand';
import type { User, WorkOrder, Inventory, RepairRecord, RepairPart } from '@/types';
import {
  userService,
  workOrderService,
  inventoryService,
  messageService,
  repairRecordService,
  deviceService,
} from '@/services/mock';
import { useAuthStore } from './useAuthStore';
import { useMessageStore } from './useMessageStore';

const AUTO_TRANSFER_TIMEOUT = 15 * 60 * 1000;

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

interface EngineerScore {
  engineer: User;
  score: number;
  successRate: number;
  currentWorkload: number;
  deptMatch: boolean;
}

interface WorkOrderState {
  workOrders: WorkOrder[];
  currentWorkOrder: WorkOrder | null;
  engineers: User[];
  partInventory: Inventory[];
  loading: boolean;
  error: string | null;
  transferTimers: Map<string, number>;
  transferHistory: Map<string, TransferRecord[]>;
}

interface WorkOrderActions {
  fetchWorkOrders: () => Promise<void>;
  fetchWorkOrderById: (id: string) => Promise<WorkOrder | undefined>;
  selectWorkOrder: (workOrder: WorkOrder | null) => void;
  createRepair: (
    data: Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
      faultCode?: string;
      faultPhotos?: string[];
    }
  ) => Promise<WorkOrder | null>;
  smartDispatch: (workOrderId: string) => Promise<{ assignee: User | null; backup: User | null }>;
  assignWorkOrder: (
    workOrderId: string,
    engineerId: string,
    options?: {
      backupAssigneeId?: string;
      isLocked?: boolean;
      autoReassignedCount?: number;
    }
  ) => Promise<boolean>;
  acceptWorkOrder: (workOrderId: string) => Promise<boolean>;
  startRepair: (workOrderId: string) => Promise<boolean>;
  completeWorkOrder: (
    workOrderId: string,
    data: {
      actualTime: number;
      failureAnalysis: string;
      solution: string;
      parts?: WorkOrderPart[];
      images?: string[];
      beforePhotos?: string[];
      afterPhotos?: string[];
    }
  ) => Promise<RepairRecord | null>;
  transferWorkOrder: (
    workOrderId: string,
    toEngineerId: string,
    reason: string
  ) => Promise<boolean>;
  cancelWorkOrder: (workOrderId: string, reason: string) => Promise<boolean>;
  checkPartsStock: (parts: WorkOrderPart[]) => Promise<{
    available: boolean;
    insufficientParts: WorkOrderPart[];
  }>;
  fetchEngineers: () => Promise<void>;
  fetchPartInventory: () => Promise<void>;
  checkAndTransfer: (workOrderId: string) => Promise<void>;
  startAutoTransferMonitor: () => void;
  stopAutoTransferMonitor: () => void;
  clearError: () => void;
  reset: () => void;
}

const calculateEngineerSuccessRate = (engineerId: string, workOrders: WorkOrder[]): number => {
  const engineerOrders = workOrders.filter(
    (w) => w.assigneeId === engineerId && ['completed', 'cancelled'].includes(w.status)
  );
  if (engineerOrders.length === 0) return 0.85;
  const completed = engineerOrders.filter((w) => w.status === 'completed').length;
  return completed / engineerOrders.length;
};

export const useWorkOrderStore = create<WorkOrderState & WorkOrderActions>(
  (set, get) => ({
    workOrders: [],
    currentWorkOrder: null,
    engineers: [],
    partInventory: [],
    loading: false,
    error: null,
    transferTimers: new Map(),
    transferHistory: new Map(),

    fetchWorkOrders: async () => {
      set({ loading: true, error: null });
      try {
        const workOrders = await workOrderService.getAll();
        set({ workOrders, loading: false });
      } catch {
        set({ error: '获取工单列表失败', loading: false });
      }
    },

    fetchWorkOrderById: async (id) => {
      set({ loading: true, error: null });
      try {
        const workOrder = await workOrderService.getById(id);
        if (workOrder) {
          set({ currentWorkOrder: workOrder, loading: false });
        } else {
          set({ error: '工单不存在', loading: false });
        }
        return workOrder;
      } catch {
        set({ error: '获取工单信息失败', loading: false });
        return undefined;
      }
    },

    selectWorkOrder: (workOrder) => {
      set({ currentWorkOrder: workOrder });
    },

    createRepair: async (data) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      try {
        const workOrder = await workOrderService.create({
          ...data,
          reporterId: currentUser?.id || data.reporterId,
          reporterName: currentUser?.name || data.reporterName,
          faultCode: data.faultCode,
          faultPhotos: data.faultPhotos,
          autoReassignedCount: 0,
        } as any);

        const workOrderId = workOrder.id;
        const updatedWorkOrder = await workOrderService.update(workOrderId, {
          faultCode: data.faultCode,
          faultPhotos: data.faultPhotos,
          autoReassignedCount: 0,
        });

        const finalWorkOrder = updatedWorkOrder || workOrder;

        set((state) => ({
          workOrders: [finalWorkOrder, ...state.workOrders],
          loading: false,
        }));

        const { assignee, backup } = await get().smartDispatch(workOrderId);

        if (assignee) {
          await get().assignWorkOrder(workOrderId, assignee.id, {
            backupAssigneeId: backup?.id,
            isLocked: true,
          });

          const { sendMessage } = useMessageStore.getState();
          await sendMessage({
            type: 'work_order',
            title: '新工单待处理',
            content: `您有新工单待处理 - ${finalWorkOrder.deviceName}`,
            receiverId: assignee.id,
            relatedId: workOrderId,
            relatedType: 'workorder',
          });

          await sendMessage({
            type: 'work_order',
            title: '工单已派单',
            content: `工单已派单 - ${workOrderId}`,
            receiverId: finalWorkOrder.reporterId,
            relatedId: workOrderId,
            relatedType: 'workorder',
          });
        }

        const refreshedOrders = await workOrderService.getAll();
        set({ workOrders: refreshedOrders });
        const refreshed = await workOrderService.getById(workOrderId);
        return refreshed || finalWorkOrder;
      } catch {
        set({ error: '创建报修单失败', loading: false });
        return null;
      }
    },

    smartDispatch: async (workOrderId) => {
      set({ loading: true, error: null });
      const { workOrders, engineers, fetchEngineers } = get();

      if (engineers.length === 0) {
        await fetchEngineers();
      }

      const workOrder = workOrders.find((w) => w.id === workOrderId);
      const currentEngineers = get().engineers;
      const allWorkOrders = get().workOrders;

      if (!workOrder) {
        set({ error: '工单不存在', loading: false });
        return { assignee: null, backup: null };
      }

      if (currentEngineers.length === 0) {
        set({ error: '没有可用工程师', loading: false });
        return { assignee: null, backup: null };
      }

      const scoredEngineers: EngineerScore[] = currentEngineers.map((engineer) => {
        let score = 0;

        const successRate = calculateEngineerSuccessRate(engineer.id, allWorkOrders);
        score += successRate * 50;

        const currentWorkload = allWorkOrders.filter(
          (w) =>
            w.assigneeId === engineer.id &&
            ['assigned', 'in_progress'].includes(w.status)
        ).length;
        score -= currentWorkload * 10;

        const deptMatch = engineer.department === workOrder.department;
        if (deptMatch) {
          score += 30;
        }

        if (workOrder.priority === 'urgent' || workOrder.priority === 'high') {
          score += 10;
        }

        return {
          engineer,
          score,
          successRate,
          currentWorkload,
          deptMatch,
        };
      });

      scoredEngineers.sort((a, b) => b.score - a.score);

      const bestEngineer = scoredEngineers[0]?.engineer || null;
      const backupEngineer = scoredEngineers[1]?.engineer || null;

      set({ loading: false });
      return { assignee: bestEngineer, backup: backupEngineer };
    },

    assignWorkOrder: async (workOrderId, engineerId, options) => {
      set({ loading: true, error: null });
      const { engineers, fetchEngineers } = get();

      if (engineers.length === 0) {
        await fetchEngineers();
      }

      const engineer = get().engineers.find((e) => e.id === engineerId);
      if (!engineer) {
        set({ error: '工程师不存在', loading: false });
        return false;
      }

      const backupEngineer = options?.backupAssigneeId
        ? get().engineers.find((e) => e.id === options.backupAssigneeId)
        : undefined;

      const updatedWorkOrder = await workOrderService.assign(
        workOrderId,
        engineerId,
        engineer.name,
        {
          backupAssigneeId: options?.backupAssigneeId,
          backupAssigneeName: backupEngineer?.name,
          isLocked: options?.isLocked,
          autoReassignedCount: options?.autoReassignedCount,
        }
      );

      if (updatedWorkOrder) {
        set((state) => ({
          workOrders: state.workOrders.map((w) =>
            w.id === workOrderId ? updatedWorkOrder : w
          ),
          currentWorkOrder:
            state.currentWorkOrder?.id === workOrderId
              ? updatedWorkOrder
              : state.currentWorkOrder,
          loading: false,
        }));

        const timers = get().transferTimers;
        const existingTimer = timers.get(workOrderId);
        if (existingTimer) {
          window.clearTimeout(existingTimer);
        }

        const timerId = window.setTimeout(() => {
          get().checkAndTransfer(workOrderId);
        }, AUTO_TRANSFER_TIMEOUT);

        set((state) => {
          const newTimers = new Map(state.transferTimers);
          newTimers.set(workOrderId, timerId);
          return { transferTimers: newTimers };
        });

        return true;
      }

      set({ error: '分配工单失败', loading: false });
      return false;
    },

    checkAndTransfer: async (workOrderId) => {
      const { workOrders, engineers, transferTimers, transferHistory } = get();
      const workOrder = workOrders.find((w) => w.id === workOrderId);

      if (!workOrder || workOrder.status !== 'assigned') {
        set((state) => {
          const newTimers = new Map(state.transferTimers);
          newTimers.delete(workOrderId);
          return { transferTimers: newTimers };
        });
        return;
      }

      const history = transferHistory.get(workOrderId) || [];
      if (history.length >= 3) {
        const { sendMessage } = useMessageStore.getState();
        const director = useAuthStore.getState().users.find((u) => u.role === 'director');
        await sendMessage({
          type: 'system',
          title: '工单转派超限',
          content: `工单 ${workOrderId} 已自动转派3次，请管理员介入处理。`,
          receiverId: director?.id || 'u001',
          relatedId: workOrderId,
          relatedType: 'workorder',
        });
        return;
      }

      let nextEngineer: User | undefined;

      if (workOrder.backupAssigneeId) {
        nextEngineer = engineers.find((e) => e.id === workOrder.backupAssigneeId);
      }

      if (!nextEngineer) {
        const otherEngineers = engineers.filter(
          (e) => e.id !== workOrder.assigneeId
        );
        if (otherEngineers.length > 0) {
          const allWorkOrders = get().workOrders;
          const scored = otherEngineers.map((e) => {
            const successRate = calculateEngineerSuccessRate(e.id, allWorkOrders);
            const workload = allWorkOrders.filter(
              (w) => w.assigneeId === e.id && ['assigned', 'in_progress'].includes(w.status)
            ).length;
            return { engineer: e, score: successRate * 50 - workload * 10 };
          });
          scored.sort((a, b) => b.score - a.score);
          nextEngineer = scored[0]?.engineer;
        }
      }

      if (nextEngineer) {
        const oldAssigneeId = workOrder.assigneeId;
        const oldAssigneeName = workOrder.assigneeName;

        const { sendMessage } = useMessageStore.getState();
        await sendMessage({
          type: 'work_order',
          title: '工单已转派',
          content: `工单 ${workOrderId} 因15分钟未接单，已自动转派给 ${nextEngineer.name}。`,
          receiverId: oldAssigneeId || '',
          relatedId: workOrderId,
          relatedType: 'workorder',
        });

        await get().transferWorkOrder(
          workOrderId,
          nextEngineer.id,
          '15分钟内未接单，系统自动转派'
        );
      }

      set((state) => {
        const newTimers = new Map(state.transferTimers);
        newTimers.delete(workOrderId);
        return { transferTimers: newTimers };
      });
    },

    acceptWorkOrder: async (workOrderId) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      const workOrder = get().workOrders.find((w) => w.id === workOrderId);

      if (!workOrder) {
        set({ error: '工单不存在', loading: false });
        return false;
      }

      if (workOrder.assigneeId !== currentUser?.id) {
        set({ error: '您不是该工单的负责人', loading: false });
        return false;
      }

      const timers = get().transferTimers;
      const timerId = timers.get(workOrderId);
      if (timerId) {
        window.clearTimeout(timerId);
        set((state) => {
          const newTimers = new Map(state.transferTimers);
          newTimers.delete(workOrderId);
          return { transferTimers: newTimers };
        });
      }

      const updatedWorkOrder = await workOrderService.update(workOrderId, {
        status: 'accepted',
      });

      if (updatedWorkOrder) {
        set((state) => ({
          workOrders: state.workOrders.map((w) =>
            w.id === workOrderId ? updatedWorkOrder : w
          ),
          currentWorkOrder:
            state.currentWorkOrder?.id === workOrderId
              ? updatedWorkOrder
              : state.currentWorkOrder,
          loading: false,
        }));

        const { sendMessage } = useMessageStore.getState();
        await sendMessage({
          type: 'work_order',
          title: '工单已接单',
          content: `${currentUser.name} 已接手工单 ${workOrderId}。`,
          receiverId: workOrder.reporterId,
          relatedId: workOrderId,
          relatedType: 'workorder',
        });

        return true;
      }

      set({ error: '接单失败', loading: false });
      return false;
    },

    startRepair: async (workOrderId) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      const workOrder = get().workOrders.find((w) => w.id === workOrderId);

      if (!workOrder) {
        set({ error: '工单不存在', loading: false });
        return false;
      }

      if (workOrder.assigneeId !== currentUser?.id) {
        set({ error: '您不是该工单的负责人', loading: false });
        return false;
      }

      if (!['assigned', 'accepted', 'in_progress'].includes(workOrder.status)) {
        set({ error: '工单状态不正确', loading: false });
        return false;
      }

      const updatedWorkOrder = await workOrderService.update(workOrderId, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      });

      if (updatedWorkOrder) {
        set((state) => ({
          workOrders: state.workOrders.map((w) =>
            w.id === workOrderId ? updatedWorkOrder : w
          ),
          currentWorkOrder:
            state.currentWorkOrder?.id === workOrderId
              ? updatedWorkOrder
              : state.currentWorkOrder,
          loading: false,
        }));

        return true;
      }

      set({ error: '开始维修失败', loading: false });
      return false;
    },

    completeWorkOrder: async (workOrderId, data) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      const workOrder = get().workOrders.find((w) => w.id === workOrderId);

      if (!workOrder) {
        set({ error: '工单不存在', loading: false });
        return null;
      }

      if (workOrder.assigneeId !== currentUser?.id) {
        set({ error: '您不是该工单的负责人', loading: false });
        return null;
      }

      if (data.parts && data.parts.length > 0) {
        const stockCheck = await get().checkPartsStock(data.parts);
        if (!stockCheck.available) {
          set({
            error: `配件库存不足：${stockCheck.insufficientParts.map((p) => p.partName).join(', ')}`,
            loading: false,
          });
          return null;
        }

        for (const part of data.parts) {
          await inventoryService.adjustStock(part.partId, -part.quantity);
        }
      }

      const updatedWorkOrder = await workOrderService.complete(
        workOrderId,
        data.actualTime
      );

      if (!updatedWorkOrder) {
        set({ error: '完工失败', loading: false });
        return null;
      }

      const partsUsed: RepairPart[] = (data.parts || []).map((p, idx) => ({
        id: `rp${Date.now()}${idx}`,
        name: p.partName,
        model: '',
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalPrice: p.unitPrice * p.quantity,
        fromInventory: true,
      }));

      const totalPartsCost = partsUsed.reduce((sum, p) => sum + p.totalPrice, 0);
      const laborCost = (data.actualTime || 0) * 5;
      const totalCost = totalPartsCost + laborCost;

      const startTime = workOrder.startedAt || workOrder.updatedAt;
      const endTime = new Date().toISOString();

      const repairRecord = await repairRecordService.create({
        deviceId: workOrder.deviceId,
        deviceName: workOrder.deviceName,
        workOrderId: workOrderId,
        faultDescription: workOrder.description,
        diagnosis: data.failureAnalysis,
        solution: data.solution,
        partsUsed,
        technicianId: currentUser.id,
        technicianName: currentUser.name,
        startTime,
        endTime,
        totalCost,
        warranty: false,
        status: 'completed',
        beforePhotos: data.beforePhotos || workOrder.faultPhotos || [],
        afterPhotos: data.afterPhotos || [],
        actualDuration: data.actualTime,
      });

      if (repairRecord) {
        await deviceService.update(workOrder.deviceId, {
          status: 'normal',
        });

        set((state) => {
          const updatedDevices = state.workOrders.map((w) =>
            w.id === workOrderId ? updatedWorkOrder : w
          );
          return {
            workOrders: updatedDevices,
            currentWorkOrder:
              state.currentWorkOrder?.id === workOrderId
                ? updatedWorkOrder
                : state.currentWorkOrder,
            loading: false,
          };
        });

        const { sendMessage } = useMessageStore.getState();
        const allUsers = useAuthStore.getState().users;

        await sendMessage({
          type: 'work_order',
          title: '工单已完成',
          content: `工单 ${workOrderId}（${workOrder.deviceName}）已由 ${currentUser.name} 完成，用时 ${data.actualTime} 分钟，维修单已生成。`,
          receiverId: workOrder.reporterId,
          relatedId: workOrderId,
          relatedType: 'workorder',
        });

        const nurse = allUsers.find((u) => u.role === 'nurse');
        if (nurse) {
          await sendMessage({
            type: 'work_order',
            title: '设备维修完成',
            content: `${workOrder.deviceName} 维修已完成，请验收。工单：${workOrderId}`,
            receiverId: nurse.id,
            relatedId: workOrder.deviceId,
            relatedType: 'device',
          });
        }

        const director = allUsers.find((u) => u.role === 'director');
        if (director) {
          await sendMessage({
            type: 'work_order',
            title: '工单完成通知',
            content: `工单 ${workOrderId}（${workOrder.deviceName}）已完成，总费用 ¥${totalCost.toLocaleString()}。`,
            receiverId: director.id,
            relatedId: workOrderId,
            relatedType: 'workorder',
          });
        }

        return repairRecord;
      }

      set({ error: '创建维修记录失败', loading: false });
      return null;
    },

    transferWorkOrder: async (workOrderId, toEngineerId, reason) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      const workOrder = get().workOrders.find((w) => w.id === workOrderId);
      const { engineers, fetchEngineers, transferHistory } = get();

      if (engineers.length === 0) {
        await fetchEngineers();
      }

      const toEngineer = get().engineers.find((e) => e.id === toEngineerId);

      if (!workOrder) {
        set({ error: '工单不存在', loading: false });
        return false;
      }

      if (!toEngineer) {
        set({ error: '目标工程师不存在', loading: false });
        return false;
      }

      const history = transferHistory.get(workOrderId) || [];
      if (history.length >= 3) {
        set({ error: '工单转派次数已达上限', loading: false });
        return false;
      }

      const transferRecord: TransferRecord = {
        id: `TR${Date.now()}`,
        fromId: workOrder.assigneeId || currentUser?.id || '',
        fromName: workOrder.assigneeName || currentUser?.name || '',
        toId: toEngineerId,
        toName: toEngineer.name,
        reason,
        timestamp: new Date().toISOString(),
      };

      const newHistory = [...history, transferRecord];
      const newCount = (workOrder.autoReassignedCount || 0) + 1;

      const updatedWorkOrder = await workOrderService.assign(
        workOrderId,
        toEngineerId,
        toEngineer.name,
        {
          autoReassignedCount: newCount,
          isLocked: true,
        }
      );

      if (updatedWorkOrder) {
        set((state) => ({
          workOrders: state.workOrders.map((w) =>
            w.id === workOrderId ? updatedWorkOrder : w
          ),
          currentWorkOrder:
            state.currentWorkOrder?.id === workOrderId
              ? updatedWorkOrder
              : state.currentWorkOrder,
          transferHistory: new Map(state.transferHistory).set(workOrderId, newHistory),
          loading: false,
        }));

        const timers = get().transferTimers;
        const existingTimer = timers.get(workOrderId);
        if (existingTimer) {
          window.clearTimeout(existingTimer);
        }

        const timerId = window.setTimeout(() => {
          get().checkAndTransfer(workOrderId);
        }, AUTO_TRANSFER_TIMEOUT);

        set((state) => {
          const newTimers = new Map(state.transferTimers);
          newTimers.set(workOrderId, timerId);
          return { transferTimers: newTimers };
        });

        const { sendMessage } = useMessageStore.getState();
        await sendMessage({
          type: 'work_order',
          title: '工单转派',
          content: `工单 ${workOrderId} 已转派给您，原因：${reason}`,
          receiverId: toEngineerId,
          relatedId: workOrderId,
          relatedType: 'workorder',
        });

        return true;
      }

      set({ error: '转派失败', loading: false });
      return false;
    },

    cancelWorkOrder: async (workOrderId, reason) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      const workOrder = get().workOrders.find((w) => w.id === workOrderId);

      if (!workOrder) {
        set({ error: '工单不存在', loading: false });
        return false;
      }

      if (
        workOrder.reporterId !== currentUser?.id &&
        currentUser?.role !== 'admin' &&
        currentUser?.role !== 'director'
      ) {
        set({ error: '您没有权限取消此工单', loading: false });
        return false;
      }

      const timers = get().transferTimers;
      const timerId = timers.get(workOrderId);
      if (timerId) {
        window.clearTimeout(timerId);
        set((state) => {
          const newTimers = new Map(state.transferTimers);
          newTimers.delete(workOrderId);
          return { transferTimers: newTimers };
        });
      }

      const updatedWorkOrder = await workOrderService.cancel(workOrderId);

      if (updatedWorkOrder) {
        set((state) => ({
          workOrders: state.workOrders.map((w) =>
            w.id === workOrderId ? updatedWorkOrder : w
          ),
          currentWorkOrder:
            state.currentWorkOrder?.id === workOrderId
              ? updatedWorkOrder
              : state.currentWorkOrder,
          loading: false,
        }));

        if (workOrder.assigneeId) {
          const { sendMessage } = useMessageStore.getState();
          await sendMessage({
            type: 'work_order',
            title: '工单已取消',
            content: `工单 ${workOrderId} 已取消，原因：${reason}`,
            receiverId: workOrder.assigneeId,
            relatedId: workOrderId,
            relatedType: 'workorder',
          });
        }

        return true;
      }

      set({ error: '取消失败', loading: false });
      return false;
    },

    checkPartsStock: async (parts) => {
      const { partInventory, fetchPartInventory } = get();

      if (partInventory.length === 0) {
        await fetchPartInventory();
      }

      const inventory = get().partInventory;
      const insufficientParts: WorkOrderPart[] = [];

      for (const part of parts) {
        const stockItem = inventory.find((p) => p.id === part.partId);
        if (!stockItem || stockItem.quantity < part.quantity) {
          insufficientParts.push({
            ...part,
            inStock: false,
          });
        }
      }

      return {
        available: insufficientParts.length === 0,
        insufficientParts,
      };
    },

    fetchEngineers: async () => {
      set({ loading: true });
      try {
        const engineers = await userService.getByRole('engineer');
        set({ engineers, loading: false });
      } catch {
        set({ error: '获取工程师列表失败', loading: false });
      }
    },

    fetchPartInventory: async () => {
      set({ loading: true });
      try {
        const partInventory = await inventoryService.getAll();
        set({ partInventory, loading: false });
      } catch {
        set({ error: '获取配件库存失败', loading: false });
      }
    },

    startAutoTransferMonitor: () => {
      const { workOrders } = get();
      const now = Date.now();

      workOrders.forEach((workOrder) => {
        if (workOrder.status === 'assigned' && workOrder.updatedAt) {
          const assignedTime = new Date(workOrder.updatedAt).getTime();
          const elapsed = now - assignedTime;

          if (elapsed >= AUTO_TRANSFER_TIMEOUT) {
            get().checkAndTransfer(workOrder.id);
          } else {
            const remainingTime = AUTO_TRANSFER_TIMEOUT - elapsed;
            const timerId = window.setTimeout(() => {
              get().checkAndTransfer(workOrder.id);
            }, remainingTime);

            set((state) => {
              const newTimers = new Map(state.transferTimers);
              newTimers.set(workOrder.id, timerId);
              return { transferTimers: newTimers };
            });
          }
        }
      });
    },

    stopAutoTransferMonitor: () => {
      const { transferTimers } = get();
      transferTimers.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      set({ transferTimers: new Map() });
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      get().stopAutoTransferMonitor();
      set({
        workOrders: [],
        currentWorkOrder: null,
        engineers: [],
        partInventory: [],
        loading: false,
        error: null,
        transferTimers: new Map(),
        transferHistory: new Map(),
      });
    },
  })
);
