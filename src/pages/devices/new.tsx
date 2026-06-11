import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Switch,
  Button,
  message,
  Typography,
  Descriptions,
  Modal,
  Space,
  Divider,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  QrcodeOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Device } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

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

const inspectionPlanConfig: Record<string, { frequency: string; type: string; checkItems: string[] }> = {
  '影像设备': {
    frequency: 'monthly',
    type: 'safety',
    checkItems: ['设备外观检查', '电源线检查', '接地检查', '开机测试', '辐射防护检查', '警示标识检查'],
  },
  '超声设备': {
    frequency: 'quarterly',
    type: 'routine',
    checkItems: ['设备外观检查', '探头检查', '图像质量检查', '打印功能检查', '清洁消毒'],
  },
  '检验设备': {
    frequency: 'monthly',
    type: 'special',
    checkItems: ['仪器性能验证', '环境温湿度检查', '管路清洗', '探针检查', '质量控制测试'],
  },
  '手术室设备': {
    frequency: 'weekly',
    type: 'routine',
    checkItems: ['设备外观检查', '电源线检查', '接地检查', '开机测试', '报警功能测试', '消毒情况检查'],
  },
  '生命支持设备': {
    frequency: 'daily',
    type: 'routine',
    checkItems: ['呼吸机检查', '监护仪检查', '备用设备检查', '电池容量检查', '报警功能测试'],
  },
  '监护设备': {
    frequency: 'quarterly',
    type: 'special',
    checkItems: ['心电波形质量检查', '无创血压校准', '血氧饱和度校准', '有创压力校准', '报警功能测试'],
  },
  '急救设备': {
    frequency: 'weekly',
    type: 'safety',
    checkItems: ['设备外观检查', '电池容量检查', '除颤能量测试', '心电监护功能检查', '起搏功能检查'],
  },
  '内窥镜设备': {
    frequency: 'monthly',
    type: 'routine',
    checkItems: ['插入管检查', '镜头清洁', '图像质量检查', '弯曲部检查', '消毒灭菌检查'],
  },
  '新生儿设备': {
    frequency: 'monthly',
    type: 'special',
    checkItems: ['温度控制精度检查', '湿度控制检查', '皮肤温度传感器检查', '氧浓度监测检查', '报警功能测试'],
  },
  '透析设备': {
    frequency: 'monthly',
    type: 'special',
    checkItems: ['电导度校准', '温度校准', '流量检查', '漏血检测', '消毒功能检查'],
  },
  '理疗设备': {
    frequency: 'quarterly',
    type: 'safety',
    checkItems: ['压力容器检查', '消防系统检查', '氧浓度监测', '电气安全检查', '报警功能测试'],
  },
};

const frequencyNameMap: Record<string, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
};

