import { create } from 'zustand';
import type { User, WorkOrder, Inventory } from '@/types';
import {
  userService,
  workOrderService,
  inventoryService,
  messageService,
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
    data: Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ) => Promise<WorkOrder | null>;
  smartDispatch: (workOrderId: string) => Promise<User | null>;
  assignWorkOrder: (workOrderId: string, engineerId: string) => Promise<boolean>;
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
    }
  ) => Promise<boolean>;
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
        });
        set((state) => ({
          workOrders: [workOrder, ...state.workOrders],
          loading: false,
        }));

        const { sendMessage } = useMessageStore.getState();
        await sendMessage({
          type: 'work_order',
          title: '新工单创建',
          content: `新工单 ${workOrder.id} 已创建，等待分配。`,
          receiverId: '4',
          relatedId: workOrder.id,
          relatedType: 'workorder',
        });

        return workOrder;
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

      if (!workOrder) {
        set({ error: '工单不存在', loading: false });
        return null;
      }

      if (currentEngineers.length === 0) {
        set({ error: '没有可用工程师', loading: false });
        return null;
      }

      const scoredEngineers = currentEngineers.map((engineer) => {
        let score = 0;

        const assignedOrders = workOrders.filter(
          (w) =>
            w.assigneeId === engineer.id &&
            ['assigned', 'in_progress'].includes(w.status)
        ).length;
        score -= assignedOrders * 10;

        if (engineer.department) {
          if (engineer.department === workOrder.department) {
            score += 20;
          }
        }

        if (workOrder.priority === 'urgent') {
          score += 5;
        }

        return { engineer, score };
      });

      scoredEngineers.sort((a, b) => b.score - a.score);
      const bestEngineer = scoredEngineers[0].engineer;

      const { sendMessage } = useMessageStore.getState();
      await get().assignWorkOrder(workOrderId, bestEngineer.id);
      await sendMessage({
        type: 'work_order',
        title: '工单智能分配',
        content: `工单 ${workOrderId} 已智能分配给 ${bestEngineer.name}。`,
        receiverId: bestEngineer.id,
        relatedId: workOrderId,
        relatedType: 'workorder',
      });

      set({ loading: false });
      return bestEngineer;
    },

    assignWorkOrder: async (workOrderId, engineerId) => {
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

      const updatedWorkOrder = await workOrderService.assign(
        workOrderId,
        engineerId,
        engineer.name
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

        const { sendMessage } = useMessageStore.getState();
        await sendMessage({
          type: 'work_order',
          title: '新工单分配',
          content: `您有一个新工单 ${workOrderId} 待处理，请在15分钟内接单。`,
          receiverId: engineerId,
          relatedId: workOrderId,
          relatedType: 'workorder',
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
        await sendMessage({
          type: 'system',
          title: '工单转派超限',
          content: `工单 ${workOrderId} 已自动转派3次，请管理员介入处理。`,
          receiverId: '4',
          relatedId: workOrderId,
          relatedType: 'workorder',
        });
        return;
      }

      const otherEngineers = engineers.filter(
        (e) => e.id !== workOrder.assigneeId
      );

      if (otherEngineers.length > 0) {
        const nextEngineer =
          otherEngineers[Math.floor(Math.random() * otherEngineers.length)];
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
        status: 'in_progress',
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

      if (workOrder.status !== 'assigned' && workOrder.status !== 'in_progress') {
        set({ error: '工单状态不正确', loading: false });
        return false;
      }

      const updatedWorkOrder = await workOrderService.startProgress(workOrderId);

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
        return false;
      }

      if (workOrder.assigneeId !== currentUser?.id) {
        set({ error: '您不是该工单的负责人', loading: false });
        return false;
      }

      if (data.parts && data.parts.length > 0) {
        const stockCheck = await get().checkPartsStock(data.parts);
        if (!stockCheck.available) {
          set({
            error: `配件库存不足：${stockCheck.insufficientParts.map((p) => p.partName).join(', ')}`,
            loading: false,
          });
          return false;
        }

        for (const part of data.parts) {
          await inventoryService.adjustStock(part.partId, -part.quantity);
        }
      }

      const updatedWorkOrder = await workOrderService.complete(
        workOrderId,
        data.actualTime
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

        const { sendMessage } = useMessageStore.getState();
        await sendMessage({
          type: 'work_order',
          title: '工单已完成',
          content: `工单 ${workOrderId} 已由 ${currentUser.name} 完成，用时 ${data.actualTime} 分钟。`,
          receiverId: workOrder.reporterId,
          relatedId: workOrderId,
          relatedType: 'workorder',
        });

        return true;
      }

      set({ error: '完工失败', loading: false });
      return false;
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

      const updatedWorkOrder = await workOrderService.assign(
        workOrderId,
        toEngineerId,
        toEngineer.name
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
