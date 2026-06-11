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
  Badge,
  Row,
  Col,
  Statistic,
  Alert,
  Descriptions,
  Steps,
  Divider,
  Tooltip,
} from 'antd';
import {
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  UploadOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  CalculatorOutlined,
  UserOutlined,
  QrcodeOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { mockScrapApplications, mockDevices, mockRepairRecords } from '@/services/mock/data';
import type { ScrapApplication, Device, RepairRecord } from '@/types';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;
const { Step } = Steps;

const statusColors: Record<string, string> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
  completed: 'success',
};

const statusLabels: Record<string, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  completed: '已完成',
};

const approvalSteps = [
  { title: '提交申请', description: '申请人' },
  { title: '设备科审批', description: '设备科主任' },
  { title: '财务审批', description: '财务科' },
  { title: '完成', description: '资产更新' },
];

interface ScrapFormData {
  deviceId: string;
  reason: string;
}

export default function ScrapManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [applications, setApplications] = useState<ScrapApplication[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [repairRecords, setRepairRecords] = useState<RepairRecord[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ScrapApplication | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [scrapForm] = Form.useForm<ScrapFormData>();
  const [approvalForm] = Form.useForm<{ comments: string }>();
  const [fileList, setFileList] = useState<UploadProps['fileList']>([]);
  const [calculatedValue, setCalculatedValue] = useState<number | null>(null);

  useEffect(() => {
    setApplications(mockScrapApplications);
    setDevices(mockDevices.filter((d) => d.status !== 'scrapped'));
    setRepairRecords(mockRepairRecords);
  }, []);

  const getYearsUsed = (purchaseDate: string) => {
    const purchase = dayjs(purchaseDate);
    const now = dayjs();
    return now.diff(purchase, 'year', true);
  };

  const calculateSalvageValue = (device: Device) => {
    const yearsUsed = getYearsUsed(device.purchaseDate);
    const expectedYears = 10;
    const salvageValue = device.purchasePrice * (1 - yearsUsed / expectedYears);
    return Math.max(0, Math.round(salvageValue));
  };

  const getTotalRepairCost = (deviceId: string) => {
    return repairRecords
      .filter((r) => r.deviceId === deviceId)
      .reduce((sum, r) => sum + r.totalCost, 0);
  };

  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
      const value = calculateSalvageValue(device);
      setCalculatedValue(value);
    }
  };

  const handleCreateApplication = async () => {
    try {
      const values = await scrapForm.validateFields();
      const device = devices.find((d) => d.id === values.deviceId);
      if (!device) return;

      const files = fileList.map((f) => f.url || f.name);
      const salvageValue = calculatedValue || calculateSalvageValue(device);

      const newApplication: ScrapApplication = {
        id: `sa${Date.now()}`,
        deviceId: values.deviceId,
        deviceName: device.name,
        model: device.model,
        serialNumber: device.serialNumber,
        reason: values.reason,
        applicantId: 'u001',
        applicantName: '张明华',
        department: device.department,
        applicationDate: dayjs().format('YYYY-MM-DD'),
        estimatedValue: salvageValue,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setApplications((prev) => [newApplication, ...prev]);
      message.success('报废申请已提交，等待设备科主任审批');
      setCreateModalVisible(false);
      setSelectedDevice(null);
      setCalculatedValue(null);
      setFileList([]);
      scrapForm.resetFields();
    } catch {
      message.error('请填写完整的申请信息');
    }
  };

  const handleViewDetail = (application: ScrapApplication) => {
    setSelectedApplication(application);
    setDetailModalVisible(true);
  };

  const handleApprove = (application: ScrapApplication, type: 'approve' | 'reject') => {
    setSelectedApplication(application);
    approvalForm.resetFields();
    setApproveModalVisible(true);
  };

  const handleSubmitApproval = async (type: 'approve' | 'reject') => {
    try {
      const values = await approvalForm.validateFields();
      if (!selectedApplication) return;

      const currentStep = getCurrentStep(selectedApplication);

      let updatedStatus: ScrapApplication['status'];
      let approverName: string;
      let nextStep = currentStep + 1;

      if (type === 'reject') {
        updatedStatus = 'rejected';
        approverName = currentStep === 1 ? '张明华' : '赵会计';
        nextStep = 0;
      } else {
        if (currentStep === 1) {
          updatedStatus = 'pending';
          approverName = '张明华';
        } else {
          updatedStatus = 'completed';
          approverName = '赵会计';

          setDevices((prev) =>
            prev.map((d) =>
              d.id === selectedApplication.deviceId
                ? { ...d, status: 'scrapped', qrCode: undefined }
                : d
            )
          );
        }
      }

      setApplications((prev) =>
        prev.map((a) =>
          a.id === selectedApplication.id
            ? {
                ...a,
                status: updatedStatus,
                approverId: 'u001',
                approverName,
                approvalDate: dayjs().format('YYYY-MM-DD'),
                approvalComments: values.comments,
                scrapDate: updatedStatus === 'completed' ? dayjs().format('YYYY-MM-DD') : undefined,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );

      if (updatedStatus === 'completed') {
        message.success('财务审批通过，设备已注销，资产台账已更新');
      } else if (updatedStatus === 'rejected') {
        message.success('申请已拒绝');
      } else {
        message.success('设备科审批通过，已提交财务审批');
      }

      setApproveModalVisible(false);
      setSelectedApplication(null);
    } catch {
      message.error('请填写审批意见');
    }
  };

  const getCurrentStep = (application: ScrapApplication) => {
    if (application.status === 'rejected') return 0;
    if (application.status === 'completed') return 4;
    if (application.approverName) return 2;
    return 1;
  };

  const uploadProps: UploadProps = {
    fileList,
    onChange: ({ fileList }) => setFileList(fileList),
    beforeUpload: () => false,
  };

  const pendingApplications = applications.filter((a) => a.status === 'pending');
  const approvedApplications = applications.filter((a) => a.status === 'approved' || a.status === 'completed');
  const rejectedApplications = applications.filter((a) => a.status === 'rejected');

  const columns = [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      render: (text: string, record: ScrapApplication) => (
        <div className="font-medium">{text}</div>
      ),
    },
    {
      title: '设备型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '使用年限',
      key: 'yearsUsed',
      render: (_: unknown, record: ScrapApplication) => {
        const device = mockDevices.find((d) => d.id === record.deviceId);
        if (!device) return '-';
        const years = getYearsUsed(device.purchaseDate);
        return `${years.toFixed(1)} 年`;
      },
    },
    {
      title: '累计维修成本',
      key: 'repairCost',
      render: (_: unknown, record: ScrapApplication) => {
        const cost = getTotalRepairCost(record.deviceId);
        return <span className="text-warning">¥{cost.toLocaleString()}</span>;
      },
    },
    {
      title: '残值(元)',
      dataIndex: 'estimatedValue',
      key: 'estimatedValue',
      render: (value: number) => (
        <span className="text-success font-medium">¥{value.toLocaleString()}</span>
      ),
    },
    {
      title: '申请日期',
      dataIndex: 'applicationDate',
      key: 'applicationDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '当前审批',
      key: 'approver',
      render: (_: unknown, record: ScrapApplication) => {
        if (record.status === 'pending') {
          return record.approverName ? '财务科' : '设备科主任';
        }
        if (record.status === 'approved' || record.status === 'completed') {
          return '已完成';
        }
        return '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ScrapApplication) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && !record.approverName && (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => handleApprove(record, 'approve')}
              >
                设备科审批
              </Button>
            </>
          )}
          {record.status === 'pending' && record.approverName && (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => handleApprove(record, 'approve')}
              >
                财务审批
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span>
          <ClockCircleOutlined /> 待审批
          <Badge count={pendingApplications.length} className="ml-2" />
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={pendingApplications}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'approved',
      label: (
        <span>
          <CheckCircleOutlined /> 已批准
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={approvedApplications}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'rejected',
      label: (
        <span>
          <CloseCircleOutlined /> 已拒绝
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={rejectedApplications}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">报废管理</h1>
          <p className="text-text-secondary">
            管理设备报废申请、审批流程、资产注销
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => {
            setCreateModalVisible(true);
            setSelectedDevice(null);
            setCalculatedValue(null);
            setFileList([]);
            scrapForm.resetFields();
          }}
        >
          新增报废申请
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批申请"
              value={pendingApplications.length}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本年报废设备"
              value={approvedApplications.filter((a) =>
                dayjs(a.applicationDate).isSame(dayjs(), 'year')
              ).length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累计报废资产"
              value={approvedApplications.reduce((sum, a) => sum + a.estimatedValue, 0)}
              precision={0}
              valueStyle={{ color: '#faad14' }}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已拒绝申请"
              value={rejectedApplications.length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Alert
        message="审批流程：提交申请 → 设备科主任审批 → 财务审批 → 完成（自动注销二维码、更新资产台账）"
        type="info"
        showIcon
        className="mb-6"
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <PlusOutlined className="text-primary" />
            新增报废申请
          </div>
        }
        open={createModalVisible}
        width={700}
        onOk={handleCreateApplication}
        onCancel={() => {
          setCreateModalVisible(false);
          setSelectedDevice(null);
          setCalculatedValue(null);
          setFileList([]);
        }}
        okText="提交申请"
      >
        <Form form={scrapForm} layout="vertical">
          <Form.Item
            name="deviceId"
            label="选择设备"
            rules={[{ required: true, message: '请选择要报废的设备' }]}
          >
            <Select
              placeholder="请选择设备"
              showSearch
              optionFilterProp="children"
              onChange={handleDeviceSelect}
            >
              {devices.map((device) => (
                <Option key={device.id} value={device.id}>
                  {device.name} - {device.model} ({device.department})
                </Option>
              ))}
            </Select>
          </Form.Item>

          {selectedDevice && (
            <>
              <Card size="small" className="mb-4 bg-primary-light">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="设备名称">{selectedDevice.name}</Descriptions.Item>
                  <Descriptions.Item label="设备型号">{selectedDevice.model}</Descriptions.Item>
                  <Descriptions.Item label="序列号">{selectedDevice.serialNumber}</Descriptions.Item>
                  <Descriptions.Item label="所在科室">{selectedDevice.department}</Descriptions.Item>
                  <Descriptions.Item label="购置日期">
                    {dayjs(selectedDevice.purchaseDate).format('YYYY-MM-DD')}
                  </Descriptions.Item>
                  <Descriptions.Item label="使用年限">
                    {getYearsUsed(selectedDevice.purchaseDate).toFixed(1)} 年
                  </Descriptions.Item>
                  <Descriptions.Item label="购置原值">
                    ¥{selectedDevice.purchasePrice.toLocaleString()}
                  </Descriptions.Item>
                  <Descriptions.Item label="累计维修成本">
                    <span className="text-warning">
                      ¥{getTotalRepairCost(selectedDevice.id).toLocaleString()}
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card size="small" className="mb-4 bg-success-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalculatorOutlined className="text-success text-xl" />
                    <span>系统自动计算残值：</span>
                  </div>
                  <div className="text-2xl font-bold text-success">
                    ¥{calculatedValue?.toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-text-secondary mt-2">
                  计算公式：原值 × (1 - 已使用年限 / 预计使用年限10年)
                </div>
              </Card>
            </>
          )}

          <Form.Item
            name="reason"
            label="报废原因"
            rules={[{ required: true, message: '请填写报废原因' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细说明报废原因，如：设备老化、故障频发、维修成本过高、技术落后等"
            />
          </Form.Item>

          <Form.Item label="上传审批文件">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽上传相关审批文件</p>
              <p className="ant-upload-hint">支持 PDF、JPG、PNG 格式，如维修记录、鉴定报告等</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="报废申请详情"
        open={detailModalVisible}
        width={700}
        footer={
          <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
        }
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedApplication(null);
        }}
      >
        {selectedApplication && (
          <div>
            <Steps
              current={getCurrentStep(selectedApplication)}
              className="mb-6"
              status={selectedApplication.status === 'rejected' ? 'error' : 'process'}
            >
              {approvalSteps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  description={step.description}
                />
              ))}
            </Steps>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="设备名称">{selectedApplication.deviceName}</Descriptions.Item>
              <Descriptions.Item label="设备型号">{selectedApplication.model}</Descriptions.Item>
              <Descriptions.Item label="序列号">{selectedApplication.serialNumber}</Descriptions.Item>
              <Descriptions.Item label="申请部门">{selectedApplication.department}</Descriptions.Item>
              <Descriptions.Item label="申请人">{selectedApplication.applicantName}</Descriptions.Item>
              <Descriptions.Item label="申请日期">
                {dayjs(selectedApplication.applicationDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="报废原因">{selectedApplication.reason}</Descriptions.Item>
              <Descriptions.Item label="残值估算">
                <span className="text-success font-medium">
                  ¥{selectedApplication.estimatedValue.toLocaleString()}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColors[selectedApplication.status]}>
                  {statusLabels[selectedApplication.status]}
                </Tag>
              </Descriptions.Item>
              {selectedApplication.approverName && (
                <>
                  <Descriptions.Item label="审批人">{selectedApplication.approverName}</Descriptions.Item>
                  <Descriptions.Item label="审批日期">
                    {selectedApplication.approvalDate ? dayjs(selectedApplication.approvalDate).format('YYYY-MM-DD') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="审批意见">
                    {selectedApplication.approvalComments || '-'}
                  </Descriptions.Item>
                </>
              )}
              {selectedApplication.scrapDate && (
                <Descriptions.Item label="报废完成日期">
                  {dayjs(selectedApplication.scrapDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedApplication.status === 'completed' && (
              <Alert
                message="设备已完成报废流程"
                description="设备二维码已注销，资产台账已更新"
                type="success"
                showIcon
                icon={<QrcodeOutlined />}
                className="mt-4"
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <UserOutlined className="text-primary" />
            {selectedApplication && !selectedApplication.approverName
              ? '设备科主任审批'
              : '财务审批'}
          </div>
        }
        open={approveModalVisible}
        onOk={() => handleSubmitApproval('approve')}
        onCancel={() => {
          setApproveModalVisible(false);
          setSelectedApplication(null);
        }}
        okText="批准"
        okButtonProps={{ type: 'primary' }}
        cancelText="拒绝"
        cancelButtonProps={{ danger: true }}
        footer={(_, { OkBtn, CancelBtn }) => (
          <div className="flex justify-end gap-2">
            <Button
              danger
              onClick={() => handleSubmitApproval('reject')}
            >
              拒绝
            </Button>
            <Button
              type="primary"
              onClick={() => handleSubmitApproval('approve')}
            >
              批准
            </Button>
          </div>
        )}
      >
        {selectedApplication && (
          <div>
            <Card size="small" className="mb-4 bg-primary-light">
              <Row gutter={16}>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">设备名称</div>
                  <div className="font-medium">{selectedApplication.deviceName}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">设备型号</div>
                  <div>{selectedApplication.model}</div>
                </Col>
              </Row>
              <Row gutter={16} className="mt-2">
                <Col span={12}>
                  <div className="text-text-secondary text-sm">申请部门</div>
                  <div>{selectedApplication.department}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">残值</div>
                  <div className="text-success font-medium">
                    ¥{selectedApplication.estimatedValue.toLocaleString()}
                  </div>
                </Col>
              </Row>
            </Card>

            <div className="mb-4">
              <div className="font-medium mb-2">报废原因</div>
              <div className="p-3 bg-bg-secondary rounded-lg">
                {selectedApplication.reason}
              </div>
            </div>

            <Divider orientation="left">审批流程</Divider>

            <Steps
              current={getCurrentStep(selectedApplication)}
              size="small"
              className="mb-4"
            >
              {approvalSteps.map((step, index) => (
                <Step
                  key={index}
                  title={step.title}
                  description={step.description}
                />
              ))}
            </Steps>

            <Form form={approvalForm} layout="vertical">
              <Form.Item
                name="comments"
                label="审批意见"
                rules={[{ required: true, message: '请填写审批意见' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="请填写审批意见，如同意报废或拒绝原因"
                />
              </Form.Item>
            </Form>

            {selectedApplication && !selectedApplication.approverName && (
              <Alert
                message="设备科审批通过后，将自动提交财务科进行二次审批"
                type="info"
                showIcon
              />
            )}

            {selectedApplication && selectedApplication.approverName && (
              <Alert
                message="财务审批通过后，将自动注销设备二维码并更新资产台账"
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined />}
              />
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .bg-success-light {
          background-color: #f6ffed !important;
        }
      `}</style>
    </div>
  );
}