export default function DeviceNew() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addDevice, loading, generateQRCode } = useDeviceStore();
  const [form] = Form.useForm();
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<Device | null>(null);
  const [tempSerial, setTempSerial] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const serial = form.getFieldValue('serialNumber');
      if (serial) {
        setTempSerial(serial);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [form]);

  const previewQrContent = useMemo(() => {
    const name = form.getFieldValue('name') || '新设备';
    const model = form.getFieldValue('model') || '';
    const serial = tempSerial || '';
    if (!name && !serial) return '';
    return `DEVICE:NEW|${name}|${model}|${serial}`;
  }, [tempSerial]);

  const autoInspectionPlan = useMemo(() => {
    const type = form.getFieldValue('type');
    if (!type || !inspectionPlanConfig[type]) return null;
    return inspectionPlanConfig[type];
  }, [form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const warrantyStart = values.warrantyRange?.[0]?.format('YYYY-MM-DD');
      const warrantyEnd = values.warrantyRange?.[1]?.format('YYYY-MM-DD');

      const deviceData: Omit<Device, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        model: values.model,
        manufacturer: values.manufacturer,
        serialNumber: values.serialNumber,
        type: values.type,
        department: values.department,
        location: values.location,
        status: 'normal',
        purchaseDate: values.purchaseDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        warrantyExpire: warrantyEnd || '',
        purchasePrice: values.purchasePrice,
        currentValue: values.purchasePrice,
        qrCode: `QR-${values.serialNumber}`,
        description: values.description,
        nextMaintenance: autoInspectionPlan
          ? dayjs()
              .add(
                autoInspectionPlan.frequency === 'weekly'
                  ? 7
                  : autoInspectionPlan.frequency === 'quarterly'
                  ? 90
                  : autoInspectionPlan.frequency === 'daily'
                  ? 1
                  : 30,
                'day'
              )
              .format('YYYY-MM-DD')
          : undefined,
      };

      const newDevice = await addDevice(deviceData);

      if (newDevice) {
        generateQRCode(newDevice.id);
        setCreatedDevice(newDevice);
        setSuccessModalVisible(true);
        message.success('设备入库成功！');
      } else {
        message.error('设备入库失败，请重试');
      }
    } catch {
      message.error('请填写完整信息');
    }
  };

  const qrContent = createdDevice ? generateQRCode(createdDevice.id) : '';

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
              设备入库
            </Title>
            <Text type="secondary">录入新设备信息，系统将自动生成二维码和巡检计划</Text>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="设备基本信息">
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="name"
                    label="设备名称"
                    rules={[{ required: true, message: '请输入设备名称' }]}
                  >
                    <Input placeholder="请输入设备名称" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="model"
                    label="设备型号"
                    rules={[{ required: true, message: '请输入设备型号' }]}
                  >
                    <Input placeholder="请输入设备型号" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="manufacturer"
                    label="品牌/制造商"
                    rules={[{ required: true, message: '请输入品牌' }]}
                  >
                    <Input placeholder="请输入品牌/制造商" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="serialNumber"
                    label="序列号"
                    rules={[{ required: true, message: '请输入序列号' }]}
                  >
                    <Input placeholder="请输入设备序列号" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="type"
                    label="设备类型"
                    rules={[{ required: true, message: '请选择设备类型' }]}
                  >
                    <Select placeholder="请选择设备类型">
                      {deviceTypes.map((type) => (
                        <Option key={type} value={type}>
                          {type}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="department"
                    label="所属科室"
                    rules={[{ required: true, message: '请选择所属科室' }]}
                  >
                    <Select placeholder="请选择所属科室">
                      {departments.map((dept) => (
                        <Option key={dept} value={dept}>
                          {dept}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={24}>
                  <Form.Item
                    name="location"
                    label="放置位置"
                    rules={[{ required: true, message: '请输入放置位置' }]}
                  >
                    <Input placeholder="如：医技楼1层-MRI室1" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="purchaseDate"
                    label="采购日期"
                    rules={[{ required: true, message: '请选择采购日期' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="purchasePrice"
                    label="采购价格（元）"
                    rules={[{ required: true, message: '请输入采购价格' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      precision={2}
                      placeholder="请输入采购价格"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="warrantyRange"
                    label="保修期"
                    rules={[{ required: true, message: '请选择保修期' }]}
                  >
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="expectedYears"
                    label="预计使用年限（年）"
                    rules={[{ required: true, message: '请输入预计使用年限' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={30}
                      placeholder="请输入预计使用年限"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={24}>
                  <Form.Item
                    name="needCalibration"
                    label="是否需要计量校准"
                    valuePropName="checked"
                    initialValue={false}
                  >
                    <Switch checkedChildren="是" unCheckedChildren="否" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={24}>
                  <Form.Item name="description" label="设备描述">
                    <Input.TextArea rows={3} placeholder="请输入设备描述（选填）" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Divider />

            <div className="flex justify-end">
              <Space>
                <Button onClick={() => navigate('/devices')}>取消</Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSubmit}
                  loading={loading}
                >
                  提交入库
                </Button>
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="二维码预览" className="sticky top-6">
            <Alert
              message="实时预览"
              description="二维码将根据填写的设备信息实时更新，入库后生成正式二维码"
              type="info"
              showIcon
              className="mb-4"
            />
            <div className="text-center">
              {previewQrContent ? (
                <div className="inline-block p-4 bg-white border rounded-lg">
                  <QRCodeSVG
                    value={previewQrContent}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
              ) : (
                <div className="w-52 h-52 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <Text type="secondary">
                    <QrcodeOutlined className="text-4xl block mb-2" />
                    填写设备信息后预览
                  </Text>
                </div>
              )}
              <div className="mt-4 text-sm">
                {form.getFieldValue('name') && (
                  <div>
                    <Text strong>设备名称：</Text>
                    <Text>{form.getFieldValue('name')}</Text>
                  </div>
                )}
                {form.getFieldValue('serialNumber') && (
                  <div>
                    <Text strong>序列号：</Text>
                    <Text>{form.getFieldValue('serialNumber')}</Text>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {autoInspectionPlan && (
            <Card title="自动生成巡检计划" className="mt-4">
              <Alert
                message="智能生成"
                description="系统将根据设备类型自动生成巡检计划"
                type="success"
                showIcon
                icon={<InfoCircleOutlined />}
                className="mb-4"
              />
              <Descriptions column={1} size="small">
                <Descriptions.Item label="巡检类型">
                  {autoInspectionPlan.type === 'safety'
                    ? '安全巡检'
                    : autoInspectionPlan.type === 'special'
                    ? '专项巡检'
                    : '例行巡检'}
                </Descriptions.Item>
                <Descriptions.Item label="巡检频率">
                  {frequencyNameMap[autoInspectionPlan.frequency]}
                </Descriptions.Item>
                <Descriptions.Item label="检查项目">
                  <Space direction="vertical" size={1}>
                    {autoInspectionPlan.checkItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircleOutlined className="text-green-500" />
                        <Text>{item}</Text>
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="设备入库成功"
        open={successModalVisible}
        width={500}
        footer={[
          <Button key="list" onClick={() => navigate('/devices')}>
            返回设备列表
          </Button>,
          <Button
            key="detail"
            type="primary"
            onClick={() => createdDevice && navigate(`/devices/${createdDevice.id}`)}
          >
            查看设备详情
          </Button>,
        ]}
        onCancel={() => setSuccessModalVisible(false)}
      >
        {createdDevice && (
          <div className="text-center">
            <div className="mb-4">
              <CheckCircleOutlined className="text-5xl text-green-500" />
            </div>
            <Title level={4}>{createdDevice.name}</Title>
            <Text type="secondary" className="block mb-4">
              {createdDevice.model} - {createdDevice.serialNumber}
            </Text>
            <div className="p-4 bg-gray-50 rounded-lg inline-block">
              <QRCodeSVG value={qrContent} size={180} level="H" includeMargin />
              <div className="mt-2 text-xs text-gray-500">设备二维码</div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded text-left">
              <Text strong className="text-blue-600">
                <InfoCircleOutlined className="mr-1" />
                系统已自动完成：
              </Text>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                <li>生成设备唯一标识二维码</li>
                {autoInspectionPlan && (
                  <li>
                    创建{frequencyNameMap[autoInspectionPlan.frequency]}巡检计划
                  </li>
                )}
                <li>设备状态已设为正常可用</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
