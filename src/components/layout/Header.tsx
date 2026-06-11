import React, { useState, useEffect } from 'react';
import { Layout, Breadcrumb, Badge, Dropdown, Avatar, Button, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore } from '@/store/useMessageStore';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header: AntHeader } = Layout;

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

const roleMap: Record<string, string> = {
  admin: '系统管理员',
  director: '科主任',
  engineer: '工程师',
  nurse: '护士',
  finance: '财务人员',
};

const Header: React.FC<HeaderProps> = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuthStore();
  const { messages, fetchMessages, markAsRead } = useMessageStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, fetchMessages]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const unreadCount = messages.filter(m => !m.isRead).length;

  const breadcrumbItems = React.useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [{ title: '首页', path: '/' }];
    
    const pathMap: Record<string, string> = {
      dashboard: '仪表盘',
      device: '设备管理',
      workorder: '工单管理',
      repair: '维修工作台',
      maintenance: '保养计划',
      calibration: '计量校准',
      scrap: '报废管理',
      report: '数据报表',
      message: '消息中心',
      system: '系统管理',
    };

    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      if (pathMap[segment]) {
        items.push({
          title: pathMap[segment],
          path: currentPath,
        });
      }
    });

    return items;
  }, [location.pathname]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMessageClick = () => {
    navigate('/message');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const notificationMenuItems: MenuProps['items'] = messages.slice(0, 5).map(msg => ({
    key: msg.id,
    label: (
      <div
        className="py-2 px-1 cursor-pointer hover:bg-primary-50 rounded transition-colors"
        onClick={() => {
          markAsRead(msg.id);
          handleMessageClick();
        }}
      >
        <div className={`text-sm ${msg.isRead ? 'text-text-tertiary' : 'text-text-primary font-medium'}`}>
          {msg.title}
        </div>
        <div className="text-xs text-text-tertiary mt-1 line-clamp-1">
          {msg.content}
        </div>
        <div className="text-xs text-text-quaternary mt-1">
          {new Date(msg.createdAt).toLocaleString('zh-CN')}
        </div>
      </div>
    ),
  }));

  if (messages.length > 0) {
    notificationMenuItems.push(
      { type: 'divider' },
      {
        key: 'view-all',
        label: (
          <div className="text-center text-primary hover:text-primary-hover cursor-pointer transition-colors">
            查看全部消息
          </div>
        ),
        onClick: handleMessageClick,
      }
    );
  } else {
    notificationMenuItems.push({
      key: 'empty',
      label: <div className="text-center py-4 text-text-tertiary">暂无消息</div>,
    });
  }

  return (
    <AntHeader
      className="!h-16 !px-0 !bg-white border-b border-border flex items-center justify-between shadow-sm sticky top-0 z-50"
      style={{
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="flex items-center h-full">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className="!h-16 !w-16 !text-text-secondary hover:!bg-primary-50 hover:!text-primary rounded-none transition-all duration-200"
        />

        <Breadcrumb
          className="ml-4"
          items={breadcrumbItems.map(item => ({
            title: item.path ? (
              <span
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={() => navigate(item.path)}
              >
                {item.title}
              </span>
            ) : (
              item.title
            ),
          }))}
        />
      </div>

      <div className="flex items-center gap-1 px-4 h-full">
        <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={handleFullscreen}
            className="!h-10 !w-10 !text-text-secondary hover:!bg-primary-50 hover:!text-primary transition-all duration-200"
          />
        </Tooltip>

        <Dropdown
          menu={{ items: notificationMenuItems }}
          placement="bottomRight"
          trigger={['click']}
          overlayClassName="w-80"
        >
          <div className="cursor-pointer h-10 w-10 flex items-center justify-center hover:bg-primary-50 rounded-lg transition-all duration-200">
            <Badge
              count={unreadCount}
              overflowCount={99}
              size="small"
              offset={[-2, 2]}
              className="cursor-pointer"
            >
              <BellOutlined className="text-lg text-text-secondary hover:text-primary transition-colors" />
            </Badge>
          </div>
        </Dropdown>

        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={['click']}
        >
          <div className="flex items-center gap-3 px-3 py-2 ml-1 cursor-pointer hover:bg-primary-50 rounded-lg transition-all duration-200">
            <Avatar
              size={36}
              icon={<UserOutlined />}
              src={user?.avatar}
              className="!bg-gradient-to-br !from-primary-400 !to-primary-600"
            />
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-text-primary">
                {user?.name || '用户'}
              </div>
              <div className="text-xs text-text-tertiary">
                {user?.role ? roleMap[user.role] : ''}
              </div>
            </div>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;
