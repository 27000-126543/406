import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Card,
  Button,
  Tag,
  Space,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Progress,
  Alert,
  Descriptions,
  Badge,
  List,
  Avatar,
  Row,
  Col,
  Statistic,
  Divider,
  Empty,
} from 'antd';
import {
  ToolOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ScanOutlined,
  UploadOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useDeviceStore } from '@/store/useDeviceStore';
import type { WorkOrder, Inventory, WorkOrderPart, RepairRecord } from '@/types';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const priorityColors: Record<string, string> = {
  low: 'green',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

interface RepairFormData {
  faultAnalysis: string;
  solution: string;
  parts: WorkOrderPart[];
  beforeImages: string[];
  afterImages: string[];
}

export default function RepairWorkbench() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [partsModalVisible, setPartsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [repairForm] = Form.useForm<RepairFormData>();
  const [repairTimer, setRepairTimer] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedParts, setSelectedParts] = useState<WorkOrderPart[]>([]);
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [beforeImageList, setBeforeImageList] = useState<UploadProps['fileList']>([]);
  const [afterImageList, setAfterImageList] = useState<UploadProps['fileList']>([]);

  const {
    workOrders,
    partInventory,
    loading,
    fetchWorkOrders,
    fetchPartInventory,
    acceptWorkOrder,
    startRepair,
    completeWorkOrder,
    checkPartsStock,
  } = useWorkOrderStore();

  const { devices } = useDeviceStore();

  useEffect(() => {
    fetchWorkOrders();
    fetchPartInventory();
  }, [fetchWorkOrders, fetchPartInventory]);

  useEffect(() => {
    let interval: number;
    if (timerRunning) {
      interval = window.setInterval(() => {
        setRepairTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const pendingOrders = workOrders.filter(
    (w) => w.status === 'assigned' || w.status === 'pending'
  );
  const inProgressOrders = workOrders.filter((w) => w.status === 'in_progress');
  const completedOrders = workOrders.filter((w) => w.status === 'completed');

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCountdown = (workOrder: WorkOrder) => {
    const updatedAt = dayjs(workOrder.updatedAt);
    const now = dayjs();
    const elapsed = now.diff(updatedAt, 'minute');
    const remaining = 15 - elapsed;
    if (remaining <= 0) return { text: '已超时', color: 'red' };
    if (remaining <= 5) return { text: `${remaining}分钟`, color: 'orange' };
    return { text: `${remaining}分钟`, color: 'blue' };
  };

  const handleAcceptOrder = async (workOrderId: string) => {
    const success = await acceptWorkOrder(workOrderId);
    if (success) {
      message.success('接单成功');
    }
  };

  const handleStartRepair = async (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    const success = await startRepair(workOrder.id);
    if (success) {
      setTimerRunning(true);
      setRepairTimer(0);
      setRepairModalVisible(true);
      message.success('开始维修');
    }
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
  };

  const handleResumeTimer = () => {
    setTimerRunning(true);
  };

  const handleScanConfirm = () => {
    setScanModalVisible(true);
  };

  const handleScanSuccess = () => {
    setScanModalVisible(false);
    message.success('扫码确认成功');
  };

  const handleOpenPartsSelector = () => {
    setPartsModalVisible(true);
  };

  const handlePartSelect = (part: Inventory, checked: boolean) => {
    if (checked) {
      setSelectedParts((prev) => [
        ...prev,
        {
          partId: part.id,
          partName: part.name,
          quantity: 1,
          unitPrice: part.unitPrice,
          inStock: part.quantity > 0,
        },
      ]);
    } else {
      setSelectedParts((prev) => prev.filter((p) => p.partId !== part.id));
    }
  };

  const handlePartQuantityChange = (partId: string, quantity: number) => {
    setSelectedParts((prev) =>
      prev.map((p) => (p.partId === partId ? { ...p, quantity } : p))
    );
  };

  const handleCheckStock = async () => {
    const result = await checkPartsStock(selectedParts);
    if (!result.available) {
      setStockWarning(
        `以下配件库存不足：${result.insufficientParts.map((p) => p.partName).join('、')}`
      );
    } else {
      setStockWarning(null);
      message.success('库存充足');
    }
  };

  const handleConfirmParts = () => {
    repairForm.setFieldsValue({ parts: selectedParts });
    setPartsModalVisible(false);
  };

  const handleOpenReport = () => {
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    try {
      const values = await repairForm.validateFields();
      if (!selectedWorkOrder) return;

      const beforeImages = beforeImageList.map((f) => f.url || f.name);
      const afterImages = afterImageList.map((f) => f.url || f.name);

      const success = await completeWorkOrder(selectedWorkOrder.id, {
        actualTime: Math.floor(repairTimer / 60),
        failureAnalysis: values.faultAnalysis,
        solution: values.solution,
        parts: selectedParts,
        images: [...beforeImages, ...afterImages],
      });

      if (success) {
        message.success('维修报告提交成功');
        setReportModalVisible(false);
        setRepairModalVisible(false);
        setTimerRunning(false);
        setSelectedWorkOrder(null);
        repairForm.resetFields();
        setSelectedParts([]);
        setBeforeImageList([]);
        setAfterImageList([]);
      }
    } catch {
      message.error('请填写完整的维修报告');
    }
  };

  const beforeUploadProps: UploadProps = {
    fileList: beforeImageList,
    onChange: ({ fileList }) => setBeforeImageList(fileList),
    beforeUpload: () => false,
    listType: 'picture-card',
  };

  const afterUploadProps: UploadProps = {
    fileList: afterImageList,
    onChange: ({ fileList }) => setAfterImageList(fileList),
    beforeUpload: () => false,
    listType: 'picture-card',
  };

  const renderPendingCard = (workOrder: WorkOrder) => {
    const countdown = getCountdown(workOrder);
    const device = devices.find((d) => d.id === workOrder.deviceId);

    return (
      <Card
        key={workOrder.id}
        className="mb-4 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate(`/repair/${workOrder.id}`)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-lg">{workOrder.deviceName}</span>
              <Tag color={priorityColors[workOrder.priority]}>
                {priorityLabels[workOrder.priority]}优先级
              </Tag>
            </div>
            <div className="text-text-secondary text-sm mb-2">
              {workOrder.title}
            </div>
          </div>
          <Badge
            count={countdown.text}
            color={countdown.color}
            showZero
          />
        </div>

        <Descriptions column={2} size="small" className="mb-3">
          <Descriptions.Item label="故障描述">{workOrder.description}</Descriptions.Item>
          <Descriptions.Item label="位置">{workOrder.location}</Descriptions.Item>
          <Descriptions.Item label="科室">{workOrder.department}</Descriptions.Item>
          <Descriptions.Item label="报修人">{workOrder.reporterName}</Descriptions.Item>
          <Descriptions.Item label="设备型号">{device?.model || '-'}</Descriptions.Item>
          <Descriptions.Item label="设备编号">{device?.serialNumber || '-'}</Descriptions.Item>
        </Descriptions>

        <div className="flex justify-between items-center">
          <Space>
            <Tag color="blue">{workOrder.type === 'repair' ? '维修' : workOrder.type === 'maintenance' ? '保养' : workOrder.type === 'calibration' ? '校准' : '巡检'}</Tag>
            <span className="text-text-tertiary text-sm">
              创建时间：{dayjs(workOrder.createdAt).format('YYYY-MM-DD HH:mm')}
            </span>
          </Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleAcceptOrder(workOrder.id);
            }}
          >
            一键接单
          </Button>
        </div>
      </Card>
    );
  };

  const renderInProgressCard = (workOrder: WorkOrder) => {
    const device = devices.find((d) => d.id === workOrder.deviceId);
    const progress = workOrder.actualTime
      ? Math.min(100, Math.round((workOrder.actualTime / (workOrder.estimatedTime || 60)) * 100))
      : 0;

    return (
      <Card
        key={workOrder.id}
        className="mb-4 hover:shadow-lg transition-shadow"
        onClick={() => navigate(`/repair/${workOrder.id}`)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-lg">{workOrder.deviceName}</span>
              <Tag color={priorityColors[workOrder.priority]}>
                {priorityLabels[workOrder.priority]}优先级
              </Tag>
              <Tag color="processing">处理中</Tag>
            </div>
            <div className="text-text-secondary text-sm mb-2">
              {workOrder.title}
            </div>
          </div>
          <span className="text-text-tertiary text-sm">
            预计 {workOrder.estimatedTime || 60} 分钟
          </span>
        </div>

        <Progress percent={progress} className="mb-3" />

        <Descriptions column={2} size="small" className="mb-3">
          <Descriptions.Item label="故障描述">{workOrder.description}</Descriptions.Item>
          <Descriptions.Item label="位置">{workOrder.location}</Descriptions.Item>
          <Descriptions.Item label="负责人">{workOrder.assigneeName}</Descriptions.Item>
          <Descriptions.Item label="设备型号">{device?.model || '-'}</Descriptions.Item>
        </Descriptions>

        <div className="flex justify-between items-center">
          <Space>
            <span className="text-text-tertiary text-sm">
              开始时间：{dayjs(workOrder.updatedAt).format('YYYY-MM-DD HH:mm')}
            </span>
          </Space>
          <Space>
            <Button
              icon={<ScanOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleScanConfirm();
              }}
            >
              扫码确认
            </Button>
            <Button
              icon={<InboxOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenPartsSelector();
              }}
            >
              选择配件
            </Button>
            <Button
              type="primary"
              icon={<ToolOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleStartRepair(workOrder);
              }}
            >
              开始维修
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  const completedColumns = [
    {
      title: '工单编号',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
    },
    {
      title: '工单标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => (
        <Tag color={priorityColors[p]}>{priorityLabels[p]}</Tag>
      ),
    },
    {
      title: '实际用时(分钟)',
      dataIndex: 'actualTime',
      key: 'actualTime',
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: WorkOrder) => (
        <Button type="link" onClick={() => navigate(`/repair/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ];

  const partsColumns = [
    {
      title: '配件名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '库存数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q: number, record: Inventory) => (
        <span className={q < record.minStock ? 'text-error' : ''}>
          {q} {record.unit}
        </span>
      ),
    },
    {
      title: '单价(元)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          normal: { text: '正常', color: 'green' },
          low_stock: { text: '库存低', color: 'orange' },
          out_of_stock: { text: '缺货', color: 'red' },
          expired: { text: '过期', color: 'default' },
        };
        const status = statusMap[s] || statusMap.normal;
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '选择',
      key: 'select',
      render: (_: unknown, record: Inventory) => (
        <Select
          style={{ width: 100 }}
          placeholder="数量"
          value={selectedParts.find((p) => p.partId === record.id)?.quantity || undefined}
          onChange={(value) => {
            if (value) {
              if (!selectedParts.find((p) => p.partId === record.id)) {
                handlePartSelect(record, true);
              }
              handlePartQuantityChange(record.id, value);
            } else {
              handlePartSelect(record, false);
            }
          }}
          disabled={record.quantity === 0}
          allowClear
        >
          {Array.from({ length: Math.min(record.quantity, 10) }, (_, i) => (
            <Option key={i + 1} value={i + 1}>
              {i + 1}
            </Option>
          ))}
        </Select>
      ),
    },
  ];

  const items = [
    {
      key: 'pending',
      label: (
        <span>
          <ClockCircleOutlined /> 待接工单
          <Badge count={pendingOrders.length} className="ml-2" />
        </span>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]} className="mb-4">
            <Col span={6}>
              <Card>
                <Statistic title="待接单总数" value={pendingOrders.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="紧急工单"
                  value={pendingOrders.filter((w) => w.priority === 'urgent').length}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="高优先级"
                  value={pendingOrders.filter((w) => w.priority === 'high').length}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="即将超时"
                  value={pendingOrders.filter((w) => {
                    const cd = getCountdown(w);
                    return cd.color === 'orange';
                  }).length}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
          {pendingOrders.length === 0 ? (
            <Empty description="暂无待接工单" />
          ) : (
            pendingOrders.map(renderPendingCard)
          )}
        </div>
      ),
    },
    {
      key: 'in_progress',
      label: (
        <span>
          <PlayCircleOutlined /> 处理中工单
          <Badge count={inProgressOrders.length} className="ml-2" />
        </span>
      ),
      children: (
        <div>
          {inProgressOrders.length === 0 ? (
            <Empty description="暂无处理中工单" />
          ) : (
            inProgressOrders.map(renderInProgressCard)
          )}
        </div>
      ),
    },
    {
      key: 'completed',
      label: (
        <span>
          <CheckCircleOutlined /> 已完成工单
        </span>
      ),
      children: (
        <Table
          columns={completedColumns}
          dataSource={completedOrders}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">维修工作台</h1>
        <p className="text-text-secondary">处理维修工单、记录维修过程、提交维修报告</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        className="bg-white rounded-lg p-4"
      />

      <Modal
        title={
          <div className="flex items-center gap-2">
            <ToolOutlined className="text-primary" />
            维修进行中
          </div>
        }
        open={repairModalVisible}
        width={800}
        footer={null}
        onCancel={() => {
          setRepairModalVisible(false);
          setTimerRunning(false);
        }}
      >
        {selectedWorkOrder && (
          <div>
            <div className="bg-primary-light rounded-lg p-4 mb-4">
              <Row gutter={16}>
                <Col span={12}>
                  <div className="text-text-secondary text-sm mb-1">维修计时器</div>
                  <div className="text-4xl font-mono font-bold text-primary">
                    {formatTime(repairTimer)}
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm mb-1">当前维修设备</div>
                  <div className="text-xl font-medium">{selectedWorkOrder.deviceName}</div>
                  <div className="text-text-secondary text-sm">
                    {selectedWorkOrder.title}
                  </div>
                </Col>
              </Row>
              <div className="mt-4">
                <Space>
                  {timerRunning ? (
                    <Button
                      icon={<PauseCircleOutlined />}
                      onClick={handlePauseTimer}
                    >
                      暂停计时
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleResumeTimer}
                    >
                      继续计时
                    </Button>
                  )}
                  <Button icon={<ScanOutlined />} onClick={handleScanConfirm}>
                    扫码确认到达
                  </Button>
                  <Button icon={<InboxOutlined />} onClick={handleOpenPartsSelector}>
                    更换配件 ({selectedParts.length})
                  </Button>
                </Space>
              </div>
            </div>

            {selectedParts.length > 0 && (
              <Alert
                message={`已选择 ${selectedParts.length} 种配件`}
                description={
                  <List
                    size="small"
                    dataSource={selectedParts}
                    renderItem={(item) => (
                      <List.Item>
                        <span>{item.partName}</span>
                        <span className="text-text-secondary">
                          × {item.quantity} = ¥{item.unitPrice * item.quantity}
                        </span>
                      </List.Item>
                    )}
                  />
                }
                type="info"
                showIcon
                className="mb-4"
              />
            )}

            <div className="text-center">
              <Button type="primary" size="large" onClick={handleOpenReport}>
                填写维修报告
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="扫码确认"
        open={scanModalVisible}
        onOk={handleScanSuccess}
        onCancel={() => setScanModalVisible(false)}
      >
        <div className="text-center py-8">
          <div className="w-48 h-48 mx-auto mb-4 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
            <ScanOutlined className="text-6xl text-primary" />
          </div>
          <p className="text-text-secondary">请扫描设备二维码确认到达现场</p>
        </div>
      </Modal>

      <Modal
        title="选择配件"
        open={partsModalVisible}
        width={900}
        onOk={handleConfirmParts}
        onCancel={() => setPartsModalVisible(false)}
      >
        {stockWarning && (
          <Alert
            message="库存警告"
            description={stockWarning}
            type="warning"
            showIcon
            className="mb-4"
          />
        )}
        <Table
          columns={partsColumns}
          dataSource={partInventory}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
        />
        <div className="mt-4 text-right">
          <Button onClick={handleCheckStock} icon={<WarningOutlined />}>
            检查库存
          </Button>
        </div>
      </Modal>

      <Modal
        title="维修报告"
        open={reportModalVisible}
        width={800}
        onOk={handleSubmitReport}
        onCancel={() => setReportModalVisible(false)}
        okText="提交报告"
      >
        <Form form={repairForm} layout="vertical">
          <Form.Item
            name="faultAnalysis"
            label="故障原因分析"
            rules={[{ required: true, message: '请填写故障原因分析' }]}
          >
            <TextArea rows={3} placeholder="请详细描述故障原因分析过程" />
          </Form.Item>

          <Form.Item
            name="solution"
            label="解决方案"
            rules={[{ required: true, message: '请填写解决方案' }]}
          >
            <TextArea rows={3} placeholder="请详细描述解决问题的方法和过程" />
          </Form.Item>

          {selectedParts.length > 0 && (
            <Form.Item label="更换配件">
              <Table
                size="small"
                columns={[
                  { title: '配件名称', dataIndex: 'partName', key: 'partName' },
                  { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                  {
                    title: '单价',
                    dataIndex: 'unitPrice',
                    key: 'unitPrice',
                    render: (v: number) => `¥${v}`,
                  },
                  {
                    title: '小计',
                    key: 'total',
                    render: (_: unknown, record: WorkOrderPart) =>
                      `¥${record.unitPrice * record.quantity}`,
                  },
                ]}
                dataSource={selectedParts}
                rowKey="partId"
                pagination={false}
              />
              <div className="mt-2 text-right font-medium">
                配件总费用：¥
                {selectedParts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)}
              </div>
            </Form.Item>
          )}

          <Divider />

          <Form.Item label="维修前照片">
            <Dragger {...beforeUploadProps}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽上传维修前照片</p>
              <p className="ant-upload-hint">支持 JPG、PNG 格式</p>
            </Dragger>
          </Form.Item>

          <Form.Item label="维修后照片">
            <Dragger {...afterUploadProps}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽上传维修后照片</p>
              <p className="ant-upload-hint">支持 JPG、PNG 格式</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
