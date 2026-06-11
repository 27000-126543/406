import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@/store/useAuthStore';
import { Navigate, useLocation, Outlet } from 'react-router-dom';

const { Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, token } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCollapse = (value: boolean) => {
    setCollapsed(value);
  };

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <Layout className="min-h-screen">
      <Sidebar collapsed={collapsed} onCollapse={handleCollapse} />
      <Layout
        style={{
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Header collapsed={collapsed} onToggle={handleToggle} />
        <Content
          className="bg-bg-secondary min-h-[calc(100vh-64px)] p-4 md:p-6"
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
