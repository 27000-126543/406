import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Space,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  message,
  Badge,
  Row,
  Col,
  Statistic,
  Alert,
  Descriptions,
  Switch,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  SafetyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  LockOutlined,
  UnlockOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ScanOutlined,
  PlusOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { mockCalibrationRecords, mockDevices } from '@/services/mock/data';
import type { CalibrationRecord, Device } from '@/types';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const resultColors: Record<string, string> = {
  pass: 'success',
  fail: 'error',
  conditional: 'warning',
};

const resultLabels: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
  conditional: '有条件合格',
};

const typeLabels: Record<string, string> = {
  internal: '内部校准',
  external: '外部校准',
};

interface CalibrationForm {
  deviceId: string;
  type: 'internal' | 'external';
  calibrationDate: dayjs.Dayjs;
  nextCalibrationDate: dayjs.Dayjs;
  calibrationAgency: string;
  calibrationPerson: string;
  certificateNumber: string;
  result: 'pass' | 'fail' | 'conditional';
  deviation?: string;
  remarks?: string;
  cost: number;
}

export default function CalibrationPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [calibrationRecords, setCalibrationRecords] = useState<CalibrationRecord[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CalibrationRecord | null>(null);
  const [calibrationForm] = Form.useForm<CalibrationForm>();
  const [fileList, setFileList] = useState<UploadProps['fileList']>([]);
  const [activeTab, setActiveTab] = useState<'devices' | 'records'>('devices');

  useEffect(() => {
    const calibrationDevices = mockDevices.filter(
      (d) => d.nextCalibration && d.status !== 'scrapped'
    );
    setDevices(calibrationDevices);
    setCalibrationRecords(mockCalibrationRecords);
  }, []);

  const isOverdue = (date: string) => {
    return dayjs(date).isBefore(dayjs(), 'day');
  };

  const isDueSoon = (date: string) => {
    const diff = dayjs(date).diff(dayjs(), 'day');
    return diff >= 0 && diff <= 30;
  };

  const isLocked = (device: Device) => {
    return device.nextCalibration ? isOverdue(device.nextCalibration) : false;
  };

  const getDeviceStatus = (device: Device) => {
    if (!device.nextCalibration) return { status: 'normal', text: '无需校准', color: 'default' };
    if (isLocked(device)) return { status: 'locked', text: '已锁定', color: 'error' };
    if (isDueSoon(device.nextCalibration)) return { status: 'warning', text: '即将到期', color: 'warning' };
    return { status: 'normal', text: '正常', color: 'success' };
  };

  const devicesNeedCalibration = devices.filter((d) => d.nextCalibration && (isDueSoon(d.nextCalibration) || isOverdue(d.nextCalibration)));
  const lockedDevices = devices.filter((d) => isLocked(d));
  const dueSoonDevices = devices.filter((d) => d.nextCalibration && isDueSoon(d.nextCalibration) && !isOverdue(d.nextCalibration));
  const calibratedThisYear = calibrationRecords.filter((r) =>
    dayjs(r.calibrationDate).isSame(dayjs(), 'year')
  ).length;

  const handleLockDevice = (deviceId: string, locked: boolean) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              status: locked ? 'calibrating' : 'normal',
            }
          : d
      )
    );
    message.success(locked ? '设备已锁定' : '设备已解锁');
  };

  const handleAddRecord = (device: Device) => {
    setSelectedDevice(device);
    calibrationForm.resetFields();
    calibrationForm.setFieldsValue({
      deviceId: device.id,
      type: 'internal',
      calibrationDate: dayjs(),
      nextCalibrationDate: dayjs().add(6, 'month'),
    });
    setRecordModalVisible(true);
  };

  const handleSubmitRecord = async () => {
    try {
      const values = await calibrationForm.validateFields();
      if (!selectedDevice) return;

      const newRecord: CalibrationRecord = {
        id: `cr${Date.now()}`,
        deviceId: values.deviceId,
        deviceName: selectedDevice.name,
        type: values.type,
        calibrationDate: values.calibrationDate.format('YYYY-MM-DD'),
        nextCalibrationDate: values.nextCalibrationDate.format('YYYY-MM-DD'),
        calibrationAgency: values.calibrationAgency,
        calibrationPerson: values.calibrationPerson,
        certificateNumber: values.certificateNumber,
        result: values.result,
        deviation: values.deviation,
        remarks: values.remarks,
        cost: values.cost,
        createdAt: new Date().toISOString(),
      };

      setCalibrationRecords((prev) => [newRecord, ...prev]);

      if (values.result === 'pass' || values.result === 'conditional') {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === values.deviceId
              ? {
                  ...d,
                  lastCalibration: values.calibrationDate.format('YYYY-MM-DD'),
                  nextCalibration: values.nextCalibrationDate.format('YYYY-MM-DD'),
                  status: 'normal',
                }
              : d
          )
        );
        message.success('校准记录已提交，设备已解锁');
      } else {
        message.success('校准记录已提交，设备仍处于锁定状态');
      }

      setRecordModalVisible(false);
      setSelectedDevice(null);
    } catch {
      message.error('请填写完整的校准信息');
    }
  };

  const handleUploadReport = (record: CalibrationRecord) => {
    setSelectedRecord(record);
    setFileList([]);
    setUploadModalVisible(true);
  };

  const handleSubmitReport = () => {
    if (fileList.length === 0) {
      message.warning('请上传校准证书');
      return;
    }

    const certificateUrl = fileList[0].url || fileList[0].name;
    setCalibrationRecords((prev) =>
      prev.map((r) =>
        r.id === selectedRecord?.id
          ? { ...r, certificateUrl }
          : r
      )
    );

    message.success('校准报告上传成功');
    setUploadModalVisible(false);
    setSelectedRecord(null);
    setFileList([]);
  };

  const handleViewDetail = (record: CalibrationRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const uploadProps: UploadProps = {
    fileList,
    onChange: ({ fileList }) => setFileList(fileList),
    beforeUpload: () => false,
    maxCount: 1,
    accept: '.pdf,.jpg,.png',
  };

  const deviceColumns = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Device) => {
        const deviceStatus = getDeviceStatus(record);
        const locked = isLocked(record);
        return (
          <div className="flex items-center gap-2">
            {locked && <LockOutlined className="text-error" />}
            <span className={locked ? 'text-error font-medium' : ''}>
              {text}
            </span>
            <Tag color={deviceStatus.color}>{deviceStatus.text}</Tag>
          </div>
        );
      },
    },
    {
      title: '设备型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '所在科室',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '上次校准',
      dataIndex: 'lastCalibration',
      key: 'lastCalibration',
      render: (date?: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '下次校准',
      dataIndex: 'nextCalibration',
      key: 'nextCalibration',
      render: (_: unknown, record: Device) => {
        const date = record.nextCalibration;
        if (!date) return '-';
        const overdue = isOverdue(date);
        const dueSoon = isDueSoon(date);
        const diff = dayjs(date).diff(dayjs(), 'day');
        return (
          <div>
            <span className={overdue ? 'text-error font-medium' : dueSoon ? 'text-warning font-medium' : ''}>
              {dayjs(date).format('YYYY-MM-DD')}
            </span>
            <div className="text-xs text-text-tertiary mt-1">
              {overdue
                ? `已逾期 ${Math.abs(diff)} 天`
                : dueSoon
                ? `还有 ${diff} 天`
                : `还有 ${diff} 天`}
            </div>
          </div>
        );
      },
    },
    {
      title: '校准记录',
      key: 'records',
      render: (_: unknown, record: Device) => {
        const records = calibrationRecords.filter((r) => r.deviceId === record.id);
        return (
          <Button type="link" onClick={() => setActiveTab('records')}>
            {records.length} 条
          </Button>
        );
      },
    },
    {
      title: '锁定状态',
      key: 'locked',
      render: (_: unknown, record: Device) => {
        const locked = isLocked(record);
        return (
          <Switch
            checked={locked}
            checkedChildren={<LockOutlined />}
            unCheckedChildren={<UnlockOutlined />}
            onChange={(checked) => handleLockDevice(record.id, checked)}
            disabled={record.nextCalibration ? !isOverdue(record.nextCalibration) : true}
          />
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Device) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            设备详情
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAddRecord(record)}
          >
            新增校准
          </Button>
        </Space>
      ),
    },
  ];

  const recordColumns = [
    {
      title: '校准日期',
      dataIndex: 'calibrationDate',
      key: 'calibrationDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
    },
    {
      title: '校准类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => typeLabels[type],
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
      render: (text: string) => <code className="bg-bg-secondary px-2 py-1 rounded">{text}</code>,
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => (
        <Tag color={resultColors[result]}>{resultLabels[result]}</Tag>
      ),
    },
    {
      title: '下次校准',
      dataIndex: 'nextCalibrationDate',
      key: 'nextCalibrationDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '费用(元)',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => `¥${cost.toLocaleString()}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: CalibrationRecord) => (
        <Space>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {!record.certificateUrl && (
            <Button
              type="link"
              icon={<UploadOutlined />}
              onClick={() => handleUploadReport(record)}
            >
              上传证书
            </Button>
          )}
          {record.certificateUrl && (
            <Button
              type="link"
              icon={<FileTextOutlined />}
              onClick={() => message.info('查看证书')}
            >
              查看证书
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const deviceTabItems = [
    {
      key: 'devices',
      label: (
        <span>
          <SafetyOutlined /> 需要校准的设备
          <Badge count={devicesNeedCalibration.length} className="ml-2" />
        </span>
      ),
      children: (
        <div>
          {lockedDevices.length > 0 && (
            <Alert
              message={`有 ${lockedDevices.length} 台设备因超期未校准已被锁定，请尽快安排校准`}
              type="error"
              showIcon
              className="mb-4"
              icon={<LockOutlined />}
            />
          )}
          {dueSoonDevices.length > 0 && lockedDevices.length === 0 && (
            <Alert
              message={`有 ${dueSoonDevices.length} 台设备将在30天内到期，请提前安排校准`}
              type="warning"
              showIcon
              className="mb-4"
            />
          )}
          <Table
            columns={deviceColumns}
            dataSource={devicesNeedCalibration}
            rowKey="id"
            pagination={{ pageSize: 8 }}
            rowClassName={(record) => {
              if (isLocked(record)) return 'bg-error-light';
              if (record.nextCalibration && isDueSoon(record.nextCalibration)) return 'bg-warning-light';
              return '';
            }}
          />
        </div>
      ),
    },
    {
      key: 'records',
      label: (
        <span>
          <FileTextOutlined /> 校准记录
        </span>
      ),
      children: (
        <Table
          columns={recordColumns}
          dataSource={calibrationRecords}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">计量校准管理</h1>
        <p className="text-text-secondary">
          管理设备校准计划、记录校准结果、上传校准证书
        </p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="需要校准设备"
              value={devicesNeedCalibration.length}
              prefix={<SafetyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="30天内到期"
              value={dueSoonDevices.length}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已锁定设备"
              value={lockedDevices.length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本年校准次数"
              value={calibratedThisYear}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Alert
            message="设备超期未校准将自动锁定，无法使用。校准合格后自动解锁并更新有效期。"
            type="info"
            showIcon
            className="flex-1 mr-4"
          />
          <Tooltip title="锁定超期设备">
            <Switch
              checkedChildren="自动锁定已开启"
              unCheckedChildren="自动锁定已关闭"
              defaultChecked
            />
          </Tooltip>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-error rounded-full"></div>
              <span className="text-sm text-text-secondary">超期锁定</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <span className="text-sm text-text-secondary">30天内到期</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-sm text-text-secondary">正常</span>
            </div>
          </div>
        </div>
      </Card>

      <Card
        tabList={deviceTabItems}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as 'devices' | 'records')}
      />

      <Modal
        title={
          <div className="flex items-center gap-2">
            <PlusOutlined className="text-primary" />
            新增校准记录
          </div>
        }
        open={recordModalVisible}
        width={700}
        onOk={handleSubmitRecord}
        onCancel={() => {
          setRecordModalVisible(false);
          setSelectedDevice(null);
        }}
        okText="提交校准"
      >
        {selectedDevice && (
          <div>
            <Card size="small" className="mb-4 bg-primary-light">
              <Row gutter={16}>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">设备名称</div>
                  <div className="font-medium">{selectedDevice.name}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">设备型号</div>
                  <div>{selectedDevice.model}</div>
                </Col>
              </Row>
              <Row gutter={16} className="mt-2">
                <Col span={12}>
                  <div className="text-text-secondary text-sm">所在科室</div>
                  <div>{selectedDevice.department}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">上次校准</div>
                  <div>{selectedDevice.lastCalibration ? dayjs(selectedDevice.lastCalibration).format('YYYY-MM-DD') : '-'}</div>
                </Col>
              </Row>
            </Card>

            {isLocked(selectedDevice) && (
              <Alert
                message="该设备因超期未校准已被锁定，校准合格后将自动解锁"
                type="warning"
                showIcon
                className="mb-4"
              />
            )}

            <div className="mb-4">
              <div className="font-medium mb-2">扫码确认设备</div>
              <div className="border-2 border-dashed border-primary rounded-lg p-4 text-center">
                <ScanOutlined className="text-3xl text-primary mb-2" />
                <p className="text-text-secondary text-sm">请扫描设备二维码确认校准设备</p>
                <Button type="primary" icon={<ScanOutlined />} size="small" className="mt-2">
                  模拟扫码
                </Button>
              </div>
            </div>

            <Form form={calibrationForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="type"
                    label="校准类型"
                    rules={[{ required: true, message: '请选择校准类型' }]}
                  >
                    <Select>
                      <Option value="internal">内部校准</Option>
                      <Option value="external">外部校准</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="calibrationDate"
                    label="校准日期"
                    rules={[{ required: true, message: '请选择校准日期' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="calibrationAgency"
                    label="校准机构"
                    rules={[{ required: true, message: '请输入校准机构' }]}
                  >
                    <Input placeholder="请输入校准机构名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="calibrationPerson"
                    label="校准人员"
                    rules={[{ required: true, message: '请输入校准人员' }]}
                  >
                    <Input placeholder="请输入校准人员姓名" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="certificateNumber"
                    label="证书编号"
                    rules={[{ required: true, message: '请输入证书编号' }]}
                  >
                    <Input placeholder="请输入校准证书编号" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="nextCalibrationDate"
                    label="下次校准日期"
                    rules={[{ required: true, message: '请选择下次校准日期' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="result"
                    label="校准结果"
                    rules={[{ required: true, message: '请选择校准结果' }]}
                  >
                    <Select>
                      <Option value="pass">
                        <Tag color="success">合格</Tag>
                      </Option>
                      <Option value="conditional">
                        <Tag color="warning">有条件合格</Tag>
                      </Option>
                      <Option value="fail">
                        <Tag color="error">不合格</Tag>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="cost"
                    label="校准费用(元)"
                    rules={[{ required: true, message: '请输入校准费用' }]}
                  >
                    <Input type="number" placeholder="请输入校准费用" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="deviation"
                label="偏差说明"
              >
                <TextArea rows={2} placeholder="如有偏差请详细说明" />
              </Form.Item>

              <Form.Item
                name="remarks"
                label="备注"
              >
                <TextArea rows={2} placeholder="其他需要说明的情况" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <UploadOutlined className="text-primary" />
            上传校准证书
          </div>
        }
        open={uploadModalVisible}
        onOk={handleSubmitReport}
        onCancel={() => {
          setUploadModalVisible(false);
          setSelectedRecord(null);
          setFileList([]);
        }}
        okText="确认上传"
      >
        {selectedRecord && (
          <div>
            <Card size="small" className="mb-4 bg-primary-light">
              <Row gutter={16}>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">设备名称</div>
                  <div className="font-medium">{selectedRecord.deviceName}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">证书编号</div>
                  <div>
                    <code className="bg-bg-secondary px-2 py-1 rounded">
                      {selectedRecord.certificateNumber}
                    </code>
                  </div>
                </Col>
              </Row>
              <Row gutter={16} className="mt-2">
                <Col span={12}>
                  <div className="text-text-secondary text-sm">校准日期</div>
                  <div>{dayjs(selectedRecord.calibrationDate).format('YYYY-MM-DD')}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">校准结果</div>
                  <div>
                    <Tag color={resultColors[selectedRecord.result]}>
                      {resultLabels[selectedRecord.result]}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>

            <Form layout="vertical">
              <Form.Item label="上传校准证书(PDF/JPG/PNG)">
                <Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽上传校准证书</p>
                  <p className="ant-upload-hint">支持 PDF、JPG、PNG 格式</p>
                </Dragger>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title="校准记录详情"
        open={detailModalVisible}
        footer={
          <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
        }
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedRecord(null);
        }}
        width={600}
      >
        {selectedRecord && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="设备名称">{selectedRecord.deviceName}</Descriptions.Item>
            <Descriptions.Item label="校准类型">{typeLabels[selectedRecord.type]}</Descriptions.Item>
            <Descriptions.Item label="校准日期">
              {dayjs(selectedRecord.calibrationDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="校准机构">{selectedRecord.calibrationAgency}</Descriptions.Item>
            <Descriptions.Item label="校准人员">{selectedRecord.calibrationPerson}</Descriptions.Item>
            <Descriptions.Item label="证书编号">
              <code className="bg-bg-secondary px-2 py-1 rounded">
                {selectedRecord.certificateNumber}
              </code>
            </Descriptions.Item>
            <Descriptions.Item label="校准结果">
              <Tag color={resultColors[selectedRecord.result]}>
                {resultLabels[selectedRecord.result]}
              </Tag>
            </Descriptions.Item>
            {selectedRecord.deviation && (
              <Descriptions.Item label="偏差说明">{selectedRecord.deviation}</Descriptions.Item>
            )}
            <Descriptions.Item label="下次校准日期">
              {dayjs(selectedRecord.nextCalibrationDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="校准费用">¥{selectedRecord.cost.toLocaleString()}</Descriptions.Item>
            {selectedRecord.remarks && (
              <Descriptions.Item label="备注">{selectedRecord.remarks}</Descriptions.Item>
            )}
            {selectedRecord.certificateUrl && (
              <Descriptions.Item label="校准证书">
                <Button type="link" icon={<FileTextOutlined />}>
                  查看证书
                </Button>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <style>{`
        .bg-error-light {
          background-color: #fff2f0 !important;
        }
        .bg-warning-light {
          background-color: #fffbe6 !important;
        }
      `}</style>
    </div>
  );
}
