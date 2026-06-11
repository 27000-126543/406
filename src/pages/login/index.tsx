import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Checkbox, Button, Card, message, Spin } from 'antd';
import type { FormProps } from 'antd';
import { UserOutlined, LockOutlined, TeamOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types';

interface LoginForm {
  username: string;
  password: string;
  role: UserRole;
  remember: boolean;
}

const roleOptions = [
  { value: 'admin', label: '系统管理员' },
  { value: 'director', label: '科主任' },
  { value: 'engineer', label: '工程师' },
  { value: 'nurse', label: '护士' },
  { value: 'finance', label: '财务人员' },
];

const Login: React.FC = () => {
  const [form] = Form.useForm<LoginForm>();
  const { login, loading, error, clearError, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  useEffect(() => {
    const savedCredentials = localStorage.getItem('rememberedCredentials');
    if (savedCredentials) {
      try {
        const { username, password, role } = JSON.parse(savedCredentials);
        form.setFieldsValue({
          username,
          password,
          role,
          remember: true,
        });
      } catch {
        localStorage.removeItem('rememberedCredentials');
      }
    }
  }, [form]);

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const onFinish: FormProps<LoginForm>['onFinish'] = async (values) => {
    const success = await login(values.username, values.password);
    
    if (success) {
      if (values.remember) {
        localStorage.setItem(
          'rememberedCredentials',
          JSON.stringify({
            username: values.username,
            password: values.password,
            role: values.role,
          })
        );
      } else {
        localStorage.removeItem('rememberedCredentials');
      }

      setShowSuccess(true);
      message.success('登录成功！正在跳转...');
      
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute w-96 h-96 bg-white rounded-full blur-3xl"
            style={{
              top: '-10%',
              left: '-10%',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-80 h-80 bg-primary-300 rounded-full blur-3xl"
            style={{
              bottom: '-10%',
              right: '-10%',
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          />
          <div
            className="absolute w-64 h-64 bg-white/30 rounded-full blur-2xl"
            style={{
              top: '40%',
              right: '20%',
              animation: 'float 6s ease-in-out infinite',
            }}
          />
        </div>

        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute border border-white/30 rounded-full"
              style={{
                width: `${Math.random() * 300 + 100}px`,
                height: `${Math.random() * 300 + 100}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `pulse ${Math.random() * 4 + 3}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8 animate-slide-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20 shadow-xl">
            <span className="text-white text-4xl font-bold">医</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">
            医疗设备全生命周期管理系统
          </h1>
          <p className="text-white/70 text-base">
            Medical Equipment Lifecycle Management System
          </p>
        </div>

        <Card
          className={`backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl overflow-hidden transition-all duration-500 ${
            showSuccess ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          } animate-scale-in`}
          styles={{
            body: {
              padding: '40px 32px',
            },
          }}
        >
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-20">
              <Spin size="large" />
            </div>
          )}

          <Form
            form={form}
            name="login"
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              role: 'admin',
              remember: false,
            }}
            size="large"
            className="animate-fade-in"
          >
            <Form.Item
              name="username"
              label={<span className="text-white font-medium">用户名</span>}
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2个字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-white/50" />}
                placeholder="请输入用户名"
                className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 focus:!border-primary-300 focus:!shadow-lg"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  height: '48px',
                  borderRadius: '12px',
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-white font-medium">密码</span>}
              rules={[
                { required: true, message: '请输入密码' },
                { min: 4, message: '密码至少4个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-white/50" />}
                placeholder="请输入密码"
                iconRender={(visible) =>
                  visible ? (
                    <EyeOutlined className="text-white/50" />
                  ) : (
                    <EyeInvisibleOutlined className="text-white/50" />
                  )
                }
                visibilityToggle={{
                  visible: passwordVisible,
                  onVisibleChange: setPasswordVisible,
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  height: '48px',
                  borderRadius: '12px',
                }}
                className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 focus:!border-primary-300 focus:!shadow-lg"
              />
            </Form.Item>

            <Form.Item
              name="role"
              label={<span className="text-white font-medium">角色选择</span>}
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select
                prefix={<TeamOutlined className="text-white/50" />}
                placeholder="请选择登录角色"
                options={roleOptions}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  height: '48px',
                  borderRadius: '12px',
                }}
                className="!bg-white/10"
                popupClassName="!bg-primary-800 !border-white/20"
                variant="outlined"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked">
              <Checkbox className="!text-white/70">记住密码</Checkbox>
            </Form.Item>

            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="!h-12 !text-base !font-semibold !rounded-xl !bg-gradient-to-r !from-primary-400 !to-primary-600 hover:!from-primary-300 hover:!to-primary-500 active:!from-primary-500 active:!to-primary-700 !shadow-lg hover:!shadow-xl transition-all duration-300 hover:!-translate-y-0.5"
              >
                {loading ? '登录中...' : '登 录'}
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/50 text-xs text-center">
              测试账号: admin / 123456 &nbsp;|&nbsp; director / 123456 &nbsp;|&nbsp; engineer / 123456
              <br />
              nurse / 123456 &nbsp;|&nbsp; finance / 123456
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center text-white/40 text-sm animate-fade-in">
          <p>© 2026 医疗设备全生命周期管理系统 v1.0</p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(5deg);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        .ant-input::placeholder,
        .ant-input-password::placeholder {
          color: rgba(255, 255, 255, 0.4) !important;
        }
        .ant-select .ant-select-selector {
          background: transparent !important;
          border: none !important;
          color: white !important;
          height: 48px !important;
          line-height: 48px !important;
        }
        .ant-select .ant-select-arrow {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        .ant-select-dropdown .ant-select-item {
          color: white !important;
        }
        .ant-select-dropdown .ant-select-item:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        .ant-select-dropdown .ant-select-item-option-selected {
          background: rgba(24, 144, 255, 0.3) !important;
        }
        .ant-checkbox-wrapper:hover .ant-checkbox-inner,
        .ant-checkbox-checked .ant-checkbox-inner {
          border-color: #40a9ff !important;
        }
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #1890ff !important;
        }
      `}</style>
    </div>
  );
};

export default Login;
