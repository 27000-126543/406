import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Steps,
  Descriptions,
  Tag,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  List,
  Image,
  Upload,
  message,
  Spin,
  Empty,
  Divider,
  Avatar,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  UserSwitchOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CameraOutlined,
  PlusOutlined,
  ToolOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { repairRecordService } from '@/services/mock';
import type { WorkOrder, RepairRecord, WorkOrderPart } from '@/types';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

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

const faultCodeMap: Record<string, string> = {
  F001: 'F001-机械故障',
  F002: 'F002-电路故障',
  F003: 'F003-软件异常',
  F004: 'F004-显示异常',
  F005: 'F005-报警异常',
  F999: 'F999-其他',
};

export default function WorkOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    workOrders,
    fetchWorkOrderById,
    currentWorkOrder,
    loading,
    acceptWorkOrder,
    startRepair,
    completeWorkOrder,
    transferWorkOrder,
    fetchEngineers,
    engineers,
    partInventory,
    fetchPartInventory,
    transferHistory,
  } = useWorkOrderStore();

  const [repairRecord, setRepairRecord] = useState<RepairRecord | null>(null);
  const [repairRecords, setRepairRecords] = useState<RepairRecord[]>([]);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [completeForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [partsList, setPartsList] = useState<WorkOrderPart[]>([]);
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWorkOrderById(id);
      fetchEngineers();
      fetchPartInventory();
    }
  }, [id, fetchWorkOrderById, fetchEngineers, fetchPartInventory]);

  useEffect(() => {
    if (currentWorkOrder) {
      loadRepairRecord();
    }
  }, [currentWorkOrder]);

  const loadRepairRecord = async () => {
    if (!currentWorkOrder) return;
    try {
      const records = await repairRecordService.getByWorkOrderId(currentWorkOrder.id);
      setRepairRecords(records);
      if (records.length > 0) {
        setRepairRecord(records[0]);
        if (records[0].beforePhotos && records[0].beforePhotos.length > 0) {
          setBeforeImages(records[0].beforePhotos);
        } else {
          setBeforeImages([
            'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=medical%20equipment%20repair%20broken%20machine&image_size=square',
          ]);
        }
        if (records[0].afterPhotos && records[0].afterPhotos.length > 0) {
          setAfterImages(records[0].afterPhotos);
        }
      } else {
        setBeforeImages([
          'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=medical%20equipment%20repair%20broken%20machine&image_size=square',
        ]);
      }
    } catch {
      setBeforeImages([
        'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=medical%20equipment%20repair%20broken%20machine&image_size=square',
      ]);
    }
  };

  const workOrder = useMemo(() => {
    return currentWorkOrder || workOrders.find((w) => w.id === id);
  }, [currentWorkOrder, workOrders, id]);

  const currentStep = useMemo(() => {
    if (!workOrder) return 0;
    const statusSteps: Record<string, number> = {
      pending: 0,
      assigned: 1,
      accepted: 2,
      in_progress: 3,
      completed: 4,
      cancelled: 4,
    };
    return statusSteps[workOrder.status] || 0;
  }, [workOrder]);

  const stepItems = [
    { title: '已报修', description: '工单已创建' },
    { title: '已派单', description: '已分配处理人' },
    { title: '已接单', description: '工程师已接单' },
    { title: '维修中', description: '正在处理' },
    { title: '已完成', description: '工单已完成' },
  ];

  const canAccept = () => {
    if (!workOrder || !user) return false;
    return (
      workOrder.status === 'assigned' && workOrder.assigneeId === user.id
    );
  };

  const canStart = () => {
    if (!workOrder || !user) return false;
    return (
      (workOrder.status === 'assigned' || workOrder.status === 'accepted') &&
      workOrder.assigneeId === user.id
    );
  };

  const canComplete = () => {
    if (!workOrder || !user) return false;
    return (
      workOrder.status === 'in_progress' && workOrder.assigneeId === user.id
    );
  };

  const canTransfer = () => {
    if (!workOrder || !user) return false;
    return (
      (workOrder.status === 'assigned' || workOrder.status === 'accepted' || workOrder.status === 'in_progress') &&
      workOrder.assigneeId === user.id
    );
  };

  const handleAccept = async () => {
    if (!workOrder) return;
    const success = await acceptWorkOrder(workOrder.id);
    if (success) {
      message.success('接单成功');
      fetchWorkOrderById(workOrder.id);
    } else {
      message.error('接单失败，请重试');
    }
  };

  const handleStart = async () => {
    if (!workOrder) return;
    const success = await startRepair(workOrder.id);
    if (success) {
      message.success('已开始维修');
      fetchWorkOrderById(workOrder.id);
    } else {
      message.error('操作失败，请重试');
    }
  };

  const handleComplete = async () => {
    try {
      const values = await completeForm.validateFields();
      if (!workOrder) return;

      setCompleting(true);

      const data = {
        actualTime: values.actualTime,
        failureAnalysis: values.failureAnalysis,
        solution: values.solution,
        parts: partsList,
        beforePhotos: beforeImages,
        afterPhotos: afterImages,
      };

      const record = await completeWorkOrder(workOrder.id, data);
      if (record) {
        message.success('维修完成，维修单已生成');
        setCompleteModalVisible(false);
        fetchWorkOrderById(workOrder.id);
        loadRepairRecord();
      } else {
        const { error } = useWorkOrderStore.getState();
        message.error(error || '操作失败，请重试');
      }
    } catch {
      message.error('请填写完整信息');
    } finally {
      setCompleting(false);
    }
  };

  const handleTransfer = async () => {
    try {
      const values = await transferForm.validateFields();
      if (!workOrder) return;

      const success = await transferWorkOrder(
        workOrder.id,
        values.toEngineerId,
        values.reason
      );
      if (success) {
        message.success('转派成功');
        setTransferModalVisible(false);
        fetchWorkOrderById(workOrder.id);
      } else {
        message.error('转派失败，请重试');
      }
    } catch {
      message.error('请填写完整信息');
    }
  };

  const addPart = () => {
    const newPart: WorkOrderPart = {
      partId: '',
      partName: '',
      quantity: 1,
      unitPrice: 0,
      inStock: true,
    };
    setPartsList([...partsList, newPart]);
  };

  const updatePart = (index: number, field: keyof WorkOrderPart, value: string | number) => {
    const updated = [...partsList];
    (updated[index] as any)[field] = value;
    if (field === 'partId') {
      const inventory = partInventory.find((p) => p.id === value);
      if (inventory) {
        updated[index].partName = inventory.name;
        updated[index].unitPrice = inventory.unitPrice;
        updated[index].inStock = inventory.quantity >= (updated[index].quantity || 1);
      }
    }
    if (field === 'quantity') {
      const inventory = partInventory.find((p) => p.id === updated[index].partId);
      if (inventory) {
        updated[index].inStock = inventory.quantity >= (value as number);
      }
    }
    setPartsList(updated);
  };

  const removePart = (index: number) => {
    const updated = partsList.filter((_, i) => i !== index);
    setPartsList(updated);
  };

  const totalCost = useMemo(() => {
    return partsList.reduce((sum, part) => sum + (part.unitPrice * part.quantity || 0), 0);
  }, [partsList]);

  const transferRecords = useMemo(() => {
    return transferHistory.get(id || '') || [];
  }, [transferHistory, id]);

  if (loading && !workOrder) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/workorders')}
          className="mb-4"
        >
          返回工单列表
        </Button>
        <Empty description="工单不存在" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/workorders')}
          >
            返回
          </Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              工单详情 - {workOrder.id}
            </Title>
            <Space>
              <Tag color={workOrderTypeColor[workOrder.type]}>
                {workOrderTypeMap[workOrder.type]}
              </Tag>
              <Tag color={priorityColor[workOrder.priority]}>
                优先级：{priorityName[workOrder.priority]}
              </Tag>
            </Space>
          </div>
        </div>
        <Space>
          {canAccept() && (
            <Button
              type="primary"
              icon={<UserOutlined />}
              onClick={handleAccept}
            >
              接单
            </Button>
          )}
          {canStart() && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
            >
              开始维修
            </Button>
          )}
          {canComplete() && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                completeForm.resetFields();
                setCompleteModalVisible(true);
              }}
            >
              完成维修
            </Button>
          )}
          {canTransfer() && (
            <Button
              icon={<UserSwitchOutlined />}
              onClick={() => {
                transferForm.resetFields();
                setTransferModalVisible(true);
              }}
            >
              转派
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <Steps
          current={currentStep}
          items={stepItems}
          className="mb-4"
        />
        {transferRecords.length > 0 && (
          <div className="mt-4 p-3 bg-orange-50 rounded">
            <Text type="warning" strong>
              <ClockCircleOutlined className="mr-2" />
              转派记录：
            </Text>
            {transferRecords.map((record, index) => (
              <div key={record.id} className="ml-4 mt-1">
                <Text type="secondary">
                  {index + 1}. {record.fromName} → {record.toName}，原因：
                  {record.reason}（{dayjs(record.timestamp).format('YYYY-MM-DD HH:mm')}）
                </Text>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="故障信息">
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="设备名称">
                <a onClick={() => navigate(`/devices/${workOrder.deviceId}`)}>
                  {workOrder.deviceName}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="故障代码">
                {workOrder.faultCode
                  ? faultCodeMap[workOrder.faultCode] || workOrder.faultCode
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="故障描述">
                <Paragraph>{workOrder.description}</Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="报修科室">
                {workOrder.department}
              </Descriptions.Item>
              <Descriptions.Item label="设备位置">
                {workOrder.location}
              </Descriptions.Item>
              <Descriptions.Item label="故障照片">
                <div className="flex flex-wrap gap-2">
                  {beforeImages.map((img, index) => (
                    <Image
                      key={index}
                      width={120}
                      height={120}
                      src={img}
                      className="rounded object-cover"
                    />
                  ))}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="处理信息">
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="报修人">
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {workOrder.reporterName}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="报修时间">
                {dayjs(workOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="指派工程师">
                {workOrder.assigneeName || (
                  <Tag color="orange">待分配</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="接单时间">
                {(workOrder.status === 'accepted' || workOrder.status === 'in_progress' || workOrder.status === 'completed') && workOrder.acceptedAt
                  ? dayjs(workOrder.acceptedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {(workOrder.status === 'in_progress' || workOrder.status === 'completed') && workOrder.startedAt
                  ? dayjs(workOrder.startedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {workOrder.completedAt
                  ? dayjs(workOrder.completedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预计用时">
                {workOrder.estimatedTime
                  ? `${workOrder.estimatedTime} 分钟`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="实际用时">
                {workOrder.actualTime
                  ? `${workOrder.actualTime} 分钟`
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {repairRecords.length > 0 ? (
        <Card title="维修记录" extra={<Tag color="success">共 {repairRecords.length} 条记录</Tag>}>
          <List
            itemLayout="vertical"
            dataSource={repairRecords}
            renderItem={(record, idx) => (
              <List.Item key={record.id}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>维修记录 #{idx + 1}</Text>
                      <Tag color="green">已完成</Tag>
                      {record.warranty && <Tag color="blue">保修</Tag>}
                    </Space>
                  }
                  description={
                    <Text type="secondary">
                      <ToolOutlined className="mr-1" />
                      工程师：{record.technicianName}
                      <Divider type="vertical" />
                      <ClockCircleOutlined className="mr-1" />
                      {dayjs(record.startTime).format('YYYY-MM-DD HH:mm')} -{' '}
                      {dayjs(record.endTime).format('HH:mm')}
                      <Divider type="vertical" />
                      <DollarOutlined className="mr-1" />
                      费用：
                      <Text strong type="danger">
                        ¥{record.totalCost.toLocaleString()}
                      </Text>
                      <Divider type="vertical" />
                      用时：{record.actualDuration || Math.round(
                        (dayjs(record.endTime).valueOf() -
                          dayjs(record.startTime).valueOf()) /
                          60000
                      )}{' '}
                      分钟
                    </Text>
                  }
                />
                <Descriptions column={2} bordered size="small" className="mt-2">
                  <Descriptions.Item label="故障原因">
                    {record.diagnosis}
                  </Descriptions.Item>
                  <Descriptions.Item label="故障描述">
                    {record.faultDescription}
                  </Descriptions.Item>
                  <Descriptions.Item label="解决方案" span={2}>
                    {record.solution}
                  </Descriptions.Item>
                  <Descriptions.Item label="更换配件" span={2}>
                    {record.partsUsed.length > 0 ? (
                      <List
                        dataSource={record.partsUsed}
                        size="small"
                        renderItem={(part) => (
                          <List.Item>
                            <Space>
                              <Text strong>{part.name}</Text>
                              <Text type="secondary">{part.model}</Text>
                              <Tag color="blue">x{part.quantity}</Tag>
                              <Text type="secondary">
                                单价¥{part.unitPrice.toLocaleString()}
                              </Text>
                              <Text strong>
                                小计¥{part.totalPrice.toLocaleString()}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Text type="secondary">无配件更换</Text>
                    )}
                  </Descriptions.Item>
                  {(record.beforePhotos?.length || record.afterPhotos?.length) ? (
                    <>
                      {record.beforePhotos && record.beforePhotos.length > 0 && (
                        <Descriptions.Item label="维修前照片">
                          <Image.PreviewGroup>
                            <Space wrap>
                              {record.beforePhotos.map((p, i) => (
                                <Image
                                  key={i}
                                  width={100}
                                  height={100}
                                  src={p}
                                  className="rounded object-cover"
                                />
                              ))}
                            </Space>
                          </Image.PreviewGroup>
                        </Descriptions.Item>
                      )}
                      {record.afterPhotos && record.afterPhotos.length > 0 && (
                        <Descriptions.Item label="维修后照片">
                          <Image.PreviewGroup>
                            <Space wrap>
                              {record.afterPhotos.map((p, i) => (
                                <Image
                                  key={i}
                                  width={100}
                                  height={100}
                                  src={p}
                                  className="rounded object-cover border-2 border-green-200"
                                />
                              ))}
                            </Space>
                          </Image.PreviewGroup>
                        </Descriptions.Item>
                      )}
                    </>
                  ) : null}
                  {record.remarks && (
                    <Descriptions.Item label="备注" span={2}>
                      {record.remarks}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </List.Item>
            )}
          />
        </Card>
      ) : (
        workOrder.status === 'completed' && (
          <Card title="维修记录">
            <Empty description="暂无维修记录" />
          </Card>
        )
      )}

      {workOrder.status === 'in_progress' && (
        <Card title="维修进度">
          <Alert
            message="维修进行中"
            description="工程师正在处理此工单，请耐心等待"
            type="info"
            showIcon
          />
        </Card>
      )}

      <Card title="照片对比">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <div className="text-center mb-2">
              <Text strong>维修前</Text>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {beforeImages.map((img, index) => (
                <Image
                  key={index}
                  width={200}
                  height={200}
                  src={img}
                  className="rounded object-cover border-2 border-gray-200"
                />
              ))}
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="text-center mb-2">
              <Text strong>维修后</Text>
            </div>
            {afterImages.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {afterImages.map((img, index) => (
                  <Image
                    key={index}
                    width={200}
                    height={200}
                    src={img}
                    className="rounded object-cover border-2 border-green-200"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-52 border-2 border-dashed border-gray-300 rounded">
                <Text type="secondary">
                  <CameraOutlined className="text-2xl block mb-2" />
                  完成维修时上传
                </Text>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      <Modal
        title="完成维修"
        open={completeModalVisible}
        width={800}
        onOk={handleComplete}
        onCancel={() => setCompleteModalVisible(false)}
        okText="确认完成"
        cancelText="取消"
        confirmLoading={completing}
      >
        <Form form={completeForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="actualTime"
                label="实际用时（分钟）"
                rules={[{ required: true, message: '请输入实际用时' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="请输入实际维修用时"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="停机时长（分钟）">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="请输入设备停机时长"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="failureAnalysis"
            label="故障原因分析"
            rules={[{ required: true, message: '请填写故障原因分析' }]}
          >
            <TextArea
              rows={3}
              placeholder="请详细分析故障原因"
            />
          </Form.Item>
          <Form.Item
            name="solution"
            label="解决方案"
            rules={[{ required: true, message: '请填写解决方案' }]}
          >
            <TextArea
              rows={3}
              placeholder="请详细描述解决方案"
            />
          </Form.Item>

          <Divider orientation="left">
            <Space>
              <ToolOutlined />
              更换配件
            </Space>
          </Divider>

          <div className="mb-4">
            <Button type="dashed" block icon={<PlusOutlined />} onClick={addPart}>
              添加配件
            </Button>
          </div>

          {partsList.length > 0 && (
            <div className="space-y-3 mb-4">
              {partsList.map((part, index) => (
                <Row gutter={8} key={part.id} align="middle">
                  <Col span={8}>
                    <Select
                      placeholder="选择配件"
                      value={part.partId || undefined}
                      onChange={(value) => updatePart(index, 'partId', value)}
                      style={{ width: '100%' }}
                    >
                      {partInventory.map((item) => (
                        <Option key={item.id} value={item.id}>
                          {item.name} ({item.model}) - ¥{item.unitPrice} (库存: {item.quantity})
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  <Col span={4}>
                    <InputNumber
                      min={1}
                      value={part.quantity}
                      onChange={(value) =>
                        updatePart(index, 'quantity', value || 1)
                      }
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Input
                      value={part.unitPrice}
                      disabled
                      prefix="¥"
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Input
                      value={`¥${(part.totalPrice || 0).toLocaleString()}`}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={2}>
                    <Button
                      type="text"
                      danger
                      onClick={() => removePart(index)}
                    >
                      删除
                    </Button>
                  </Col>
                </Row>
              ))}
            </div>
          )}

          <div className="text-right mb-4">
            <Space>
              <Text strong>总计费用：</Text>
              <Text strong type="danger" style={{ fontSize: '18px' }}>
                ¥{totalCost.toLocaleString()}
              </Text>
            </Space>
          </div>

          <Divider orientation="left">
            <Space>
              <CameraOutlined />
              维修后照片
            </Space>
          </Divider>

          <Upload
            listType="picture-card"
            beforeUpload={() => false}
            onChange={({ fileList }) => {
              const newImages = fileList.map((file) => {
                if (file.originFileObj) {
                  return URL.createObjectURL(file.originFileObj);
                }
                return (
                  file.url ||
                  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=medical%20equipment%20repaired%20machine&image_size=square'
                );
              });
              setAfterImages(newImages);
            }}
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>上传</div>
            </div>
          </Upload>
        </Form>
      </Modal>

      <Modal
        title="转派工单"
        open={transferModalVisible}
        onOk={handleTransfer}
        onCancel={() => setTransferModalVisible(false)}
        okText="确认转派"
        cancelText="取消"
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item
            name="toEngineerId"
            label="转派给"
            rules={[{ required: true, message: '请选择目标工程师' }]}
          >
            <Select placeholder="请选择工程师">
              {engineers
                .filter((e) => e.id !== user?.id)
                .map((engineer) => (
                  <Option key={engineer.id} value={engineer.id}>
                    {engineer.name} - {engineer.department}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="转派原因"
            rules={[{ required: true, message: '请填写转派原因' }]}
          >
            <TextArea rows={4} placeholder="请说明转派原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
