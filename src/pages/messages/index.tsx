import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Card,
  Button,
  Tag,
  Space,
  Checkbox,
  Modal,
  message,
  Badge,
  Row,
  Col,
  Statistic,
  List,
  Avatar,
  Tooltip,
  Divider,
  Dropdown,
  MenuProps,
  Alert,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  SettingOutlined,
  ToolOutlined,
  CalendarOutlined,
  SafetyOutlined,
  DeleteOutlined as ScrapOutlined,
  ExclamationCircleOutlined,
  CheckSquareOutlined,
  DownOutlined,
  ReloadOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useMessageStore } from '@/store/useMessageStore';
import type { Message } from '@/types';

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  all: {
    label: '全部',
    color: 'default',
    icon: <BellOutlined />,
  },
  work_order: {
    label: '工单',
    color: 'blue',
    icon: <ToolOutlined />,
  },
  maintenance: {
    label: '保养',
    color: 'green',
    icon: <CalendarOutlined />,
  },
  calibration: {
    label: '校准',
    color: 'purple',
    icon: <SafetyOutlined />,
  },
  scrap: {
    label: '报废',
    color: 'orange',
    icon: <ScrapOutlined />,
  },
  system: {
    label: '系统',
    color: 'default',
    icon: <SettingOutlined />,
  },
};

type MessageType = 'all' | 'work_order' | 'maintenance' | 'calibration' | 'scrap' | 'system';

