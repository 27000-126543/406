import { useState, useMemo } from 'react';
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
  Tabs,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  WarningOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';

const { Title } = Typography;

interface DeviceType {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  sort: number;
}

interface FaultCode {
  id: string;
  code: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  solution?: string;
}

interface PartItem {
  id: string;
  name: string;
  model: string;
  category: string;
  unit: string;
  unitPrice: number;
  stock: number;
  minStock: number;
  status: 'normal' | 'low_stock' | 'out_of_stock';
}

interface InspectionCycle {
  id: string;
  name: string;
  cycle: number;
  cycleUnit: 'day' | 'week' | 'month' | 'quarter' | 'year';
  deviceType: string;
  description?: string;
  status: 'active' | 'inactive';
}

const mockDeviceTypes: DeviceType[] = [
  { id: '1', name: '影像设备', code: 'IMAGE', description: '包括CT、MRI、X光等影像类设备', status: 'active', sort: 1 },
  { id: '2', name: '检验设备', code: 'LAB', description: '包括生化分析仪、血细胞分析仪等', status: 'active', sort: 2 },
  { id: '3', name: '超声设备', code: 'US', description: '包括B超、彩超等超声设备', status: 'active', sort: 3 },
  { id: '4', name: '生命支持设备', code: 'LIFE_SUPPORT', description: '包括呼吸机、麻醉机等', status: 'active', sort: 4 },
  { id: '5', name: '监护设备', code: 'MONITOR', description: '包括心电监护仪、胎心监护仪等', status: 'active', sort: 5 },
  { id: '6', name: '急救设备', code: 'EMERGENCY', description: '包括除颤仪、急救车等', status: 'active', sort: 6 },
];

const mockFaultCodes: FaultCode[] = [
  { id: '1', code: 'E-001', name: '电源故障', type: '电气故障', severity: 'high', description: '设备无法正常开机', solution: '检查电源连接，更换保险丝' },
  { id: '2', code: 'E-002', name: '传感器故障', type: '硬件故障', severity: 'medium', description: '传感器信号异常', solution: '清洁传感器，检查连接线' },
  { id: '3', code: 'E-003', name: '通信故障', type: '系统故障', severity: 'medium', description: '设备与系统通信中断', solution: '检查网络连接，重启设备' },
  { id: '4', code: 'E-004', name: '温度过高', type: '环境故障', severity: 'urgent', description: '设备内部温度超出正常范围', solution: '检查散热系统，清理灰尘' },
  { id: '5', code: 'E-005', name: '校准过期', type: '维护提醒', severity: 'low', description: '设备校准已过期', solution: '安排校准计划' },
];

const mockParts: PartItem[] = [
  { id: '1', name: 'X光球管', model: 'XRT-2000', category: '影像配件', unit: '个', unitPrice: 25000, stock: 2, minStock: 1, status: 'normal' },
  { id: '2', name: 'CT探测器', model: 'CTD-128', category: '影像配件', unit: '个', unitPrice: 120000, stock: 1, minStock: 1, status: 'normal' },
  { id: '3', name: '流量传感器', model: 'FS-100', category: '传感器', unit: '个', unitPrice: 800, stock: 5, minStock: 3, status: 'normal' },
  { id: '4', name: '氧电池', model: 'O2-500', category: '传感器', unit: '个', unitPrice: 1200, stock: 3, minStock: 2, status: 'normal' },
  { id: '5', name: '过滤棉（呼吸机）', model: 'FM-V', category: '消耗品', unit: '包', unitPrice: 50, stock: 20, minStock: 10, status: 'normal' },
  { id: '6', name: '生化仪探针', model: 'BP-200', category: '检验配件', unit: '个', unitPrice: 3500, stock: 0, minStock: 2, status: 'out_of_stock' },
];

const mockInspectionCycles: InspectionCycle[] = [
  { id: '1', name: '日常巡检', cycle: 1, cycleUnit: 'day', deviceType: '生命支持设备', description: '每日例行检查', status: 'active' },
  { id: '2', name: '周度检查', cycle: 1, cycleUnit: 'week', deviceType: '影像设备', description: '每周定期检查', status: 'active' },
  { id: '3', name: '月度保养', cycle: 1, cycleUnit: 'month', deviceType: '检验设备', description: '每月保养维护', status: 'active' },
  { id: '4', name: '季度校准', cycle: 1, cycleUnit: 'quarter', deviceType: '监护设备', description: '每季度校准', status: 'active' },
  { id: '5', name: '年度大修', cycle: 1, cycleUnit: 'year', deviceType: '影像设备', description: '每年全面检修', status: 'active' },
];

