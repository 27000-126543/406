import { create } from 'zustand';
import type { Message } from '@/types';
import { messageService } from '@/services/mock';
import { useAuthStore } from './useAuthStore';

type MessageType = Message['type'];

interface MessageState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  isSimulating: boolean;
  simulationInterval: number | null;
}

interface MessageActions {
  fetchMessages: () => Promise<void>;
  fetchMessagesByReceiver: (receiverId?: string, params?: {
    isRead?: boolean;
    type?: string;
  }) => Promise<void>;
  sendMessage: (message: Omit<Message, 'id' | 'isRead' | 'createdAt'>) => Promise<Message | null>;
  markAsRead: (messageId: string) => Promise<boolean>;
  markAllAsRead: (receiverId?: string) => Promise<number>;
  getUnreadCount: (receiverId?: string) => number;
  getMessagesByType: (type: MessageType, receiverId?: string) => Message[];
  startSimulation: () => void;
  stopSimulation: () => void;
  simulateNewMessage: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useMessageStore = create<MessageState & MessageActions>(
  (set, get) => ({
    messages: [],
    loading: false,
    error: null,
    isSimulating: false,
    simulationInterval: null,

    fetchMessages: async () => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        set({ error: '用户未登录', loading: false });
        return;
      }
      try {
        const messages = await messageService.getByReceiver(currentUser.id);
        set({ messages, loading: false });
      } catch {
        set({ error: '获取消息列表失败', loading: false });
      }
    },

    fetchMessagesByReceiver: async (receiverId, params) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      const targetId = receiverId || currentUser?.id;

      if (!targetId) {
        set({ error: '用户未登录', loading: false });
        return;
      }

      try {
        const messages = await messageService.getByReceiver(targetId, params);
        set({ messages, loading: false });
      } catch {
        set({ error: '获取消息失败', loading: false });
      }
    },

    sendMessage: async (message) => {
      set({ loading: true, error: null });
      try {
        const newMessage = await messageService.create(message);
        set((state) => ({
          messages: [newMessage, ...state.messages],
          loading: false,
        }));
        return newMessage;
      } catch {
        set({ error: '发送消息失败', loading: false });
        return null;
      }
    },

    markAsRead: async (messageId) => {
      set({ loading: true, error: null });
      try {
        const updatedMessage = await messageService.markAsRead(messageId);
        if (updatedMessage) {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === messageId ? updatedMessage : m
            ),
            loading: false,
          }));
          return true;
        }
        return false;
      } catch {
        set({ error: '标记已读失败', loading: false });
        return false;
      }
    },

    markAllAsRead: async (receiverId) => {
      set({ loading: true, error: null });
      const currentUser = useAuthStore.getState().user;
      const targetId = receiverId || currentUser?.id;

      if (!targetId) {
        set({ error: '用户未登录', loading: false });
        return 0;
      }

      try {
        const count = await messageService.markAllAsRead(targetId);
        set((state) => ({
          messages: state.messages.map((m) =>
            m.receiverId === targetId ? { ...m, isRead: true } : m
          ),
          loading: false,
        }));
        return count;
      } catch {
        set({ error: '批量标记已读失败', loading: false });
        return 0;
      }
    },

    getUnreadCount: (receiverId) => {
      const { messages } = get();
      const currentUser = useAuthStore.getState().user;
      const targetId = receiverId || currentUser?.id;

      if (!targetId) return 0;

      return messages.filter((m) => m.receiverId === targetId && !m.isRead).length;
    },

    getMessagesByType: (type, receiverId) => {
      const { messages } = get();
      const currentUser = useAuthStore.getState().user;
      const targetId = receiverId || currentUser?.id;

      let filtered = messages.filter((m) => m.type === type);
      if (targetId) {
        filtered = filtered.filter((m) => m.receiverId === targetId);
      }

      return filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    startSimulation: () => {
      const { isSimulating, simulationInterval } = get();

      if (isSimulating) return;

      const intervalId = window.setInterval(() => {
        get().simulateNewMessage();
      }, 30000);

      set({
        isSimulating: true,
        simulationInterval: intervalId,
      });
    },

    stopSimulation: () => {
      const { simulationInterval } = get();

      if (simulationInterval) {
        window.clearInterval(simulationInterval);
      }

      set({
        isSimulating: false,
        simulationInterval: null,
      });
    },

    simulateNewMessage: async () => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;

      const messageTemplates = [
        {
          type: 'system' as const,
          title: '系统公告',
          content: '系统将于今晚进行例行维护，届时部分功能可能暂停服务。',
        },
        {
          type: 'device' as const,
          title: '设备状态提醒',
          content: '您关注的设备 CT扫描仪 状态已更新，请及时查看。',
        },
        {
          type: 'inventory' as const,
          title: '库存预警',
          content: '配件 X光球管 库存已低于安全线，请及时补货。',
        },
        {
          type: 'work_order' as const,
          title: '工单超时提醒',
          content: '工单 WO202601005 即将超时，请加快处理进度。',
        },
        {
          type: 'system' as const,
          title: '数据备份完成',
          content: '今日数据备份已完成，共备份 1,234 条记录。',
        },
        {
          type: 'device' as const,
          title: '保养提醒',
          content: '设备 呼吸机 距离下次保养还有 7 天，请提前安排。',
        },
      ];

      const randomTemplate = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

      try {
        const message = await messageService.create({
          ...randomTemplate,
          receiverId: currentUser.id,
        });
        set((state) => ({
          messages: [message, ...state.messages],
        }));
      } catch {
        // Silent fail for simulation
      }
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      get().stopSimulation();
      set({
        messages: [],
        loading: false,
        error: null,
        isSimulating: false,
        simulationInterval: null,
      });
    },
  })
);
