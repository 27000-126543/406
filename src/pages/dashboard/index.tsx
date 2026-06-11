import { useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, List, Timeline, Tag, Avatar, Space, Typography } from 'antd';
import {
  DesktopOutlined,
  AlertOutlined,
  ToolOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const statusColorMap: Record<string, string> = {
  normal: '#52c41a',
  warning: '#faad14',
  fault: '#ff4d4f',
  maintenance: '#1890ff',
  calibrating: '#722ed1',
  scrapped: '#8c8c8c',
};

const statusNameMap: Record<string, string> = {
  normal: '正常',
  warning: '预警',
  fault: '故障',
  maintenance: '保养中',
  calibrating: '校准中',
  scrapped: '已报废',
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { devices, fetchDevices } = useDeviceStore();
  const { workOrders, fetchWorkOrders } = useWorkOrderStore();

  useEffect(() => {
    fetchDevices();
    fetchWorkOrders();
  }, [fetchDevices, fetchWorkOrders]);

  const isDirector = user?.role === 'director' || user?.role === 'admin';

  const filteredDevices = useMemo(() => {
    if (isDirector) return devices;
    return devices.filter((d) => d.department === user?.department);
  }, [devices, isDirector, user?.department]);

  const filteredWorkOrders = useMemo(() => {
    if (isDirector) return workOrders;
    if (user?.role === 'engineer') {
      return workOrders.filter((w) => w.assigneeId === user.id);
    }
    return workOrders.filter((w) => w.department === user?.department);
  }, [workOrders, isDirector, user]);

  const stats = useMemo(() => {
    const total = filteredDevices.length;
    const online = filteredDevices.filter((d) => d.status !== 'scrapped').length;
    const onlineRate = total > 0 ? ((online / total) * 100).toFixed(1) : '0';
    const pendingWorkOrders = filteredWorkOrders.filter((w) => w.status === 'pending' || w.status === 'assigned').length;
    const currentMonth = dayjs().month();
    const currentYear = dayjs().year();
    const monthlyMaintenance = filteredWorkOrders.filter(
      (w) =>
        w.type === 'maintenance' &&
        dayjs(w.createdAt).month() === currentMonth &&
        dayjs(w.createdAt).year() === currentYear
    ).length;

    return { total, onlineRate, pendingWorkOrders, monthlyMaintenance };
  }, [filteredDevices, filteredWorkOrders]);

  const statusPieOption = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredDevices.forEach((d) => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
    });

    const data = Object.entries(statusCounts).map(([name, value]) => ({
      name: statusNameMap[name] || name,
      value,
      itemStyle: { color: statusColorMap[name] || '#1890ff' },
    }));

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', top: 'center' },
      series: [
        {
          name: '设备状态',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 16, fontWeight: 'bold' },
          },
          data,
        },
      ],
    };
  }, [filteredDevices]);

  const workOrderTrendOption = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) =>
      dayjs().subtract(29 - i, 'day').format('MM-DD')
    );

    const counts: Record<string, number> = {};
    filteredWorkOrders.forEach((w) => {
      const date = dayjs(w.createdAt).format('MM-DD');
      counts[date] = (counts[date] || 0) + 1;
    });

    const data = days.map((d) => counts[d] || 0);

    return {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: days,
        axisLabel: { interval: 4 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '工单数量',
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
              ],
            },
          },
          lineStyle: { color: '#1890ff', width: 2 },
          itemStyle: { color: '#1890ff' },
          data,
        },
      ],
    };
  }, [filteredWorkOrders]);

  const departmentBarOption = useMemo(() => {
    const deptCounts: Record<string, number> = {};
    filteredDevices.forEach((d) => {
      deptCounts[d.department] = (deptCounts[d.department] || 0) + 1;
    });

    const sortedEntries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
    const categories = sortedEntries.map(([name]) => name);
    const values = sortedEntries.map(([, value]) => value);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { rotate: 30, interval: 0 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '设备数量',
          type: 'bar',
          data: values,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#40a9ff' },
                { offset: 1, color: '#096dd9' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '50%',
        },
      ],
    };
  }, [filteredDevices]);

  const pendingTasks = useMemo(() => {
    return filteredWorkOrders
      .filter((w) => w.status === 'pending' || w.status === 'assigned' || w.status === 'in_progress')
      .slice(0, 5)
      .map((w) => ({
        id: w.id,
        title: w.title,
        priority: w.priority,
        status: w.status,
        time: w.createdAt,
      }));
  }, [filteredWorkOrders]);

  const recentActivities = useMemo(() => {
    const activities: Array<{
      time: string;
      title: string;
      description: string;
      color: string;
    }> = [];

    filteredWorkOrders.slice(0, 5).forEach((w) => {
      activities.push({
        time: w.createdAt,
        title: `工单 ${w.id}`,
        description: `${w.title} - ${workOrderStatusName[w.status]}`,
        color: workOrderStatusColor[w.status] || 'blue',
      });
    });

    filteredDevices
      .filter((d) => d.status !== 'normal')
      .slice(0, 3)
      .forEach((d) => {
        activities.push({
          time: d.updatedAt,
          title: `设备 ${d.name}`,
          description: `状态变更为 ${statusNameMap[d.status]}`,
          color: statusColorMap[d.status] || 'blue',
        });
      });

    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [filteredWorkOrders, filteredDevices]);

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <Title level={3} style={{ margin: 0 }}>
          {isDirector ? '全院设备管理概览' : `${user?.department} - 设备管理`}
        </Title>
        <Text type="secondary">
          欢迎回来，{user?.name}！今天是 {dayjs().format('YYYY年MM月DD日')}
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/devices')}>
            <Statistic
              title="设备总数"
              value={stats.total}
              prefix={<DesktopOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/devices')}>
            <Statistic
              title="设备在线率"
              value={parseFloat(stats.onlineRate)}
              suffix="%"
              precision={1}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/workorders')}>
            <Statistic
              title="待处理工单"
              value={stats.pendingWorkOrders}
              prefix={<AlertOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/workorders')}>
            <Statistic
              title="本月保养数"
              value={stats.monthlyMaintenance}
              prefix={<ToolOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="设备状态分布" className="h-full">
            <ReactECharts option={statusPieOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="近30天工单趋势" className="h-full">
            <ReactECharts option={workOrderTrendOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="各科室设备数量" className="h-full">
            <ReactECharts option={departmentBarOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="待办事项" extra={<a onClick={() => navigate('/workorders')}>查看全部</a>}>
            <List
              dataSource={pendingTasks}
              renderItem={(item) => (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50 rounded px-2 transition-colors"
                  onClick={() => navigate(`/workorders/${item.id}`)}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={
                          item.status === 'in_progress' ? (
                            <ClockCircleOutlined />
                          ) : item.priority === 'urgent' ? (
                            <WarningOutlined />
                          ) : (
                            <CalendarOutlined />
                          )
                        }
                        style={{
                          backgroundColor:
                            item.priority === 'urgent'
                              ? '#ff4d4f'
                              : item.priority === 'high'
                              ? '#faad14'
                              : '#1890ff',
                        }}
                      />
                    }
                    title={
                      <Space>
                        <span>{item.title}</span>
                        <Tag color={priorityColor[item.priority]}>
                          {priorityName[item.priority]}
                        </Tag>
                        <Tag color={workOrderStatusColor[item.status]}>
                          {workOrderStatusName[item.status]}
                        </Tag>
                      </Space>
                    }
                    description={dayjs(item.time).format('YYYY-MM-DD HH:mm')}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近活动">
        <Timeline
          mode="left"
          items={recentActivities.map((activity) => ({
            color: activity.color,
            label: dayjs(activity.time).format('YYYY-MM-DD HH:mm'),
            children: (
              <div>
                <Text strong>{activity.title}</Text>
                <br />
                <Text type="secondary">{activity.description}</Text>
              </div>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
