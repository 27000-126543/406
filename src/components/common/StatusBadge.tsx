import React from 'react';
import { Tag } from 'antd';
import type { TagProps } from 'antd';
import type { DeviceStatus, WorkOrderStatus } from '@/types';

interface StatusInfo {
  label: string;
  color: string;
  dot: boolean;
}

interface DeviceStatusBadgeProps {
  type: 'device';
  status: DeviceStatus;
  size?: 'small' | 'default' | 'large';
}

interface WorkOrderStatusBadgeProps {
  type: 'workorder';
  status: WorkOrderStatus;
  size?: 'small' | 'default' | 'large';
}

type StatusBadgeProps = DeviceStatusBadgeProps | WorkOrderStatusBadgeProps;

const deviceStatusConfig: Record<DeviceStatus, { label: string; color: string; dot: boolean }> = {
  normal: {
    label: '正常',
    color: 'success',
    dot: true,
  },
  warning: {
    label: '已锁定',
    color: 'gold',
    dot: true,
  },
  fault: {
    label: '故障',
    color: 'error',
    dot: true,
  },
  maintenance: {
    label: '维护中',
    color: 'blue',
    dot: true,
  },
  scrapped: {
    label: '已报废',
    color: 'default',
    dot: true,
  },
  calibrating: {
    label: '校准中',
    color: 'cyan',
    dot: true,
  },
};

const workOrderStatusConfig: Record<WorkOrderStatus, { label: string; color: string; dot: boolean }> = {
  pending: {
    label: '待处理',
    color: 'gold',
    dot: true,
  },
  assigned: {
    label: '已指派',
    color: 'blue',
    dot: true,
  },
  accepted: {
    label: '已接单',
    color: 'purple',
    dot: true,
  },
  in_progress: {
    label: '处理中',
    color: 'cyan',
    dot: true,
  },
  completed: {
    label: '已完成',
    color: 'success',
    dot: true,
  },
  cancelled: {
    label: '已取消',
    color: 'default',
    dot: true,
  },
};

const sizeMap = {
  small: {
    padding: '0 6px',
    fontSize: '12px',
    height: '22px',
    lineHeight: '20px',
  },
  default: {
    padding: '2px 10px',
    fontSize: '13px',
    height: '26px',
    lineHeight: '22px',
  },
  large: {
    padding: '4px 14px',
    fontSize: '14px',
    height: '32px',
    lineHeight: '24px',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, size = 'default' }) => {
  let statusInfo: StatusInfo;

  if (type === 'device') {
    statusInfo = deviceStatusConfig[status as DeviceStatus] || {
      label: status,
      color: 'default',
      dot: true,
    };
  } else {
    statusInfo = workOrderStatusConfig[status as WorkOrderStatus] || {
      label: status,
      color: 'default',
      dot: true,
    };
  }

  const tagProps: TagProps = {
    color: statusInfo.color as TagProps['color'],
    style: {
      ...sizeMap[size],
      borderRadius: '6px',
      fontWeight: 500,
      transition: 'all 0.2s ease',
    },
    className: 'hover:shadow-md hover:-translate-y-0.5',
  };

  return (
    <Tag {...tagProps}>
      <span className="inline-flex items-center gap-1.5">
        {statusInfo.dot && (
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: 'currentColor',
              opacity: 0.8,
            }}
          />
        )}
        <span>{statusInfo.label}</span>
      </span>
    </Tag>
  );
};

export default StatusBadge;
