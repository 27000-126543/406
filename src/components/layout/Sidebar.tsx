import React, { useMemo } from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  ToolOutlined,
  CalendarOutlined,
  SafetyOutlined,
  DeleteOutlined,
  BarChartOutlined,
  BellOutlined,
  SettingOutlined,
  UserOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserRole, User } from '@/types';

const { Sider } = Layout;

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  children?: MenuItem[];
}

const menuConfig: MenuItem[] = [
  {
    key: 'dashboard',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    path: '/dashboard',
    roles: ['admin', 'director', 'engineer', 'nurse', 'finance'],
  },
  {
    key: 'devices',
    label: '设备管理',
    icon: <AppstoreOutlined />,
    path: '/devices',
    roles: ['admin', 'director', 'engineer', 'nurse'],
  },
  {
    key: 'workorders',
    label: '工单管理',
    icon: <FileTextOutlined />,
    path: '/workorders',
    roles: ['admin', 'director', 'engineer', 'nurse'],
  },
  {
    key: 'repair',
    label: '维修工作台',
    icon: <ToolOutlined />,
    path: '/repair',
    roles: ['admin', 'director', 'engineer'],
  },
  {
    key: 'maintenance',
    label: '保养计划',
    icon: <CalendarOutlined />,
    path: '/maintenance',
    roles: ['admin', 'director', 'engineer'],
  },
  {
    key: 'calibration',
    label: '计量校准',
    icon: <SafetyOutlined />,
    path: '/calibration',
    roles: ['admin', 'director', 'engineer'],
  },
  {
    key: 'scrap',
    label: '报废管理',
    icon: <DeleteOutlined />,
    path: '/scrap',
    roles: ['admin', 'director', 'finance'],
  },
  {
    key: 'reports',
    label: '数据报表',
    icon: <BarChartOutlined />,
    path: '/reports',
    roles: ['admin', 'director', 'finance'],
  },
  {
    key: 'messages',
    label: '消息中心',
    icon: <BellOutlined />,
    path: '/messages',
    roles: ['admin', 'director', 'engineer', 'nurse', 'finance'],
  },
  {
    key: 'system',
    label: '系统管理',
    icon: <SettingOutlined />,
    path: '/system',
    roles: ['admin', 'director'],
    children: [
      {
        key: 'system-users',
        label: '用户管理',
        icon: <UserOutlined />,
        path: '/system/users',
        roles: ['admin', 'director'],
      },
      {
        key: 'system-config',
        label: '基础配置',
        icon: <AppstoreAddOutlined />,
        path: '/system/config',
        roles: ['admin', 'director'],
      },
    ],
  },
];

function filterMenuByRole(items: MenuItem[], user: User | null): MenuItem[] {
  if (!user) return [];
  return items
    .filter(item => item.roles.includes(user.role))
    .map(item => ({
      ...item,
      children: item.children ? filterMenuByRole(item.children, user) : undefined,
    }))
    .filter(item => !item.children || item.children.length > 0);
}

function buildMenuItems(items: MenuItem[]): MenuProps['items'] {
  return items.map(item => ({
    key: item.path,
    icon: item.icon,
    label: item.label,
    children: item.children ? buildMenuItems(item.children) : undefined,
  }));
}

function getAllPaths(items: MenuItem[]): string[] {
  let paths: string[] = [];
  items.forEach(item => {
    paths.push(item.path);
    if (item.children) {
      paths = paths.concat(getAllPaths(item.children));
    }
  });
  return paths;
}

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredMenuItems = useMemo(() => filterMenuByRole(menuConfig, user), [user]);

  const menuItems: MenuProps['items'] = useMemo(
    () => buildMenuItems(filteredMenuItems),
    [filteredMenuItems]
  );

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const selectedKeys = useMemo(() => {
    const pathname = location.pathname;
    const allPaths = getAllPaths(filteredMenuItems);
    return allPaths
      .filter(path => pathname.startsWith(path) && path !== '/')
      .sort((a, b) => b.length - a.length)
      .slice(0, 1);
  }, [location.pathname, filteredMenuItems]);

  const openKeys = useMemo(() => {
    const pathname = location.pathname;
    return filteredMenuItems
      .filter(item => item.children && pathname.startsWith(item.path))
      .map(item => item.path);
  }, [location.pathname, filteredMenuItems]);

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      className="!bg-gradient-to-b !from-primary-800 !to-primary-900 shadow-lg"
      width={240}
      collapsedWidth={80}
      style={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="h-16 flex items-center justify-center border-b border-white/10">
        <div className="flex items-center gap-3 px-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <span className="text-white text-xl font-bold">医</span>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <div className="text-white font-bold text-lg tracking-wide">
                医疗设备管理
              </div>
              <div className="text-white/60 text-xs">Medical Device System</div>
            </div>
          )}
        </div>
      </div>

      <div className="py-4 px-3">
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          className="!border-r-0 !bg-transparent"
          style={{
            background: 'transparent',
          }}
        />
      </div>

      <style>{`
        .ant-menu-dark.ant-menu-inline .ant-menu-item {
          margin: 4px 0;
          border-radius: 8px;
          height: 48px;
          line-height: 48px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ant-menu-dark.ant-menu-inline .ant-menu-item:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        .ant-menu-dark.ant-menu-inline .ant-menu-item-selected {
          background: linear-gradient(90deg, #40a9ff 0%, #1890ff 100%) !important;
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
        }
        .ant-menu-dark .ant-menu-item .anticon {
          font-size: 18px;
        }
        .ant-menu-dark.ant-menu-inline .ant-menu-submenu-title {
          margin: 4px 0;
          border-radius: 8px;
          height: 48px;
          line-height: 48px;
        }
        .ant-menu-dark .ant-menu-sub .ant-menu-item {
          padding-left: 48px !important;
        }
        .ant-layout-sider-collapsed .ant-menu-item {
          justify-content: center;
          padding: 0 !important;
        }
        .ant-layout-sider-collapsed .ant-menu-title-content {
          display: none;
        }
        .ant-layout-sider-collapsed .ant-menu-submenu-title {
          justify-content: center;
          padding: 0 !important;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
