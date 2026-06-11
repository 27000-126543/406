import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  message,
  Typography,
  DatePicker,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  CloseOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { WorkOrder, WorkOrderStatus } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const workOrderTypeMap: Record<string, string> = {
  repair: '维修',
  maintenance: '保养',
  calibration: '校准',
  inspection: '巡检',
};

const workOrderTypeColor: Record<string, string> = {
  repair: 'red',
  maintenance: 'blue',
  calibration: 'purple',
  inspection: 'cyan',
};

const workOrderStatusColor: Record<string, string> = {
  pending: 'orange',
  assigned: 'blue',
  in_progress: 'processing',
  completed: 'success',
  cancelled: 'default',
};

const workOrderStatusName: Record<string, string> = {
  pending: '待分配',
  assigned: '已派单',
  in_progress: '处理中',
  completed: '已完成',
  cancelled: '已取消',
};

const priorityColor: Record<string, string> = {
  low: 'green',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const priorityName: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const departments = [
  '放射科',
  '超声科',
  '检验科',
  '手术室',
  'ICU',
  '心内科CCU',
  '急诊科',
  '消化内科',
  '新生儿科',
  '肾内科',
  '康复科',
];

export default function WorkOrderList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    workOrders,
    loading,
    fetchWorkOrders,
    fetchEngineers,
    engineers,
    assignWorkOrder,
    smartDispatch,
    cancelWorkOrder,
  } = useWorkOrderStore();

  const [searchParams, setSearchParams] = useState({
    status: undefined as WorkOrderStatus | undefined,
    priority: undefined as string | undefined,
    department: undefined as string | undefined,
    dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [assignForm] = Form.useForm();
  const [cancelForm] = Form.useForm();

  useEffect(() => {
    fetchWorkOrders();
    fetchEngineers();
  }, [fetchWorkOrders, fetchEngineers]);

  const filteredWorkOrders = useMemo(() => {
    let result = [...workOrders];

    if (searchParams.status) {
      result = result.filter((w) => w.status === searchParams.status);
    }
    if (searchParams.priority) {
      result = result.filter((w) => w.priority === searchParams.priority);
    }
    if (searchParams.department) {
      result = result.filter((w) => w.department === searchParams.department);
    }
    if (searchParams.dateRange && searchParams.dateRange.length === 2) {
      const start = searchParams.dateRange[0].startOf('day');
      const end = searchParams.dateRange[1].endOf('day');
      result = result.filter((w) => {
        const createdAt = dayjs(w.createdAt);
        return createdAt.isAfter(start) && createdAt.isBefore(end);
      });
    }

    if (user?.role === 'engineer') {
      result = result.filter((w) => w.assigneeId === user.id);
    } else if (user?.role === 'nurse') {
      result = result.filter((w) => w.reporterId === user.id);
    }

    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [workOrders, searchParams, user]);

  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
  };

  const handleReset = () => {
    setSearchParams({
      status: undefined,
      priority: undefined,
      department: undefined,
      dateRange: undefined,
    });
  };

  const handleAssign = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    assignForm.resetFields();
    setAssignModalVisible(true);
  };

  const handleSmartDispatch = async (workOrder: WorkOrder) => {
    const result = await smartDispatch(workOrder.id);
    if (result) {
      message.success(`已智能派单给 ${result.name}`);
    } else {
      message.error('智能派单失败，请手动派单');
    }
  };

  const handleSubmitAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      if (!selectedWorkOrder) return;

      const success = await assignWorkOrder(selectedWorkOrder.id, values.engineerId);
      if (success) {
        message.success('派单成功');
        setAssignModalVisible(false);
      } else {
        message.error('派单失败，请重试');
      }
    } catch {
      message.error('请选择工程师');
    }
  };

  const handleCancel = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    cancelForm.resetFields();
    setCancelModalVisible(true);
  };

  const handleSubmitCancel = async () => {
    try {
      const values = await cancelForm.validateFields();
      if (!selectedWorkOrder) return;

      const success = await cancelWorkOrder(selectedWorkOrder.id, values.reason);
      if (success) {
        message.success('工单已取消');
        setCancelModalVisible(false);
      } else {
        message.error('取消失败，请重试');
      }
    } catch {
      message.error('请填写取消原因');
    }
  };

  const canAssign = (workOrder: WorkOrder) => {
    return (
      workOrder.status === 'pending' &&
      (user?.role === 'admin' ||
        user?.role === 'director' ||
        user?.role === 'engineer')
    );
  };

  const canCancel = (workOrder: WorkOrder) => {
    if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
      return false;
    }
    return (
      workOrder.reporterId === user?.id ||
      user?.role === 'admin' ||
      user?.role === 'director'
    );
  };

  const columns = [
    {
      title: '工单号',
      dataIndex: 'id',
      key: 'id',
      render: (text: string, record: WorkOrder) => (
        <a
          onClick={() => navigate(`/workorders/${record.id}`)}
          className="font-medium"
        >
          {text}
        </a>
      ),
    },
    {
      title: '工单类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={workOrderTypeColor[type]}>{workOrderTypeMap[type]}</Tag>
      ),
      filters: Object.entries(workOrderTypeMap).map(([value, text]) => ({
        text,
        value,
      })),
      onFilter: (value: string | number | boolean, record: WorkOrder) =>
        record.type === value,
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
    },
    {
      title: '故障描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '报修人',
      dataIndex: 'reporterName',
      key: 'reporterName',
    },
    {
      title: '报修时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: WorkOrder, b: WorkOrder) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: WorkOrderStatus) => (
        <Tag color={workOrderStatusColor[status]}>
          {workOrderStatusName[status]}
        </Tag>
      ),
      filters: Object.entries(workOrderStatusName).map(([value, text]) => ({
        text,
        value,
      })),
      onFilter: (value: string | number | boolean, record: WorkOrder) =>
        record.status === value,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priorityColor[priority]}>{priorityName[priority]}</Tag>
      ),
      filters: Object.entries(priorityName).map(([value, text]) => ({
        text,
        value,
      })),
      onFilter: (value: string | number | boolean, record: WorkOrder) =>
        record.priority === value,
    },
    {
      title: '处理人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      render: (name?: string) => name || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: WorkOrder) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/workorders/${record.id}`)}
          >
            详情
          </Button>
          {canAssign(record) && (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<UserOutlined />}
                onClick={() => handleAssign(record)}
              >
                派单
              </Button>
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleSmartDispatch(record)}
              >
                智能派单
              </Button>
            </Space>
          )}
          {canCancel(record) && (
            <Popconfirm
              title="取消工单"
              description="确定要取消此工单吗？"
              onConfirm={() => handleCancel(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<CloseOutlined />}>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            工单管理
          </Title>
          <Text type="secondary">共 {filteredWorkOrders.length} 条工单</Text>
        </div>
      </div>

      <Card>
        <Form layout="vertical">
          <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="工单状态" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部状态"
                  allowClear
                  value={searchParams.status}
                  onChange={(value) =>
                    setSearchParams({ ...searchParams, status: value })
                  }
                >
                  {Object.entries(workOrderStatusName).map(([value, text]) => (
                    <Option key={value} value={value}>
                      <Tag color={workOrderStatusColor[value]}>{text}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="优先级" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部优先级"
                  allowClear
                  value={searchParams.priority}
                  onChange={(value) =>
                    setSearchParams({ ...searchParams, priority: value })
                  }
                >
                  {Object.entries(priorityName).map(([value, text]) => (
                    <Option key={value} value={value}>
                      <Tag color={priorityColor[value]}>{text}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="报修科室" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部科室"
                  allowClear
                  value={searchParams.department}
                  onChange={(value) =>
                    setSearchParams({ ...searchParams, department: value })
                  }
                >
                  {departments.map((dept) => (
                    <Option key={dept} value={dept}>
                      {dept}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="报修时间范围" style={{ marginBottom: 0 }}>
                <RangePicker
                  style={{ width: '100%' }}
                  value={searchParams.dateRange}
                  onChange={(dates) =>
                    setSearchParams({
                      ...searchParams,
                      dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs],
                    })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
          <Row className="mt-4">
            <Col>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  搜索
                </Button>
                <Button onClick={handleReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredWorkOrders}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredWorkOrders.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title="分配工单"
        open={assignModalVisible}
        onOk={handleSubmitAssign}
        onCancel={() => setAssignModalVisible(false)}
        okText="确认派单"
        cancelText="取消"
      >
        {selectedWorkOrder && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Text strong>工单号：</Text>
            <Text>{selectedWorkOrder.id}</Text>
            <br />
            <Text strong>设备：</Text>
            <Text>{selectedWorkOrder.deviceName}</Text>
            <br />
            <Text strong>标题：</Text>
            <Text type="secondary">{selectedWorkOrder.title}</Text>
          </div>
        )}
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="engineerId"
            label="选择工程师"
            rules={[{ required: true, message: '请选择工程师' }]}
          >
            <Select placeholder="请选择处理工程师">
              {engineers.map((engineer) => (
                <Option key={engineer.id} value={engineer.id}>
                  {engineer.name} - {engineer.department}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="取消工单"
        open={cancelModalVisible}
        onOk={handleSubmitCancel}
        onCancel={() => setCancelModalVisible(false)}
        okText="确认取消"
        cancelText="返回"
        okButtonProps={{ danger: true }}
      >
        {selectedWorkOrder && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Text strong>工单号：</Text>
            <Text>{selectedWorkOrder.id}</Text>
            <br />
            <Text strong>设备：</Text>
            <Text>{selectedWorkOrder.deviceName}</Text>
          </div>
        )}
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            name="reason"
            label="取消原因"
            rules={[{ required: true, message: '请填写取消原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请说明取消工单的原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
