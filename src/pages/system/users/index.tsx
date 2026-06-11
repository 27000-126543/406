import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  StopOutlined,
  CheckCircleOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/store/useAuthStore';
import { roleMap } from '@/utils';
import type { User, UserRole } from '@/types';

const { Title } = Typography;

interface UserFormValues {
  username: string;
  name: string;
  role: UserRole;
  department: string;
  phone: string;
  email: string;
}

export default function UserManagement() {
  const { users, fetchUsers } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>();
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm<UserFormValues>();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [passwordForm] = Form.useForm<{ password: string }>();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      await fetchUsers();
    } catch {
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      return (
        user.username.toLowerCase().includes(kw) ||
        user.name.toLowerCase().includes(kw) ||
        user.department.toLowerCase().includes(kw)
      );
    }
    return true;
  });

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      email: user.email,
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      await form.validateFields();
      if (editingUser) {
        message.success('用户信息更新成功');
      } else {
        message.success('用户创建成功');
      }
      setModalVisible(false);
      loadUsers();
    } catch {
      // 验证失败
    }
  };

  const handleResetPassword = (user: User) => {
    setResettingUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handlePasswordOk = async () => {
    try {
      await passwordForm.validateFields();
      message.success('密码重置成功');
      setPasswordModalVisible(false);
      setResettingUser(null);
    } catch {
      // 验证失败
    }
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? '启用' : '禁用';
    message.success(`用户${action}成功`);
    loadUsers();
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text) => (
        <Space>
          <UserOutlined className="text-gray-400" />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => {
        const roleInfo = roleMap[role];
        const colorMap: Record<UserRole, string> = {
          admin: 'red',
          director: 'purple',
          engineer: 'blue',
          nurse: 'green',
          finance: 'orange',
        };
        return <Tag color={colorMap[role]}>{roleInfo?.label || role}</Tag>;
      },
    },
    {
      title: '科室',
      dataIndex: 'department',
      key: 'department',
      width: 120,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: 'active' | 'inactive') => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>
            重置密码
          </Button>
          <Popconfirm
            title={`确认${record.status === 'active' ? '禁用' : '启用'}该用户？`}
            onConfirm={() => handleToggleStatus(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              icon={record.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />}
              className={record.status === 'active' ? '!text-red-500' : '!text-green-500'}
            >
              {record.status === 'active' ? '禁用' : '启用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const roleOptions = Object.entries(roleMap).map(([key, value]) => ({
    value: key as UserRole,
    label: value.label,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            用户管理
          </Title>
          <p className="text-gray-500 mt-1">管理系统用户账户和权限</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增用户
        </Button>
      </div>

      <Card>
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="搜索用户名/姓名/科室"
              prefix={<SearchOutlined className="text-gray-400" />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="角色筛选"
              allowClear
              style={{ width: '100%' }}
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleOptions}
            />
          </Col>
          <Col xs={24} sm={24} md={8} lg={12} className="flex justify-end">
            <Button icon={<ReloadOutlined />} onClick={loadUsers}>
              刷新
            </Button>
          </Col>
        </Row>

        <Table<User>
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度为3-20个字符' },
            ]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色" options={roleOptions} />
          </Form.Item>
          <Form.Item
            name="department"
            label="科室"
            rules={[{ required: true, message: '请输入科室' }]}
          >
            <Input placeholder="请输入科室" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="电话"
            rules={[
              { required: true, message: '请输入电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onOk={handlePasswordOk}
        onCancel={() => {
          setPasswordModalVisible(false);
          setResettingUser(null);
        }}
        okText="确定"
        cancelText="取消"
        width={400}
        destroyOnClose
      >
        <div className="mb-4">
          为用户 <span className="font-semibold">{resettingUser?.name}</span> 重置密码
        </div>
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
