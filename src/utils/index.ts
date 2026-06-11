import dayjs, { Dayjs } from 'dayjs';

export type DeviceStatus = 'normal' | 'warning' | 'fault' | 'maintenance' | 'scrapped';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export type UserRole = 'director' | 'engineer' | 'nurse' | 'finance' | 'admin';

export interface QRCodeOptions {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  onClick?: () => void;
}

export const formatDate = (
  date: string | number | Date | Dayjs | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

export const formatRelativeTime = (
  date: string | number | Date | Dayjs | null | undefined
): string => {
  if (!date) return '-';
  const now = dayjs();
  const target = dayjs(date);
  const diffMinutes = now.diff(target, 'minute');
  const diffHours = now.diff(target, 'hour');
  const diffDays = now.diff(target, 'day');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatDate(date, 'YYYY-MM-DD');
};

export const generateQRCodeDataURL = async (
  options: QRCodeOptions
): Promise<string> => {
  const { QRCodeCanvas } = await import('qrcode.react');
  const canvas = document.createElement('canvas');
  const tempDiv = document.createElement('div');
  document.body.appendChild(tempDiv);
  
  return new Promise((resolve) => {
    const render = () => {
      const canvasEl = tempDiv.querySelector('canvas');
      if (canvasEl) {
        const dataURL = canvasEl.toDataURL('image/png');
        document.body.removeChild(tempDiv);
        resolve(dataURL);
      }
    };
    
    setTimeout(render, 100);
  });
};

export const getQRCodeProps = (options: QRCodeOptions): Required<QRCodeOptions> => {
  return {
    value: options.value,
    size: options.size ?? 128,
    level: options.level ?? 'M',
    includeMargin: options.includeMargin ?? false,
  };
};

export const calculateResidualValue = (
  originalValue: number,
  yearsUsed: number,
  depreciationRate: number = 0.1
): number => {
  if (originalValue <= 0) return 0;
  if (yearsUsed <= 0) return originalValue;
  const residualValue = originalValue * Math.pow(1 - depreciationRate, yearsUsed);
  return Math.max(0, Math.round(residualValue * 100) / 100);
};

export const calculateResidualValueByDate = (
  originalValue: number,
  purchaseDate: string | number | Date | Dayjs,
  depreciationRate: number = 0.1
): { residualValue: number; yearsUsed: number; monthsUsed: number } => {
  const now = dayjs();
  const purchase = dayjs(purchaseDate);
  const yearsUsed = now.diff(purchase, 'year');
  const monthsUsed = now.diff(purchase, 'month') % 12;
  const totalYears = yearsUsed + monthsUsed / 12;
  const residualValue = calculateResidualValue(originalValue, totalYears, depreciationRate);
  return { residualValue, yearsUsed, monthsUsed };
};

export const deviceStatusMap: Record<DeviceStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'success' },
  warning: { label: '预警', color: 'warning' },
  fault: { label: '故障', color: 'error' },
  maintenance: { label: '维护中', color: 'processing' },
  scrapped: { label: '已报废', color: 'default' },
};

export const getDeviceStatusInfo = (status: DeviceStatus) => {
  return deviceStatusMap[status] || { label: '未知', color: 'default' };
};

export const workOrderPriorityMap: Record<WorkOrderPriority, { label: string; color: string }> = {
  low: { label: '低', color: 'default' },
  medium: { label: '中', color: 'blue' },
  high: { label: '高', color: 'orange' },
  urgent: { label: '紧急', color: 'red' },
};

export const getWorkOrderPriorityInfo = (priority: WorkOrderPriority) => {
  return workOrderPriorityMap[priority] || { label: '未知', color: 'default' };
};

export const roleMap: Record<UserRole, { label: string; description: string }> = {
  director: { label: '主任', description: '负责科室全面管理' },
  engineer: { label: '工程师', description: '负责设备管理和维护' },
  nurse: { label: '护士长', description: '负责护理设备使用管理' },
  finance: { label: '财务', description: '负责财务相关工作' },
  admin: { label: '管理员', description: '拥有系统所有权限' },
};

export const getRoleInfo = (role: UserRole) => {
  return roleMap[role] || { label: '未知角色', description: '' };
};

export const pushNotification = async (
  options: NotificationOptions
): Promise<Notification | null> => {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知功能');
    return null;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      data: options.data,
    });
    if (options.onClick) {
      notification.onclick = options.onClick;
    }
    return notification;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        data: options.data,
      });
      if (options.onClick) {
        notification.onclick = options.onClick;
      }
      return notification;
    }
  }

  return null;
};

export const sendWebNotification = (
  title: string,
  body: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): void => {
  const icons: Record<string, string> = {
    info: '/favicon.svg',
    success: '/favicon.svg',
    warning: '/favicon.svg',
    error: '/favicon.svg',
  };

  pushNotification({
    title,
    body,
    icon: icons[type],
    onClick: () => {
      window.focus();
    },
  });
};