export default function MessageCenter() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<MessageType>('all');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const {
    messages,
    loading,
    fetchMessages,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
  } = useMessageStore();

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const filteredMessages =
    activeType === 'all'
      ? messages
      : messages.filter((m) => m.type === activeType);

  const unreadCount = getUnreadCount();
  const unreadByType: Record<string, number> = {
    all: unreadCount,
    work_order: messages.filter((m) => m.type === 'work_order' && !m.isRead).length,
    maintenance: messages.filter((m) => m.type === 'maintenance' && !m.isRead).length,
    calibration: messages.filter((m) => m.type === 'calibration' && !m.isRead).length,
    scrap: messages.filter((m) => m.type === 'scrap' && !m.isRead).length,
    system: messages.filter((m) => m.type === 'system' && !m.isRead).length,
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMessages(filteredMessages.map((m) => m.id));
    } else {
      setSelectedMessages([]);
    }
  };

  const handleSelectMessage = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedMessages((prev) => [...prev, id]);
    } else {
      setSelectedMessages((prev) => prev.filter((mid) => mid !== id));
    }
  };

  const handleMarkAsRead = async (ids?: string[]) => {
    const targetIds = ids || selectedMessages;
    if (targetIds.length === 0) {
      message.warning('请选择要标记的消息');
      return;
    }

    for (const id of targetIds) {
      await markAsRead(id);
    }

    setSelectedMessages([]);
    message.success(`已标记 ${targetIds.length} 条消息为已读`);
  };

  const handleMarkAllAsRead = async () => {
    const count = await markAllAsRead();
    setSelectedMessages([]);
    message.success(`已标记 ${count} 条消息为已读`);
  };

  const handleDelete = (ids?: string[]) => {
    const targetIds = ids || selectedMessages;
    if (targetIds.length === 0) {
      message.warning('请选择要删除的消息');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${targetIds.length} 条消息吗？`,
      onOk: () => {
        setSelectedMessages([]);
        message.success(`已删除 ${targetIds.length} 条消息`);
      },
    });
  };

  const handleViewDetail = async (msg: Message) => {
    setSelectedMessage(msg);
    setDetailModalVisible(true);

    if (!msg.isRead) {
      await markAsRead(msg.id);
    }
  };

  const handleNavigateToRelated = (msg: Message) => {
    if (!msg.relatedType || !msg.relatedId) {
      message.info('该消息没有关联页面');
      return;
    }

    const routeMap: Record<string, string> = {
      work_order: '/workorders',
      workorder: '/workorders',
      maintenance_plan: '/maintenance/plan',
      calibration_record: '/calibration/record',
      scrap: '/scrap',
      device: '/devices',
      inventory: '/inventory',
      repair_record: '/repair',
    };

    const route = routeMap[msg.relatedType];
    if (route) {
      navigate(route);
      setDetailModalVisible(false);
    } else {
      message.info('未找到相关页面');
    }
  };

  const getMessageIcon = (type: string) => {
    return typeConfig[type]?.icon || <BellOutlined />;
  };

  const getMessageTypeColor = (type: string) => {
    return typeConfig[type]?.color || 'default';
  };

  const tabItems = (Object.keys(typeConfig) as MessageType[]).map((type) => ({
    key: type,
    label: (
      <span>
        {typeConfig[type].icon} {typeConfig[type].label}
        {unreadByType[type] > 0 && (
          <Badge
            count={unreadByType[type]}
            size="small"
            className="ml-2"
            color={type === 'all' ? 'red' : undefined}
          />
        )}
      </span>
    ),
  }));

  const batchMenuItems: MenuProps['items'] = [
    {
      key: 'markRead',
      label: '标记已读',
      icon: <ReadOutlined />,
      disabled: selectedMessages.length === 0,
      onClick: () => handleMarkAsRead(),
    },
    {
      key: 'delete',
      label: '删除选中',
      icon: <DeleteOutlined />,
      disabled: selectedMessages.length === 0,
      onClick: () => handleDelete(),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">消息中心</h1>
        <p className="text-text-secondary">查看系统通知、工单提醒、保养提醒等消息</p>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="全部消息"
              value={messages.length}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未读消息"
              value={unreadCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理工单"
              value={unreadByType.work_order}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批"
              value={unreadByType.scrap}
              valueStyle={{ color: '#faad14' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <Checkbox
              indeterminate={
                selectedMessages.length > 0 &&
                selectedMessages.length < filteredMessages.length
              }
              checked={
                filteredMessages.length > 0 &&
                selectedMessages.length === filteredMessages.length
              }
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              全选
            </Checkbox>
            <span className="text-text-secondary text-sm">
              已选择 {selectedMessages.length} 条
            </span>
          </div>

          <Space>
            <Tooltip title="刷新">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchMessages()}
              />
            </Tooltip>
            <Button
              icon={<CheckSquareOutlined />}
              onClick={handleMarkAllAsRead}
            >
              全部已读
            </Button>
            <Dropdown menu={{ items: batchMenuItems }}>
              <Button>
                批量操作 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>

        {unreadCount > 0 && (
          <Alert
            message={`您有 ${unreadCount} 条未读消息`}
            type="info"
            showIcon
            action={
              <Button size="small" type="primary" onClick={handleMarkAllAsRead}>
                全部标记已读
              </Button>
            }
            className="mb-4"
          />
        )}

        <Tabs
          activeKey={activeType}
          onChange={(key) => {
            setActiveType(key as MessageType);
            setSelectedMessages([]);
          }}
          items={tabItems}
          className="message-tabs"
        />

        <List
          loading={loading}
          dataSource={filteredMessages}
          renderItem={(msg) => (
            <List.Item
              key={msg.id}
              className={`cursor-pointer transition-colors hover:bg-bg-tertiary rounded-lg p-4 mb-2 ${
                !msg.isRead ? 'bg-primary-lighter' : 'bg-white'
              }`}
              onClick={() => handleViewDetail(msg)}
            >
              <div className="flex items-start gap-4 w-full">
                <Checkbox
                  className="mt-1"
                  checked={selectedMessages.includes(msg.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleSelectMessage(msg.id, e.target.checked)
                  }
                />

                <Avatar
                  className={`bg-${getMessageTypeColor(msg.type)}-100`}
                  style={{
                    backgroundColor:
                      msg.type === 'work_order'
                        ? '#e6f7ff'
                        : msg.type === 'maintenance'
                        ? '#f6ffed'
                        : msg.type === 'calibration'
                        ? '#f9f0ff'
                        : msg.type === 'scrap'
                        ? '#fff7e6'
                        : '#f5f5f5',
                    color:
                      msg.type === 'work_order'
                        ? '#1890ff'
                        : msg.type === 'maintenance'
                        ? '#52c41a'
                        : msg.type === 'calibration'
                        ? '#722ed1'
                        : msg.type === 'scrap'
                        ? '#faad14'
                        : '#8c8c8c',
                  }}
                  icon={getMessageIcon(msg.type)}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      {!msg.isRead && (
                        <Badge dot color="#ff4d4f" className="mr-1" />
                      )}
                      <span
                        className={`text-base ${
                          !msg.isRead ? 'font-bold text-text-primary' : 'text-text-primary'
                        }`}
                      >
                        {msg.title}
                      </span>
                      <Tag
                        color={getMessageTypeColor(msg.type)}
                        className="text-xs"
                      >
                        {typeConfig[msg.type]?.label}
                      </Tag>
                    </div>
                    <span className="text-text-tertiary text-sm whitespace-nowrap ml-4">
                      {dayjs(msg.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      !msg.isRead ? 'text-text-secondary font-medium' : 'text-text-secondary'
                    } line-clamp-2`}
                  >
                    {msg.content}
                  </p>
                </div>

                <Space className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!msg.isRead && (
                    <Tooltip title="标记已读">
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleMarkAsRead([msg.id])}
                      />
                    </Tooltip>
                  )}
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete([msg.id])}
                    />
                  </Tooltip>
                </Space>
              </div>
            </List.Item>
          )}
          locale={{ emptyText: '暂无消息' }}
        />

        {filteredMessages.length === 0 && !loading && (
          <div className="text-center py-12">
            <BellOutlined className="text-6xl text-text-quaternary mb-4" />
            <p className="text-text-secondary">暂无{typeConfig[activeType].label}消息</p>
          </div>
        )}
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            {selectedMessage && getMessageIcon(selectedMessage.type)}
            {selectedMessage?.title}
          </div>
        }
        open={detailModalVisible}
        width={600}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedMessage(null);
        }}
        footer={
          <Space>
            {selectedMessage &&
              (selectedMessage.relatedType || selectedMessage.relatedId) && (
                <Button
                  type="primary"
                  onClick={() => handleNavigateToRelated(selectedMessage)}
                >
                  查看详情
                </Button>
              )}
            <Button onClick={() => setDetailModalVisible(false)}>关闭</Button>
          </Space>
        }
      >
        {selectedMessage && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Tag color={getMessageTypeColor(selectedMessage.type)}>
                {typeConfig[selectedMessage.type]?.label}
              </Tag>
              <span className="text-text-tertiary text-sm">
                {dayjs(selectedMessage.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </span>
              {!selectedMessage.isRead && (
                <Badge status="processing" text="未读" />
              )}
            </div>

            <Divider className="my-4" />

            <div className="text-text-primary leading-relaxed">
              {selectedMessage.content}
            </div>

            {selectedMessage.relatedType && (
              <Alert
                message="关联信息"
                description={
                  <div className="flex items-center justify-between">
                    <span>
                      类型：{selectedMessage.relatedType}，ID：{selectedMessage.relatedId}
                    </span>
                    <Button
                      type="link"
                      onClick={() => handleNavigateToRelated(selectedMessage)}
                    >
                      跳转到相关页面
                    </Button>
                  </div>
                }
                type="info"
                showIcon
                className="mt-6"
              />
            )}

            {selectedMessage.readAt && (
              <div className="mt-4 text-text-tertiary text-sm text-right">
                已读时间：{dayjs(selectedMessage.readAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bg-primary-lighter {
          background-color: #f0f8ff !important;
        }
        .ant-list-item {
          border-bottom: none !important;
          padding: 0 !important;
          margin-bottom: 8px !important;
        }
        .ant-list-item-meta {
          margin-bottom: 0 !important;
        }
      `}</style>
    </div>
  );
}
