import { useMemo, useState } from 'react';
import { Card, Row, Col, Statistic, Tabs, Typography } from 'antd';
import {
  DesktopOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { TabsProps } from 'antd';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useWorkOrderStore } from '@/store/useWorkOrderStore';
import { useEffect } from 'react';
import dayjs from 'dayjs';

const { Title } = Typography;

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

const departments = ['放射科', '检验科', '超声科', '手术室', 'ICU', '心内科', '急诊科', '新生儿科'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const { devices, fetchDevices } = useDeviceStore();
  const { workOrders, fetchWorkOrders } = useWorkOrderStore();

  useEffect(() => {
    fetchDevices();
    fetchWorkOrders();
  }, [fetchDevices, fetchWorkOrders]);

  const stats = useMemo(() => {
    const totalDevices = devices.length;
    const currentMonth = dayjs().month();
    const currentYear = dayjs().year();
    const monthlyWorkOrders = workOrders.filter(
      (w) =>
        dayjs(w.createdAt).month() === currentMonth &&
        dayjs(w.createdAt).year() === currentYear
    ).length;

    const completedOrders = workOrders.filter(
      (w) => w.status === 'completed' && w.actualTime
    );
    const avgRepairTime =
      completedOrders.length > 0
        ? Math.round(
            completedOrders.reduce((sum, w) => sum + (w.actualTime || 0), 0) /
              completedOrders.length
          )
        : 0;

    const maintenancePlans = workOrders.filter((w) => w.type === 'maintenance');
    const completedMaintenance = maintenancePlans.filter(
      (w) => w.status === 'completed'
    );
    const maintenanceRate =
      maintenancePlans.length > 0
        ? ((completedMaintenance.length / maintenancePlans.length) * 100).toFixed(1)
        : '0';

    return {
      totalDevices,
      monthlyWorkOrders,
      avgRepairTime,
      maintenanceRate,
    };
  }, [devices, workOrders]);

  const radarOption = useMemo(() => {
    const deptUtilization: Record<string, number> = {};
    departments.forEach((dept) => {
      const deptDevices = devices.filter((d) => d.department === dept);
      const normalDevices = deptDevices.filter(
        (d) => d.status === 'normal' || d.status === 'warning'
      );
      deptUtilization[dept] =
        deptDevices.length > 0
          ? Math.round((normalDevices.length / deptDevices.length) * 100)
          : 0;
    });

    return {
      tooltip: {},
      radar: {
        indicator: departments.map((name) => ({ name, max: 100 })),
        shape: 'polygon',
        splitNumber: 5,
        axisName: {
          color: '#333',
        },
      },
      series: [
        {
          name: '设备利用率',
          type: 'radar',
          data: [
            {
              value: departments.map((d) => deptUtilization[d] || 0),
              name: '利用率',
              areaStyle: {
                color: 'rgba(24, 144, 255, 0.3)',
              },
              lineStyle: {
                color: '#1890ff',
                width: 2,
              },
              itemStyle: {
                color: '#1890ff',
              },
            },
          ],
        },
      ],
    };
  }, [devices]);

  const faultRateOption = useMemo(() => {
    const deptFaultRate: Record<string, number> = {};
    departments.forEach((dept) => {
      const deptDevices = devices.filter((d) => d.department === dept);
      const faultDevices = deptDevices.filter((d) => d.status === 'fault');
      deptFaultRate[dept] =
        deptDevices.length > 0
          ? Math.round((faultDevices.length / deptDevices.length) * 100)
          : 0;
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c}%',
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: departments,
        axisLabel: { rotate: 30, interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%' },
      },
      series: [
        {
          name: '故障率',
          type: 'bar',
          data: departments.map((d) => deptFaultRate[d] || 0),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#ff7875' },
                { offset: 1, color: '#ff4d4f' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '50%',
        },
      ],
    };
  }, [devices]);

  const repairCostOption = useMemo(() => {
    const deptCost: Record<string, number> = {};
    departments.forEach((dept) => {
      const deptOrders = workOrders.filter(
        (w) => w.department === dept && w.status === 'completed'
      );
      deptCost[dept] = deptOrders.length * 500 + Math.floor(Math.random() * 5000);
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: ¥{c}',
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: departments,
        axisLabel: { rotate: 30, interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '¥{value}' },
      },
      series: [
        {
          name: '维修成本',
          type: 'bar',
          data: departments.map((d) => deptCost[d] || 0),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#9254de' },
                { offset: 1, color: '#722ed1' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '50%',
        },
      ],
    };
  }, [workOrders]);

  const statusPieOption = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    devices.forEach((d) => {
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
          center: ['65%', '50%'],
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
  }, [devices]);

  const monthlyTrendOption = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(dayjs().subtract(i, 'month').format('YYYY-MM'));
    }

    const workOrderCounts = months.map(() => Math.floor(Math.random() * 30) + 10);
    const maintenanceCounts = months.map(() => Math.floor(Math.random() * 15) + 5);
    const repairCounts = months.map(() => Math.floor(Math.random() * 20) + 5);

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['工单总数', '保养工单', '维修工单'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '工单总数',
          type: 'line',
          smooth: true,
          data: workOrderCounts,
          lineStyle: { color: '#1890ff', width: 2 },
          itemStyle: { color: '#1890ff' },
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
        },
        {
          name: '保养工单',
          type: 'line',
          smooth: true,
          data: maintenanceCounts,
          lineStyle: { color: '#52c41a', width: 2 },
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '维修工单',
          type: 'line',
          smooth: true,
          data: repairCounts,
          lineStyle: { color: '#faad14', width: 2 },
          itemStyle: { color: '#faad14' },
        },
      ],
    };
  }, []);

  const deviceTypeFaultOption = useMemo(() => {
    const deviceTypes = ['影像设备', '检验设备', '超声设备', '生命支持设备', '监护设备', '急救设备'];
    const faultRates = deviceTypes.map(() => Math.floor(Math.random() * 25) + 5);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c}%',
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: deviceTypes,
        axisLabel: { rotate: 20, interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%' },
        max: 40,
      },
      series: [
        {
          name: '故障率',
          type: 'bar',
          data: faultRates,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#ffa940' },
                { offset: 1, color: '#fa8c16' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
          },
        },
      ],
    };
  }, []);

  const brandReliabilityOption = useMemo(() => {
    const brands = ['西门子医疗', 'GE医疗', '飞利浦医疗', '迈瑞医疗', '罗氏诊断', '奥林巴斯'];
    const reliability = brands.map(() => Math.floor(Math.random() * 20) + 75);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c}%',
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: brands,
        axisLabel: { rotate: 20, interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%' },
        min: 60,
        max: 100,
      },
      series: [
        {
          name: '可靠性',
          type: 'bar',
          data: reliability,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#73d13d' },
                { offset: 1, color: '#52c41a' },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
          },
        },
      ],
    };
  }, []);

  const monthlyStats = useMemo(() => {
    const currentMonthDownTime = Math.floor(Math.random() * 100) + 50;
    const currentMonthRepairs = Math.floor(Math.random() * 30) + 10;
    const currentMonthMaintenanceRate = (Math.random() * 20 + 75).toFixed(1);

    return {
      downTime: currentMonthDownTime,
      repairs: currentMonthRepairs,
      maintenanceRate: currentMonthMaintenanceRate,
    };
  }, []);

  const tabItems: TabsProps['items'] = [
    {
      key: 'overview',
      label: '综合看板',
    },
    {
      key: 'monthly',
      label: '月度报告',
    },
    {
      key: 'compare',
      label: '设备对比',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <Title level={3} style={{ margin: 0 }}>
          数据报表
        </Title>
        <p className="text-gray-500 mt-1">设备运维数据统计与分析</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="设备总数"
              value={stats.totalDevices}
              prefix={<DesktopOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="本月工单量"
              value={stats.monthlyWorkOrders}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="平均维修时长"
              value={stats.avgRepairTime}
              suffix="分钟"
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="保养完成率"
              value={parseFloat(stats.maintenanceRate)}
              suffix="%"
              precision={1}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />

        {activeTab === 'overview' && (
          <div className="space-y-6 mt-4">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="各科室设备利用率" className="h-full">
                  <ReactECharts option={radarOption} style={{ height: 350 }} />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="各科室故障率" className="h-full">
                  <ReactECharts option={faultRateOption} style={{ height: 350 }} />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="各科室维修成本对比" className="h-full">
                  <ReactECharts option={repairCostOption} style={{ height: 350 }} />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="设备状态分布" className="h-full">
                  <ReactECharts option={statusPieOption} style={{ height: 350 }} />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="space-y-6 mt-4">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="本月停机时长"
                    value={monthlyStats.downTime}
                    suffix="小时"
                    prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="本月维修次数"
                    value={monthlyStats.repairs}
                    prefix={<ToolOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card>
                  <Statistic
                    title="本月保养完成率"
                    value={parseFloat(monthlyStats.maintenanceRate)}
                    suffix="%"
                    precision={1}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="月度趋势（近6个月）">
              <ReactECharts option={monthlyTrendOption} style={{ height: 400 }} />
            </Card>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="space-y-6 mt-4">
            <Card title="各类型设备故障率对比">
              <ReactECharts option={deviceTypeFaultOption} style={{ height: 350 }} />
            </Card>

            <Card title="各品牌设备可靠性对比">
              <ReactECharts option={brandReliabilityOption} style={{ height: 350 }} />
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
