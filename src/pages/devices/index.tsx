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
  Popconfirm,
  Modal,
  message,
  Typography,
  Form,
  Upload,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ExportOutlined,
  EyeOutlined,
  QrcodeOutlined,
  ToolOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Device, DeviceStatus } from '@/types';

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

const deviceTypes = [
  '影像设备',
  '超声设备',
  '检验设备',
  '手术室设备',
  '生命支持设备',
  '监护设备',
  '急救设备',
  '内窥镜设备',
  '新生儿设备',
  '透析设备',
  '理疗设备',
];

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

export default function DeviceList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { devices, loading, fetchDevices, generateQRCode, updateDeviceStatus } = useDeviceStore();
  const { createRepair } = useWorkOrderStore();

  const [searchParams, setSearchParams] = useState({
    keyword: '',
    status: undefined as DeviceStatus | undefined,
    department: undefined as string | undefined,
    type: undefined as string | undefined,
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [repairForm] = Form.useForm();
  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [scrapModalVisible, setScrapModalVisible] = useState(false);
  const [faultPhotoList, setFaultPhotoList] = useState<UploadProps['fileList']>([]);
  const [repairSubmitting, setRepairSubmitting] = useState(false);

  useEffect(() => {
    fetchDevices(searchParams);
  }, [fetchDevices, searchParams]);

  const filteredDevices = useMemo(() => {
    let result = [...devices];

    if (searchParams.keyword) {
      const kw = searchParams.keyword.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(kw) ||
          d.model.toLowerCase().includes(kw) ||
          d.serialNumber.toLowerCase().includes(kw)
      );
    }
    if (searchParams.status) {
      result = result.filter((d) => d.status === searchParams.status);
    }
    if (searchParams.department) {
      result = result.filter((d) => d.department === searchParams.department);
    }
    if (searchParams.type) {
      result = result.filter((d) => d.type === searchParams.type);
    }

    return result;
  }, [devices, searchParams]);

  const handleSearch = () => {
    fetchDevices(searchParams);
    setPagination({ ...pagination, current: 1 });
  };

  const handleReset = () => {
    setSearchParams({
      keyword: '',
      status: undefined,
      department: undefined,
      type: undefined,
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(filteredDevices, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `设备列表_${dayjs().format('YYYYMMDD')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const handleShowQR = (device: Device) => {
    setSelectedDevice(device);
    generateQRCode(device.id);
    setQrModalVisible(true);
  };

  const handleRepair = (device: Device) => {
    setSelectedDevice(device);
    repairForm.resetFields();
    setFaultPhotoList([]);
    setRepairModalVisible(true);
  };

  const handleSubmitRepair = async () => {
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

  const handleScrap = async (device: Device) => {
    try {
      const result = await updateDeviceStatus(device.id, 'scrapped');
      if (result) {
        message.success('报废申请已提交');
        setScrapModalVisible(false);
      } else {
        message.error('提交失败，请重试');
      }
    } catch {
      message.error('提交失败，请重试');
    }
  };

  const columns = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Device) => (
        <a onClick={() => navigate(`/devices/${record.id}`)} className="font-medium">
          {text}
        </a>
      ),
    },
    {
      title: '品牌型号',
      dataIndex: 'model',
      key: 'model',
      render: (text: string, record: Device) => (
        <div>
          <div>{text}</div>
          <div className="text-xs text-gray-500">{record.manufacturer}</div>
        </div>
      ),
    },
    {
      title: '科室',
      dataIndex: 'department',
      key: 'department',
      filters: departments.map((d) => ({ text: d, value: d })),
      onFilter: (value: string | number | boolean, record: Device) =>
        record.department === value,
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: DeviceStatus) => (
        <Tag color={statusColorMap[status]}>{statusNameMap[status]}</Tag>
      ),
      filters: Object.entries(statusNameMap).map(([value, text]) => ({ text, value })),
      onFilter: (value: string | number | boolean, record: Device) =>
        record.status === value,
    },
    {
      title: '保修期',
      dataIndex: 'warrantyExpire',
      key: 'warrantyExpire',
      render: (date: string) => {
        const isExpired = dayjs(date).isBefore(dayjs());
        return (
          <Text type={isExpired ? 'danger' : undefined}>
            {dayjs(date).format('YYYY-MM-DD')}
          </Text>
        );
      },
      sorter: (a: Device, b: Device) =>
        dayjs(a.warrantyExpire).valueOf() - dayjs(b.warrantyExpire).valueOf(),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: unknown, record: Device) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => handleShowQR(record)}
          >
            二维码
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ToolOutlined />}
            onClick={() => handleRepair(record)}
            disabled={record.status === 'scrapped'}
          >
            报修
          </Button>
          <Popconfirm
            title="确认申请报废"
            description="申请报废后设备状态将变更，是否继续？"
            onConfirm={() => handleScrap(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.status === 'scrapped'}
            >
              报废
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const qrContent = selectedDevice
    ? generateQRCode(selectedDevice.id)
    : '';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            设备管理
          </Title>
          <Text type="secondary">共 {filteredDevices.length} 台设备</Text>
        </div>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            批量导出
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/devices/new')}
          >
            新增设备
          </Button>
        </Space>
      </div>

      <Card>
        <Form layout="vertical">
          <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="关键词搜索" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="设备名称/型号/序列号"
                  prefix={<SearchOutlined />}
                  value={searchParams.keyword}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, keyword: e.target.value })
                  }
                  onPressEnter={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="设备状态" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部状态"
                  allowClear
                  value={searchParams.status}
                  onChange={(value) =>
                    setSearchParams({ ...searchParams, status: value })
                  }
                >
                  {Object.entries(statusNameMap).map(([value, text]) => (
                    <Option key={value} value={value}>
                      <Tag color={statusColorMap[value]}>{text}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="所属科室" style={{ marginBottom: 0 }}>
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
              <Form.Item label="设备类型" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="全部类型"
                  allowClear
                  value={searchParams.type}
                  onChange={(value) =>
                    setSearchParams({ ...searchParams, type: value })
                  }
                >
                  {deviceTypes.map((type) => (
                    <Option key={type} value={type}>
                      {type}
                    </Option>
                  ))}
                </Select>
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
          dataSource={filteredDevices}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredDevices.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

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
        {selectedDevice && (
          <div className="text-center">
            <div className="mb-4">
              <Text strong className="text-lg">
                {selectedDevice.name}
              </Text>
              <br />
              <Text type="secondary">{selectedDevice.model}</Text>
            </div>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={qrContent} size={200} level="H" includeMargin />
            </div>
            <Text type="secondary" className="text-sm">
              序列号：{selectedDevice.serialNumber}
            </Text>
          </div>
        )}
      </Modal>

      <Modal
        title="设备报修"
        open={repairModalVisible}
        onOk={handleSubmitRepair}
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
    </div>
  );
}