const severityColorMap: Record<string, string> = {
  low: 'blue',
  medium: 'orange',
  high: 'red',
  urgent: 'magenta',
};

const severityNameMap: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

const stockStatusColorMap: Record<string, string> = {
  normal: 'success',
  low_stock: 'warning',
  out_of_stock: 'error',
};

const stockStatusNameMap: Record<string, string> = {
  normal: '正常',
  low_stock: '库存低',
  out_of_stock: '缺货',
};

const cycleUnitNameMap: Record<string, string> = {
  day: '天',
  week: '周',
  month: '月',
  quarter: '季度',
  year: '年',
};

export default function SystemConfig() {
  const [activeTab, setActiveTab] = useState('device-type');
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>(mockDeviceTypes);
  const [faultCodes, setFaultCodes] = useState<FaultCode[]>(mockFaultCodes);
  const [parts, setParts] = useState<PartItem[]>(mockParts);
  const [inspectionCycles, setInspectionCycles] = useState<InspectionCycle[]>(mockInspectionCycles);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DeviceType | FaultCode | PartItem | InspectionCycle | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [form] = Form.useForm();

  const [keyword, setKeyword] = useState('');

  const tabItems: TabsProps['items'] = [
    {
      key: 'device-type',
      label: (
        <span>
          <AppstoreOutlined /> 设备类型
        </span>
      ),
    },
    {
      key: 'fault-code',
      label: (
        <span>
          <WarningOutlined /> 故障代码
        </span>
      ),
    },
    {
      key: 'parts',
      label: (
        <span>
          <InboxOutlined /> 配件库
        </span>
      ),
    },
    {
      key: 'inspection-cycle',
      label: (
        <span>
          <ClockCircleOutlined /> 巡检周期
        </span>
      ),
    },
  ];

  const filteredDeviceTypes = useMemo(() => {
    if (!keyword) return deviceTypes;
    const kw = keyword.toLowerCase();
    return deviceTypes.filter(
      (item) =>
        item.name.toLowerCase().includes(kw) ||
        item.code.toLowerCase().includes(kw)
    );
  }, [deviceTypes, keyword]);

  const filteredFaultCodes = useMemo(() => {
    if (!keyword) return faultCodes;
    const kw = keyword.toLowerCase();
    return faultCodes.filter(
      (item) =>
        item.code.toLowerCase().includes(kw) ||
        item.name.toLowerCase().includes(kw)
    );
  }, [faultCodes, keyword]);

  const filteredParts = useMemo(() => {
    if (!keyword) return parts;
    const kw = keyword.toLowerCase();
    return parts.filter(
      (item) =>
        item.name.toLowerCase().includes(kw) ||
        item.model.toLowerCase().includes(kw)
    );
  }, [parts, keyword]);

  const filteredInspectionCycles = useMemo(() => {
    if (!keyword) return inspectionCycles;
    const kw = keyword.toLowerCase();
    return inspectionCycles.filter(
      (item) =>
        item.name.toLowerCase().includes(kw) ||
        item.deviceType.toLowerCase().includes(kw)
    );
  }, [inspectionCycles, keyword]);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalTitle(
      activeTab === 'device-type'
        ? '新增设备类型'
        : activeTab === 'fault-code'
        ? '新增故障代码'
        : activeTab === 'parts'
        ? '新增配件'
        : '新增巡检周期'
    );
    setModalVisible(true);
  };

  const handleEdit = (item: DeviceType | FaultCode | PartItem | InspectionCycle) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalTitle(
      activeTab === 'device-type'
        ? '编辑设备类型'
        : activeTab === 'fault-code'
        ? '编辑故障代码'
        : activeTab === 'parts'
        ? '编辑配件'
        : '编辑巡检周期'
    );
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    if (activeTab === 'device-type') {
      setDeviceTypes(deviceTypes.filter((item) => item.id !== id));
    } else if (activeTab === 'fault-code') {
      setFaultCodes(faultCodes.filter((item) => item.id !== id));
    } else if (activeTab === 'parts') {
      setParts(parts.filter((item) => item.id !== id));
    } else if (activeTab === 'inspection-cycle') {
      setInspectionCycles(inspectionCycles.filter((item) => item.id !== id));
    }
    message.success('删除成功');
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        if (activeTab === 'device-type') {
          setDeviceTypes(
            deviceTypes.map((item) =>
              item.id === editingItem.id ? { ...item, ...values } : item
            )
          );
        } else if (activeTab === 'fault-code') {
          setFaultCodes(
            faultCodes.map((item) =>
              item.id === editingItem.id ? { ...item, ...values } : item
            )
          );
        } else if (activeTab === 'parts') {
          const newStatus =
            values.stock === 0
              ? 'out_of_stock'
              : values.stock < values.minStock
              ? 'low_stock'
              : 'normal';
          setParts(
            parts.map((item) =>
              item.id === editingItem.id
                ? { ...item, ...values, status: newStatus }
                : item
            )
          );
        } else if (activeTab === 'inspection-cycle') {
          setInspectionCycles(
            inspectionCycles.map((item) =>
              item.id === editingItem.id ? { ...item, ...values } : item
            )
          );
        }
        message.success('更新成功');
      } else {
        const newItem = {
          ...values,
          id: Date.now().toString(),
        };
        if (activeTab === 'device-type') {
          setDeviceTypes([...deviceTypes, { ...newItem, status: 'active' }]);
        } else if (activeTab === 'fault-code') {
          setFaultCodes([...faultCodes, newItem]);
        } else if (activeTab === 'parts') {
          const status =
            values.stock === 0
              ? 'out_of_stock'
              : values.stock < values.minStock
              ? 'low_stock'
              : 'normal';
          setParts([...parts, { ...newItem, status }]);
        } else if (activeTab === 'inspection-cycle') {
          setInspectionCycles([...inspectionCycles, { ...newItem, status: 'active' }]);
        }
        message.success('新增成功');
      }
      setModalVisible(false);
    } catch {
      // 验证失败
    }
  };

  const deviceTypeColumns: ColumnsType<DeviceType> = [
    {
      title: '类型名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '类型编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该设备类型？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const faultCodeColumns: ColumnsType<FaultCode> = [
    {
      title: '故障代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (text) => <Tag color="red">{text}</Tag>,
    },
    {
      title: '故障名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '故障类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={severityColorMap[severity]}>{severityNameMap[severity]}</Tag>
      ),
    },
    {
      title: '故障描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '解决方案',
      dataIndex: 'solution',
      key: 'solution',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该故障代码？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const partsColumns: ColumnsType<PartItem> = [
    {
      title: '配件名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 120,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (price) => `¥${price.toLocaleString()}`,
    },
    {
      title: '库存数量',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
    },
    {
      title: '最低库存',
      dataIndex: 'minStock',
      key: 'minStock',
      width: 100,
    },
    {
      title: '库存状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={stockStatusColorMap[status]}>{stockStatusNameMap[status]}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该配件？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const inspectionCycleColumns: ColumnsType<InspectionCycle> = [
    {
      title: '周期名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '周期时长',
      dataIndex: 'cycle',
      key: 'cycle',
      width: 120,
      render: (_, record) => (
        <span>
          {record.cycle} {cycleUnitNameMap[record.cycleUnit]}
        </span>
      ),
    },
    {
      title: '适用设备类型',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该巡检周期？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderFormFields = () => {
    if (activeTab === 'device-type') {
      return (
        <>
          <Form.Item
            name="name"
            label="类型名称"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input placeholder="请输入类型名称" />
          </Form.Item>
          <Form.Item
            name="code"
            label="类型编码"
            rules={[{ required: true, message: '请输入类型编码' }]}
          >
            <Input placeholder="请输入类型编码" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </>
      );
    } else if (activeTab === 'fault-code') {
      return (
        <>
          <Form.Item
            name="code"
            label="故障代码"
            rules={[{ required: true, message: '请输入故障代码' }]}
          >
            <Input placeholder="请输入故障代码" />
          </Form.Item>
          <Form.Item
            name="name"
            label="故障名称"
            rules={[{ required: true, message: '请输入故障名称' }]}
          >
            <Input placeholder="请输入故障名称" />
          </Form.Item>
          <Form.Item
            name="type"
            label="故障类型"
            rules={[{ required: true, message: '请选择故障类型' }]}
          >
            <Select
              placeholder="请选择故障类型"
              options={[
                { value: '电气故障', label: '电气故障' },
                { value: '硬件故障', label: '硬件故障' },
                { value: '系统故障', label: '系统故障' },
                { value: '环境故障', label: '环境故障' },
                { value: '维护提醒', label: '维护提醒' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="severity"
            label="严重程度"
            rules={[{ required: true, message: '请选择严重程度' }]}
          >
            <Select
              placeholder="请选择严重程度"
              options={[
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' },
                { value: 'urgent', label: '紧急' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="故障描述">
            <Input.TextArea placeholder="请输入故障描述" rows={3} />
          </Form.Item>
          <Form.Item name="solution" label="解决方案">
            <Input.TextArea placeholder="请输入解决方案" rows={3} />
          </Form.Item>
        </>
      );
    } else if (activeTab === 'parts') {
      return (
        <>
          <Form.Item
            name="name"
            label="配件名称"
            rules={[{ required: true, message: '请输入配件名称' }]}
          >
            <Input placeholder="请输入配件名称" />
          </Form.Item>
          <Form.Item
            name="model"
            label="型号"
            rules={[{ required: true, message: '请输入型号' }]}
          >
            <Input placeholder="请输入型号" />
          </Form.Item>
          <Form.Item
            name="category"
            label="类别"
            rules={[{ required: true, message: '请选择类别' }]}
          >
            <Select
              placeholder="请选择类别"
              options={[
                { value: '影像配件', label: '影像配件' },
                { value: '检验配件', label: '检验配件' },
                { value: '传感器', label: '传感器' },
                { value: '消耗品', label: '消耗品' },
                { value: '其他', label: '其他' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="unit"
            label="单位"
            rules={[{ required: true, message: '请输入单位' }]}
          >
            <Input placeholder="请输入单位" />
          </Form.Item>
          <Form.Item
            name="unitPrice"
            label="单价"
            rules={[{ required: true, message: '请输入单价' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} prefix="¥" />
          </Form.Item>
          <Form.Item
            name="stock"
            label="库存数量"
            rules={[{ required: true, message: '请输入库存数量' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item
            name="minStock"
            label="最低库存"
            rules={[{ required: true, message: '请输入最低库存' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </>
      );
    } else if (activeTab === 'inspection-cycle') {
      return (
        <>
          <Form.Item
            name="name"
            label="周期名称"
            rules={[{ required: true, message: '请输入周期名称' }]}
          >
            <Input placeholder="请输入周期名称" />
          </Form.Item>
          <Form.Item
            name="cycle"
            label="周期时长"
            rules={[{ required: true, message: '请输入周期时长' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item
            name="cycleUnit"
            label="周期单位"
            rules={[{ required: true, message: '请选择周期单位' }]}
          >
            <Select
              placeholder="请选择周期单位"
              options={[
                { value: 'day', label: '天' },
                { value: 'week', label: '周' },
                { value: 'month', label: '月' },
                { value: 'quarter', label: '季度' },
                { value: 'year', label: '年' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="deviceType"
            label="适用设备类型"
            rules={[{ required: true, message: '请选择适用设备类型' }]}
          >
            <Select
              placeholder="请选择适用设备类型"
              options={deviceTypes.map((d) => ({ value: d.name, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
        </>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            基础配置
          </Title>
          <p className="text-gray-500 mt-1">管理系统基础数据配置</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增
        </Button>
      </div>

      <Card>
        <div className="mb-4" style={{ maxWidth: 300 }}>
          <Input
            placeholder="搜索..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
          />
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />

        {activeTab === 'device-type' && (
          <Table<DeviceType>
            columns={deviceTypeColumns}
            dataSource={filteredDeviceTypes}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
          />
        )}
        {activeTab === 'fault-code' && (
          <Table<FaultCode>
            columns={faultCodeColumns}
            dataSource={filteredFaultCodes}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
          />
        )}
        {activeTab === 'parts' && (
          <Table<PartItem>
            columns={partsColumns}
            dataSource={filteredParts}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
          />
        )}
        {activeTab === 'inspection-cycle' && (
          <Table<InspectionCycle>
            columns={inspectionCycleColumns}
            dataSource={filteredInspectionCycles}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          {renderFormFields()}
        </Form>
      </Modal>
    </div>
  );
}
