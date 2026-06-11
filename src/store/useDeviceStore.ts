import { create } from 'zustand';
import type { Device, DeviceStatus } from '@/types';
import { deviceService } from '@/services/mock';

interface DeviceState {
  devices: Device[];
  selectedDevice: Device | null;
  loading: boolean;
  error: string | null;
  qrCodeData: Map<string, string>;
}

interface DeviceActions {
  fetchDevices: (params?: {
    status?: DeviceStatus;
    department?: string;
    type?: string;
    keyword?: string;
  }) => Promise<void>;
  fetchDeviceById: (id: string) => Promise<Device | undefined>;
  selectDevice: (device: Device | null) => void;
  addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Device | null>;
  updateDevice: (id: string, updates: Partial<Device>) => Promise<Device | null>;
  deleteDevice: (id: string) => Promise<boolean>;
  updateDeviceStatus: (id: string, status: DeviceStatus) => Promise<Device | null>;
  generateQRCode: (deviceId: string) => string;
  clearError: () => void;
  reset: () => void;
}

export const useDeviceStore = create<DeviceState & DeviceActions>((set, get) => ({
  devices: [],
  selectedDevice: null,
  loading: false,
  error: null,
  qrCodeData: new Map(),

  fetchDevices: async (params) => {
    set({ loading: true, error: null });
    try {
      const devices = await deviceService.getAll(params);
      set({ devices, loading: false });
    } catch {
      set({ error: '获取设备列表失败', loading: false });
    }
  },

  fetchDeviceById: async (id) => {
    set({ loading: true, error: null });
    try {
      const device = await deviceService.getById(id);
      if (device) {
        set({ selectedDevice: device, loading: false });
      } else {
        set({ error: '设备不存在', loading: false });
      }
      return device;
    } catch {
      set({ error: '获取设备信息失败', loading: false });
      return undefined;
    }
  },

  selectDevice: (device) => {
    set({ selectedDevice: device });
  },

  addDevice: async (device) => {
    set({ loading: true, error: null });
    try {
      const newDevice = await deviceService.create(device);
      set((state) => ({
        devices: [newDevice, ...state.devices],
        loading: false,
      }));
      return newDevice;
    } catch {
      set({ error: '创建设备失败', loading: false });
      return null;
    }
  },

  updateDevice: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updatedDevice = await deviceService.update(id, updates);
      if (updatedDevice) {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? updatedDevice : d
          ),
          selectedDevice:
            state.selectedDevice?.id === id ? updatedDevice : state.selectedDevice,
          loading: false,
        }));
      }
      return updatedDevice || null;
    } catch {
      set({ error: '更新设备失败', loading: false });
      return null;
    }
  },

  deleteDevice: async (id) => {
    set({ loading: true, error: null });
    try {
      const success = await deviceService.delete(id);
      if (success) {
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
          selectedDevice:
            state.selectedDevice?.id === id ? null : state.selectedDevice,
          loading: false,
        }));
      }
      return success;
    } catch {
      set({ error: '删除设备失败', loading: false });
      return false;
    }
  },

  updateDeviceStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      const updatedDevice = await deviceService.updateStatus(id, status);
      if (updatedDevice) {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? updatedDevice : d
          ),
          selectedDevice:
            state.selectedDevice?.id === id ? updatedDevice : state.selectedDevice,
          loading: false,
        }));
      }
      return updatedDevice || null;
    } catch {
      set({ error: '更新设备状态失败', loading: false });
      return null;
    }
  },

  generateQRCode: (deviceId) => {
    const { qrCodeData, devices } = get();
    if (qrCodeData.has(deviceId)) {
      return qrCodeData.get(deviceId)!;
    }
    const device = devices.find((d) => d.id === deviceId);
    const qrContent = device
      ? `DEVICE:${device.id}|${device.name}|${device.serialNumber}`
      : `DEVICE:${deviceId}`;
    
    set((state) => {
      const newQrCodeData = new Map(state.qrCodeData);
      newQrCodeData.set(deviceId, qrContent);
      return { qrCodeData: newQrCodeData };
    });
    
    return qrContent;
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      devices: [],
      selectedDevice: null,
      loading: false,
      error: null,
      qrCodeData: new Map(),
    });
  },
}));
