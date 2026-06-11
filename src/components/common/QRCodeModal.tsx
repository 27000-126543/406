import React, { useRef } from 'react';
import { Modal, Button, Card, Descriptions, Space, message } from 'antd';
import { DownloadOutlined, PrinterOutlined, CloseOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import type { Device } from '@/types';

interface QRCodeModalProps {
  open: boolean;
  device: Device | null;
  onCancel: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ open, device, onCancel }) => {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!device) return null;

  const qrValue = JSON.stringify({
    id: device.id,
    name: device.name,
    model: device.model,
    serialNumber: device.serialNumber,
    type: device.type,
  });

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `二维码-${device.name}-${device.serialNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success('二维码下载成功');
    } else {
      message.error('下载失败，请重试');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('请允许弹出窗口以进行打印');
      return;
    }

    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) {
      message.error('打印失败，请重试');
      return;
    }

    const imageUrl = canvas.toDataURL('image/png');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>设备二维码 - ${device.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              background: #fff;
            }
            .print-container {
              max-width: 400px;
              margin: 0 auto;
              text-align: center;
            }
            .header {
              margin-bottom: 24px;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              color: #262626;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 14px;
              color: #8c8c8c;
            }
            .qr-wrapper {
              padding: 20px;
              background: #fff;
              border: 2px solid #d9d9d9;
              border-radius: 12px;
              margin: 24px 0;
              display: inline-block;
            }
            .qr-image {
              width: 200px;
              height: 200px;
            }
            .info-section {
              text-align: left;
              margin-top: 24px;
            }
            .info-item {
              display: flex;
              margin-bottom: 12px;
              font-size: 14px;
            }
            .info-label {
              width: 100px;
              color: #8c8c8c;
              flex-shrink: 0;
            }
            .info-value {
              color: #262626;
              font-weight: 500;
              word-break: break-all;
            }
            .footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px dashed #d9d9d9;
              font-size: 12px;
              color: #bfbfbf;
            }
            @media print {
              body {
                padding: 20px;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <div class="title">医疗设备管理系统</div>
              <div class="subtitle">设备二维码</div>
            </div>
            
            <div class="qr-wrapper">
              <img src="${imageUrl}" class="qr-image" alt="设备二维码" />
            </div>
            
            <div class="info-section">
              <div class="info-item">
                <span class="info-label">设备名称：</span>
                <span class="info-value">${device.name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">设备型号：</span>
                <span class="info-value">${device.model}</span>
              </div>
              <div class="info-item">
                <span class="info-label">序列号：</span>
                <span class="info-value">${device.serialNumber}</span>
              </div>
              <div class="info-item">
                <span class="info-label">设备类型：</span>
                <span class="info-value">${device.type}</span>
              </div>
              <div class="info-item">
                <span class="info-label">所在科室：</span>
                <span class="info-value">${device.department}</span>
              </div>
              <div class="info-item">
                <span class="info-label">存放位置：</span>
                <span class="info-value">${device.location}</span>
              </div>
            </div>
            
            <div class="footer">
              扫描二维码查看设备详情 · 医疗设备全生命周期管理系统
            </div>
          </div>
          
          <div class="no-print" style="margin-top: 24px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 32px; background: #1890ff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
              打印二维码
            </button>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
            <span className="text-primary font-bold">Q</span>
          </div>
          <span className="text-lg font-semibold">设备二维码</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={560}
      closeIcon={<CloseOutlined className="text-text-tertiary hover:text-text-primary" />}
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>关闭</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            下载
          </Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            打印
          </Button>
        </div>
      }
      className="animate-scale-in"
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0 flex justify-center">
          <Card
            className="shadow-md border-dashed"
            styles={{
              body: {
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              },
            }}
          >
            <div
              ref={qrRef}
              className="p-4 bg-white rounded-xl border border-border"
              style={{
                transition: 'transform 0.3s ease',
              }}
            >
              <QRCodeCanvas
                value={qrValue}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#1890ff"
              />
            </div>
            <p className="mt-4 text-sm text-text-tertiary text-center">
              扫描二维码查看设备详情
            </p>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Descriptions
            column={1}
            size="small"
            labelStyle={{
              fontWeight: 500,
              color: '#595959',
              width: '100px',
            }}
            contentStyle={{
              color: '#262626',
            }}
          >
            <Descriptions.Item label="设备名称">
              <span className="font-medium">{device.name}</span>
            </Descriptions.Item>
            <Descriptions.Item label="设备型号">
              {device.model}
            </Descriptions.Item>
            <Descriptions.Item label="序列号">
              <span className="font-mono text-sm">{device.serialNumber}</span>
            </Descriptions.Item>
            <Descriptions.Item label="设备类型">
              {device.type}
            </Descriptions.Item>
            <Descriptions.Item label="生产厂家">
              {device.manufacturer}
            </Descriptions.Item>
            <Descriptions.Item label="所在科室">
              {device.department}
            </Descriptions.Item>
            <Descriptions.Item label="存放位置">
              {device.location}
            </Descriptions.Item>
            <Descriptions.Item label="设备状态">
              <Space size={[8, 8]} wrap>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    device.status === 'normal'
                      ? 'bg-success-light text-success'
                      : device.status === 'fault'
                      ? 'bg-error-light text-error'
                      : device.status === 'maintenance'
                      ? 'bg-info-light text-info'
                      : device.status === 'calibrating'
                      ? 'bg-primary-light text-primary'
                      : device.status === 'warning'
                      ? 'bg-warning-light text-warning'
                      : 'bg-bg-tertiary text-text-tertiary'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: 'currentColor',
                    }}
                  />
                  {device.status === 'normal'
                    ? '正常'
                    : device.status === 'fault'
                    ? '故障'
                    : device.status === 'maintenance'
                    ? '维护中'
                    : device.status === 'calibrating'
                    ? '校准中'
                    : device.status === 'warning'
                    ? '已锁定'
                    : '已报废'}
                </span>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </Modal>
  );
};

export default QRCodeModal;
