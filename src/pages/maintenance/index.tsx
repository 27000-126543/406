import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Card,
  Button,
  Tag,
  Space,
  Table,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Badge,
  Row,
  Col,
  Statistic,
  List,
  Alert,
} from 'antd';
import {
  CalendarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ScanOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { UploadProps, CalendarProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { mockMaintenancePlans } from '@/services/mock/data';
import type { MaintenancePlan } from '@/types';

const { TextArea } = Input;
const { Dragger } = Upload;

const typeLabels: Record<string, string> = {
  preventive: '预防性保养',
  corrective: '修复性保养',
  predictive: '预测性保养',
};

const typeColors: Record<string, string> = {
  preventive: 'blue',
  corrective: 'orange',
  predictive: 'purple',
};

const frequencyLabels: Record<string, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
};

const statusLabels: Record<string, string> = {
  active: '进行中',
  paused: '已暂停',
  completed: '已完成',
};

const statusColors: Record<string, string> = {
  active: 'processing',
  paused: 'default',
  completed: 'success',
};

interface MaintenanceConfirmForm {
  checkItems: string[];
  remarks: string;
  images: string[];
}

export default function MaintenancePlanPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmForm] = Form.useForm<MaintenanceConfirmForm>();
  const [imageList, setImageList] = useState<UploadProps['fileList']>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  useEffect(() => {
    setMaintenancePlans(mockMaintenancePlans);
  }, []);

  const isOverdue = (date: string) => {
    return dayjs(date).isBefore(dayjs(), 'day');
  };

  const isDueSoon = (date: string) => {
    const diff = dayjs(date).diff(dayjs(), 'day');
    return diff >= 0 && diff <= 7;
  };

  const getDayStatus = (value: Dayjs) => {
    const plansOnDay = maintenancePlans.filter((plan) =>
      dayjs(plan.nextDate).isSame(value, 'day')
    );
    if (plansOnDay.length === 0) return null;

    const hasOverdue = plansOnDay.some((p) => isOverdue(p.nextDate));
    const hasDueSoon = plansOnDay.some((p) => isDueSoon(p.nextDate));

    if (hasOverdue) return 'error';
    if (hasDueSoon) return 'warning';
    return 'success';
  };

  const dateCellRender: CalendarProps<Dayjs>['dateCellRender'] = (value) => {
    const plansOnDay = maintenancePlans.filter((plan) =>
      dayjs(plan.nextDate).isSame(value, 'day')
    );

    if (plansOnDay.length === 0) return null;

    return (
      <ul className="events">
        {plansOnDay.slice(0, 2).map((plan) => {
          const overdue = isOverdue(plan.nextDate);
          const dueSoon = isDueSoon(plan.nextDate);
          return (
            <li key={plan.id}>
              <Badge
                status={overdue ? 'error' : dueSoon ? 'warning' : 'success'}
                text={
                  <span
                    className={
                      overdue ? 'text-error' : dueSoon ? 'text-warning' : ''
                    }
                  >
                    {plan.deviceName}
                  </span>
                }
              />
            </li>
          );
        })}
        {plansOnDay.length > 2 && (
          <li>
            <span className="text-text-tertiary text-xs">
              +{plansOnDay.length - 2} 项
            </span>
          </li>
        )}
      </ul>
    );
  };

  const monthCellRender: CalendarProps<Dayjs>['monthCellRender'] = (value) => {
    const plansInMonth = maintenancePlans.filter((plan) =>
      dayjs(plan.nextDate).isSame(value, 'month')
    );
    if (plansInMonth.length === 0) return null;

    const overdueCount = plansInMonth.filter((p) => isOverdue(p.nextDate)).length;
    const dueSoonCount = plansInMonth.filter((p) => isDueSoon(p.nextDate)).length;

    return (
      <div className="notes-month">
        <section>
          {overdueCount > 0 && (
            <Badge count={overdueCount} classNames={{ indicator: 'bg-error' }} />
          )}
          {dueSoonCount > 0 && (
            <Badge count={dueSoonCount} classNames={{ indicator: 'bg-warning' }} />
          )}
        </section>
        <span className="text-text-tertiary text-xs">
          共 {plansInMonth.length} 项
        </span>
      </div>
    );
  };

  const handleDateSelect = (value: Dayjs) => {
    setSelectedDate(value);
  };

  const plansOnSelectedDate = maintenancePlans.filter((plan) =>
    dayjs(plan.nextDate).isSame(selectedDate, 'day')
  );

  const sortedPlans = [...maintenancePlans].sort((a, b) => {
    const aOverdue = isOverdue(a.nextDate);
    const bOverdue = isOverdue(b.nextDate);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return dayjs(a.nextDate).valueOf() - dayjs(b.nextDate).valueOf();
  });

  const handleConfirmMaintenance = (plan: MaintenancePlan) => {
    setSelectedPlan(plan);
    setCheckedItems([]);
    setImageList([]);
    confirmForm.resetFields();
    setConfirmModalVisible(true);
  };

  const handleCheckItem = (item: string, checked: boolean) => {
    if (checked) {
      setCheckedItems((prev) => [...prev, item]);
    } else {
      setCheckedItems((prev) => prev.filter((i) => i !== item));
    }
  };

  const handleSubmitConfirm = async () => {
    try {
      const values = await confirmForm.validateFields();
      
      if (!selectedPlan) return;

      if (checkedItems.length !== selectedPlan.checkItems.length) {
        message.warning('请完成所有检查项目');
        return;
      }

      const images = imageList.map((f) => f.url || f.name);

      setMaintenancePlans((prev) =>
        prev.map((p) =>
          p.id === selectedPlan.id
            ? {
                ...p,
                lastDate: dayjs().format('YYYY-MM-DD'),
                nextDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
              }
            : p
        )
      );

      message.success('保养确认成功');
      setConfirmModalVisible(false);
      setSelectedPlan(null);
      setCheckedItems([]);
      setImageList([]);
    } catch {
      message.error('请填写完整信息');
    }
  };

  const uploadProps: UploadProps = {
    fileList: imageList,
    onChange: ({ fileList }) => setImageList(fileList),
    beforeUpload: () => false,
    listType: 'picture-card',
  };

  const columns = [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      render: (text: string, record: MaintenancePlan) => {
        const overdue = isOverdue(record.nextDate);
        const dueSoon = isDueSoon(record.nextDate);
        return (
          <span className={overdue ? 'text-error font-medium' : dueSoon ? 'text-warning font-medium' : ''}>
            {overdue && <ExclamationCircleOutlined className="mr-1" />}
            {text}
          </span>
        );
      },
    },
    {
      title: '保养类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={typeColors[type]}>{typeLabels[type]}</Tag>
      ),
    },
    {
      title: '保养频率',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (freq: string) => frequencyLabels[freq],
    },
    {
      title: '计划日期',
      dataIndex: 'nextDate',
      key: 'nextDate',
      render: (date: string, record: MaintenancePlan) => {
        const overdue = isOverdue(date);
        const dueSoon = isDueSoon(date);
        const diff = dayjs(date).diff(dayjs(), 'day');
        return (
          <div>
            <span className={overdue ? 'text-error' : dueSoon ? 'text-warning' : ''}>
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
      title: '负责人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
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
      title: '上次保养',
      dataIndex: 'lastDate',
      key: 'lastDate',
      render: (date?: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: MaintenancePlan) => (
        <Space>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/maintenance/plan`)}
          >
            查看详情
          </Button>
          {record.status === 'active' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleConfirmMaintenance(record)}
            >
              确认保养
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const overdueCount = maintenancePlans.filter((p) => isOverdue(p.nextDate)).length;
  const dueSoonCount = maintenancePlans.filter((p) => isDueSoon(p.nextDate)).length;
  const thisMonthCount = maintenancePlans.filter((p) =>
    dayjs(p.nextDate).isSame(dayjs(), 'month')
  ).length;
  const completedCount = maintenancePlans.filter((p) => p.status === 'completed').length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">保养计划管理</h1>
        <p className="text-text-secondary">
          查看保养计划日历、管理保养任务、记录保养执行情况
        </p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="本月保养计划"
              value={thisMonthCount}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="7天内到期"
              value={dueSoonCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已逾期"
              value={overdueCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={10}>
          <Card title="月度保养日历" className="h-full">
            {overdueCount > 0 && (
              <Alert
                message={`有 ${overdueCount} 项保养计划已逾期，请尽快处理`}
                type="error"
                showIcon
                className="mb-4"
              />
            )}
            {dueSoonCount > 0 && overdueCount === 0 && (
              <Alert
                message={`有 ${dueSoonCount} 项保养计划将在7天内到期，请提前安排`}
                type="warning"
                showIcon
                className="mb-4"
              />
            )}
            <Calendar
              value={selectedDate}
              onSelect={handleDateSelect}
              dateCellRender={dateCellRender}
              monthCellRender={monthCellRender}
            />
          </Card>
        </Col>
        <Col span={14}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <CalendarOutlined />
                保养计划列表
                <Badge count={maintenancePlans.length} className="ml-2" />
              </div>
            }
            extra={
              <Space>
                <Button icon={<ClockCircleOutlined />}>按日期排序</Button>
                <Button type="primary" icon={<CalendarOutlined />}>
                  新增计划
                </Button>
              </Space>
            }
          >
            {plansOnSelectedDate.length > 0 && (
              <Alert
                message={`${selectedDate.format('YYYY年MM月DD日')} 有 ${plansOnSelectedDate.length} 项保养计划`}
                type="info"
                showIcon
                className="mb-4"
              />
            )}
            <Table
              columns={columns}
              dataSource={sortedPlans}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              rowClassName={(record) => {
                if (isOverdue(record.nextDate)) return 'bg-error-light';
                if (isDueSoon(record.nextDate)) return 'bg-warning-light';
                return '';
              }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-primary" />
            保养确认
          </div>
        }
        open={confirmModalVisible}
        width={700}
        onOk={handleSubmitConfirm}
        onCancel={() => setConfirmModalVisible(false)}
        okText="确认完成"
      >
        {selectedPlan && (
          <div>
            <Card size="small" className="mb-4 bg-primary-light">
              <Row gutter={16}>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">设备名称</div>
                  <div className="font-medium">{selectedPlan.deviceName}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">保养类型</div>
                  <div>
                    <Tag color={typeColors[selectedPlan.type]}>
                      {typeLabels[selectedPlan.type]}
                    </Tag>
                  </div>
                </Col>
              </Row>
              <Row gutter={16} className="mt-2">
                <Col span={12}>
                  <div className="text-text-secondary text-sm">计划日期</div>
                  <div>{dayjs(selectedPlan.nextDate).format('YYYY-MM-DD')}</div>
                </Col>
                <Col span={12}>
                  <div className="text-text-secondary text-sm">负责人</div>
                  <div>{selectedPlan.assigneeName}</div>
                </Col>
              </Row>
            </Card>

            <div className="mb-4">
              <div className="font-medium mb-2">
                扫码确认设备
                <span className="text-error ml-1">*</span>
              </div>
              <div className="border-2 border-dashed border-primary rounded-lg p-6 text-center">
                <ScanOutlined className="text-4xl text-primary mb-2" />
                <p className="text-text-secondary">请扫描设备二维码确认保养设备</p>
                <Button type="primary" icon={<ScanOutlined />} className="mt-2">
                  模拟扫码确认
                </Button>
              </div>
            </div>

            <Form form={confirmForm} layout="vertical">
              <Form.Item label="检查项目">
                <div className="space-y-2">
                  {selectedPlan.checkItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checkedItems.includes(item)}
                          onChange={(e) => handleCheckItem(item, e.target.checked)}
                          className="w-4 h-4 text-primary"
                        />
                        <span>{item}</span>
                      </div>
                      {checkedItems.includes(item) && (
                        <CheckCircleOutlined className="text-success" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm text-text-secondary">
                  已完成 {checkedItems.length}/{selectedPlan.checkItems.length} 项
                </div>
              </Form.Item>

              <Form.Item label="保养记录和照片">
                <Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽上传保养记录和照片</p>
                  <p className="ant-upload-hint">支持 JPG、PNG、PDF 格式</p>
                </Dragger>
              </Form.Item>

              <Form.Item
                name="remarks"
                label="备注"
              >
                <TextArea
                  rows={3}
                  placeholder="请填写保养过程中的特殊情况或发现的问题"
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <style>{`
        .events {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .events li {
          margin: 2px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .notes-month {
          text-align: center;
          font-size: 12px;
        }
        .notes-month section {
          height: 30px;
        }
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
