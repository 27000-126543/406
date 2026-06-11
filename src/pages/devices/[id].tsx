import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Tabs,
  Timeline,
  Table,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Spin,
  Empty,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  QrcodeOutlined,
  ToolOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ScissorOutlined,
  SafetyOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  repairRecordService,
  maintenancePlanService,
  calibrationRecordService,
} from '@/services/mock';
import type {
  Device,
  RepairRecord,
  MaintenancePlan,
  CalibrationRecord,
  WorkOrder,
} from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

const statusColorMap: Record<string, string> = {
  normal: 'success',
  warning: 'warning',
  fault: 'error',
  maintenance: 'processing',
  calibrating: 'purple',
  scrapped: 'default',
};

const statusNameMap: Record<string, string> = {
  normal: '正常',
  warning: '预警',
  fault: '故障',
  maintenance: '保养中',
  calibrating: '校准中',
  scrapped: '已报废',
};

const workOrderTypeMap: Record<string, string> = {
  repair: '维修',
  maintenance: '保养',
  calibration: '校准',
  inspection: '巡检',
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

const faultCodeOptions = [
  { value: 'F001', label: 'F001-机械故障' },
  { value: 'F002', label: 'F002-电路故障' },
  { value: 'F003', label: 'F003-软件异常' },
  { value: 'F004', label: 'F004-显示异常' },
  { value: 'F005', label: 'F005-报警异常' },
  { value: 'F999', label: 'F999-其他' },
];

const priorityOptions = [
  { value: 'high', label: '高 - 影响生命支持设备' },
  { value: 'medium', label: '中 - 影响诊断' },
  { value: 'low', label: '低 - 不影响使用' },
];

export default function DeviceDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { devices, fetchDeviceById, selectedDevice, loading, generateQRCode, updateDeviceStatus } =
    useDeviceStore();
  const { workOrders, createRepair } = useWorkOrderStore();

  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [repairForm] = Form.useForm();
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [faultPhotoList, setFaultPhotoList] = useState<UploadProps['fileList']>([]);
  const [repairSubmitting, setRepairSubmitting] = useState(false);
  const [repairRecords, setRepairRecords] = useState<RepairRecord[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([]);
  const [calibrationRecords, setCalibrationRecords] = useState<CalibrationRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [activeRecordTab, setActiveRecordTab] = useState('repair');

  useEffect(() => {
    if (id) {
      fetchDeviceById(id);
    }
  }, [id, fetchDeviceById]);

  useEffect(() => {
    if (selectedDevice) {
      loadRelatedRecords();
    }
  }, [selectedDevice]);

  const loadRelatedRecords = async () => {
    if (!selectedDevice) return;
    setRecordsLoading(true);
    try {
      const [repairs, maintenances, calibrations] = await Promise.all([
        repairRecordService.getByDeviceId(selectedDevice.id),
        maintenancePlanService.getAll({ deviceId: selectedDevice.id }),
        calibrationRecordService.getAll({ deviceId: selectedDevice.id }),
      ]);
      setRepairRecords(repairs);
      setMaintenancePlans(maintenances);
      setCalibrationRecords(calibrations);
    } catch {
      message.error('加载相关记录失败');
    } finally {
      setRecordsLoading(false);
    }
  };

  const deviceWorkOrders = useMemo(() => {
    return workOrders.filter((w) => w.deviceId === id);
  }, [workOrders, id]);

  const statusTimeline = useMemo(() => {
    if (!selectedDevice) return [];

    const events = [
      {
        time: selectedDevice.createdAt,
        title: '设备入库',
        description: `${selectedDevice.name} 已完成入库登记`,
        color: 'green',
        icon: <CheckCircleOutlined />,
      },
    ];

    if (selectedDevice.lastMaintenance) {
      events.push({
        time: selectedDevice.lastMaintenance,
        title: '设备保养',
        description: `上次保养时间：${dayjs(selectedDevice.lastMaintenance).format('YYYY-MM-DD')}`,
        color: 'blue',
        icon: <ToolOutlined />,
      });
    }

    if (selectedDevice.lastCalibration) {
      events.push({
        time: selectedDevice.lastCalibration,
        title: '设备校准',
        description: `上次校准时间：${dayjs(selectedDevice.lastCalibration).format('YYYY-MM-DD')}`,
        color: 'purple',
        icon: <SafetyOutlined />,
      });
    }

    if (selectedDevice.status === 'fault') {
      events.push({
        time: selectedDevice.updatedAt,
        title: '设备故障',
        description: '设备出现故障，等待维修',
        color: 'red',
        icon: <ToolOutlined />,
      });
    }

    if (selectedDevice.status === 'maintenance') {
      events.push({
        time: selectedDevice.updatedAt,
        title: '保养中',
        description: '设备正在进行预防性维护保养',
        color: 'blue',
        icon: <ToolOutlined />,
      });
    }

    if (selectedDevice.status === 'scrapped') {
      events.push({
        time: selectedDevice.updatedAt,
        title: '设备报废',
        description: '设备已完成报废处理',
        color: 'gray',
        icon: <DeleteOutlined />,
      });
    }

    events.push({
      time: selectedDevice.updatedAt,
      title: '当前状态',
      description: `设备状态：${statusNameMap[selectedDevice.status]}`,
      color: statusColorMap[selectedDevice.status] === 'success' ? 'green' : statusColorMap[selectedDevice.status] === 'error' ? 'red' : 'blue',
      icon: <ClockCircleOutlined />,
    });

    return events.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [selectedDevice]);

  const handleOpenRepair = () => {
    repairForm.resetFields();
    setFaultPhotoList([]);
    setRepairModalVisible(true);
  };

  const handleRepair = async () => {
    try {
      const values = await repairForm.validateFields();
      if (!selectedDevice) return;

      setRepairSubmitting(true);

      const faultPhotos = faultPhotoList.map(
        (f) => f.url || f.name || `photo_${Date.now()}_${f.uid}`
      );

      const workOrder = await createRepair({
        deviceId: selectedDevice.id,
        deviceName: selectedDevice.name,
        type: 'repair',
        title: values.title || `${selectedDevice.name} 报修`,
        description: values.description,
        priority: values.priority,
        department: selectedDevice.department,
        location: selectedDevice.location,
        reporterId: user?.id || '',
        reporterName: user?.name || '',
        estimatedTime: 120,
        faultCode: values.faultCode,
        faultPhotos,
      });

      if (workOrder) {
        const assigneeName = workOrder.assigneeName || '系统指派工程师';
        message.success(`报修成功，已自动派单给${assigneeName}`);
        setRepairModalVisible(false);
        setFaultPhotoList([]);
        navigate(`/workorders/${workOrder.id}`);
      } else {
        message.error('报修失败，请重试');
      }
    } catch {
      message.error('请填写完整信息');
    } finally {
      setRepairSubmitting(false);
    }
  };

  const handleScrap = async () => {
    if (!selectedDevice) return;
    try {
      const result = await updateDeviceStatus(selectedDevice.id, 'scrapped');
      if (result) {
        message.success('报废申请已提交');
      } else {
        message.error('提交失败，请重试');
      }
    } catch {
      message.error('提交失败，请重试');
    }
  };

  const repairColumns = [
    {
      title: '维修日期',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: RepairRecord, b: RepairRecord) =>
        dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf(),
    },
    {
      title: '故障原因',
      dataIndex: 'diagnosis',
      key: 'diagnosis',
      render: (v: string) => v || '-',
    },
    {
      title: '故障描述',
      dataIndex: 'faultDescription',
      key: 'faultDescription',
    },
    {
      title: '解决方案',
      dataIndex: 'solution',
      key: 'solution',
    },
    {
      title: '维修工程师',
      dataIndex: 'technicianName',
      key: 'technicianName',
    },
    {
      title: '实际用时',
      key: 'actualDuration',
      render: (_: any, r: RepairRecord) => {
        const duration = r.actualDuration || Math.round(
          (dayjs(r.endTime).valueOf() - dayjs(r.startTime).valueOf()) / 60000
        );
        return `${duration} 分钟`;
      },
    },
    {
      title: '更换配件',
      key: 'partsUsed',
      render: (_: any, r: RepairRecord) => {
        if (!r.partsUsed || r.partsUsed.length === 0) return '-';
        return (
          <Space direction="vertical" size={4}>
            {r.partsUsed.map((p) => (
              <div key={p.id}>
                <Text strong>{p.name}</Text>
                <Text type="secondary"> x{p.quantity}</Text>
              </div>
            ))}
          </Space>
        );
      },
    },
    {
      title: '费用',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => (
        <Text strong type="danger">¥{cost.toLocaleString()}</Text>
      ),
      sorter: (a: RepairRecord, b: RepairRecord) => a.totalCost - b.totalCost,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'success' : 'orange'}>
          {status === 'completed' ? '已完成' : '待审核'}
        </Tag>
      ),
    },
  ];

  const maintenanceColumns = [
    {
      title: '计划名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'preventive' ? 'blue' : type === 'predictive' ? 'purple' : 'orange'}>
          {type === 'preventive' ? '预防性' : type === 'predictive' ? '预测性' : '纠正性'}
        </Tag>
      ),
    },
    {
      title: '频率',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (freq: string) => {
        const freqMap: Record<string, string> = {
          daily: '每日',
          weekly: '每周',
          monthly: '每月',
          quarterly: '每季度',
          yearly: '每年',
        };
        return freqMap[freq] || freq;
      },
    },
    {
      title: '上次保养',
      dataIndex: 'lastDate',
      key: 'lastDate',
      render: (date?: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '下次保养',
      dataIndex: 'nextDate',
      key: 'nextDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '负责人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : status === 'paused' ? 'orange' : 'default'}>
          {status === 'active' ? '进行中' : status === 'paused' ? '已暂停' : '已完成'}
        </Tag>
      ),
    },
  ];

  const calibrationColumns = [
    {
      title: '校准日期',
      dataIndex: 'calibrationDate',
      key: 'calibrationDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: CalibrationRecord, b: CalibrationRecord) =>
        dayjs(a.calibrationDate).valueOf() - dayjs(b.calibrationDate).valueOf(),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'internal' ? 'blue' : 'purple'}>
          {type === 'internal' ? '内部校准' : '外部校准'}
        </Tag>
      ),
    },
    {
      title: '校准机构',
      dataIndex: 'calibrationAgency',
      key: 'calibrationAgency',
    },
    {
      title: '校准人员',
      dataIndex: 'calibrationPerson',
      key: 'calibrationPerson',
    },
    {
      title: '证书编号',
      dataIndex: 'certificateNumber',
      key: 'certificateNumber',
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => (
        <Tag
          color={
            result === 'pass'
              ? 'success'
              : result === 'conditional'
              ? 'orange'
              : 'error'
          }
        >
          {result === 'pass' ? '合格' : result === 'conditional' ? '有条件合格' : '不合格'}
        </Tag>
      ),
    },
    {
      title: '费用',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => `¥${cost.toLocaleString()}`,
    },
  ];

  const workOrderColumns = [
    {
      title: '工单号',
      dataIndex: 'id',
      key: 'id',
      render: (text: string, record: WorkOrder) => (
        <a onClick={() => navigate(`/workorders/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => workOrderTypeMap[type] || type,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={workOrderStatusColor[status]}>
          {workOrderStatusName[status]}
        </Tag>
      ),
    },
    {
      title: '报修人',
      dataIndex: 'reporterName',
      key: 'reporterName',
    },
    {
      title: '处理人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      render: (name?: string) => name || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const qrContent = selectedDevice ? generateQRCode(selectedDevice.id) : '';

  if (loading && !selectedDevice) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className="p-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/devices')}
          className="mb-4"
        >
          返回设备列表
        </Button>
        <Empty description="设备不存在" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/devices')}
          >
            返回
          </Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {selectedDevice.name}
            </Title>
            <Text type="secondary">
              {selectedDevice.manufacturer} {selectedDevice.model}
            </Text>
          </div>
        </div>
        <Space>
          <Button
            icon={<QrcodeOutlined />}
            onClick={() => setQrModalVisible(true)}
          >
            查看二维码
          </Button>
          <Button
            type="primary"
            icon={<ToolOutlined />}
            onClick={handleOpenRepair}
            disabled={selectedDevice.status === 'scrapped'}
          >
            报修
          </Button>
          <Popconfirm
            title="确认申请报废"
            description="申请报废后设备状态将变更，是否继续？"
            onConfirm={handleScrap}
            okText="确认"
            cancelText="取消"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedDevice.status === 'scrapped'}
            >
              申请报废
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="设备基本信息">
            <Descriptions column={2} bordered size="middle">
              <Descriptions.Item label="设备名称" span={2}>
                {selectedDevice.name}
              </Descriptions.Item>
              <Descriptions.Item label="品牌/制造商">
                {selectedDevice.manufacturer}
              </Descriptions.Item>
              <Descriptions.Item label="型号">
                {selectedDevice.model}
              </Descriptions.Item>
              <Descriptions.Item label="序列号">
                {selectedDevice.serialNumber}
              </Descriptions.Item>
              <Descriptions.Item label="设备类型">
                {selectedDevice.type}
              </Descriptions.Item>
              <Descriptions.Item label="所属科室">
                {selectedDevice.department}
              </Descriptions.Item>
              <Descriptions.Item label="放置位置">
                {selectedDevice.location}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={statusColorMap[selectedDevice.status]}>
                  {statusNameMap[selectedDevice.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="采购日期">
                {dayjs(selectedDevice.purchaseDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="采购价格">
                ¥{selectedDevice.purchasePrice.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="当前价值">
                ¥{selectedDevice.currentValue.toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="保修期至">
                {dayjs(selectedDevice.warrantyExpire).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="上次保养">
                {selectedDevice.lastMaintenance
                  ? dayjs(selectedDevice.lastMaintenance).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下次保养">
                {selectedDevice.nextMaintenance
                  ? dayjs(selectedDevice.nextMaintenance).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上次校准">
                {selectedDevice.lastCalibration
                  ? dayjs(selectedDevice.lastCalibration).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="下次校准">
                {selectedDevice.nextCalibration
                  ? dayjs(selectedDevice.nextCalibration).format('YYYY-MM-DD')
                  : '-'}
              </Descriptions.Item>
              {selectedDevice.description && (
                <Descriptions.Item label="设备描述" span={2}>
                  {selectedDevice.description}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="设备二维码" className="sticky top-6">
            <div className="text-center">
              <div className="p-4 bg-gray-50 rounded-lg inline-block mb-4">
                <QRCodeSVG value={qrContent} size={180} level="H" includeMargin />
              </div>
              <div className="text-sm">
                <Text strong>设备编号：</Text>
                <Text>{selectedDevice.id}</Text>
                <br />
                <Text strong>序列号：</Text>
                <Text type="secondary">{selectedDevice.serialNumber}</Text>
              </div>
            </div>
          </Card>

          <Card title="状态时间线" className="mt-4">
            <Timeline
              items={statusTimeline.map((event) => ({
                color: event.color,
                dot: event.icon,
                children: (
                  <div>
                    <Text strong>{event.title}</Text>
                    <br />
                    <Text type="secondary">{event.description}</Text>
                    <br />
                    <Text type="secondary" className="text-xs">
                      {dayjs(event.time).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Card title="相关记录">
        <Tabs
          activeKey={activeRecordTab}
          onChange={setActiveRecordTab}
          items={[
            {
              key: 'repair',
              label: '维修记录',
              children: (
                <Spin spinning={recordsLoading}>
                  <Table
                    columns={repairColumns}
                    dataSource={repairRecords}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: '暂无维修记录' }}
                  />
                </Spin>
              ),
            },
            {
              key: 'maintenance',
              label: '保养记录',
              children: (
                <Spin spinning={recordsLoading}>
                  <Table
                    columns={maintenanceColumns}
                    dataSource={maintenancePlans}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: '暂无保养计划' }}
                  />
                </Spin>
              ),
            },
            {
              key: 'calibration',
              label: '校准记录',
              children: (
                <Spin spinning={recordsLoading}>
                  <Table
                    columns={calibrationColumns}
                    dataSource={calibrationRecords}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: '暂无校准记录' }}
                  />
                </Spin>
              ),
            },
            {
              key: 'workorder',
              label: '工单历史',
              children: (
                <Table
                  columns={workOrderColumns}
                  dataSource={deviceWorkOrders}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: '暂无工单记录' }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="设备报修"
        open={repairModalVisible}
        onOk={handleRepair}
        onCancel={() => setRepairModalVisible(false)}
        okText="提交报修"
        cancelText="取消"
        confirmLoading={repairSubmitting}
        width={600}
      >
        {selectedDevice && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>设备名称：</Text>
                <Text>{selectedDevice.name}</Text>
              </Col>
              <Col span={12}>
                <Text strong>型号：</Text>
                <Text type="secondary">{selectedDevice.model}</Text>
              </Col>
              <Col span={12}>
                <Text strong>所属科室：</Text>
                <Text type="secondary">{selectedDevice.department}</Text>
              </Col>
              <Col span={12}>
                <Text strong>放置位置：</Text>
                <Text type="secondary">{selectedDevice.location}</Text>
              </Col>
            </Row>
          </div>
        )}
        <Form form={repairForm} layout="vertical">
          <Form.Item
            name="title"
            label="报修标题"
            rules={[{ required: true, message: '请输入报修标题' }]}
          >
            <Input placeholder="请简要描述故障" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="faultCode"
                label="故障代码"
                rules={[{ required: true, message: '请选择故障代码' }]}
              >
                <Select placeholder="请选择故障代码">
                  {faultCodeOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select placeholder="请选择优先级">
                  {priorityOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label="故障描述"
            rules={[{ required: true, message: '请描述故障情况' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细描述设备故障情况、现象、发生时间等" />
          </Form.Item>
          <Form.Item label="故障照片（至少支持3张）">
            <Upload
              listType="picture-card"
              fileList={faultPhotoList}
              onChange={({ fileList }) => setFaultPhotoList(fileList)}
              beforeUpload={() => false}
              multiple
              maxCount={9}
            >
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>上传照片</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="设备二维码"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div className="text-center">
          <div className="mb-4">
            <Text strong className="text-lg">
              {selectedDevice.name}
            </Text>
            <br />
            <Text type="secondary">{selectedDevice.model}</Text>
          </div>
          <div className="flex justify-center mb-4">
            <QRCodeSVG value={qrContent} size={250} level="H" includeMargin />
          </div>
          <Text type="secondary" className="text-sm">
            序列号：{selectedDevice.serialNumber}
          </Text>
        </div>
      </Modal>
    </div>
  );
}
