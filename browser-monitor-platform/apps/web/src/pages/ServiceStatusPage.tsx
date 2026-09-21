import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Statistic, Table, Tag } from 'antd';
import { useParams } from 'react-router-dom';

import { api } from '../api/client';
import { PageHeading } from '../components/PageHeading';

interface ServiceStatus {
  pending: number;
  processing: number;
  failed: number;
  processedLastMinute: number;
  deadLetters: number;
  accepted: number;
  duplicate: number;
  rejected: number;
}

export function ServiceStatusPage() {
  const { projectId = '' } = useParams();
  const status = useQuery({
    queryKey: ['service-status', projectId],
    queryFn: () => api<ServiceStatus>(`/api/v1/projects/${projectId}/analytics/service-status`),
    refetchInterval: 15_000,
  });
  const data = status.data;
  const unhealthy = (data?.failed ?? 0) > 0 || (data?.deadLetters ?? 0) > 0;
  const queueRows = data ? [
    { status: 'pending', count: data.pending },
    { status: 'processing', count: data.processing },
    { status: 'failed', count: data.failed },
    { status: 'dead-letter', count: data.deadLetters },
  ] : [];

  return (
    <>
      <PageHeading title="服务状态" description="采集接收、Outbox 积压和 Worker 失败情况，每 15 秒刷新。" />
      <Alert
        type={unhealthy ? 'warning' : 'success'}
        showIcon
        message={unhealthy ? '存在待处理失败任务，请检查 Worker 日志或重新执行死信。' : '采集与处理链路运行正常。'}
      />
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="累计接收" value={data?.accepted ?? 0} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="重复事件" value={data?.duplicate ?? 0} prefix={<InboxOutlined />} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="拒绝事件" value={data?.rejected ?? 0} prefix={<CloseCircleOutlined />} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="最近一分钟处理" value={data?.processedLastMinute ?? 0} prefix={<ClockCircleOutlined />} /></Card></Col>
        <Col span={24}><Card title="Outbox 状态"><Table loading={status.isLoading} pagination={false} rowKey="status" dataSource={queueRows} columns={[
          { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={value === 'failed' || value === 'dead-letter' ? 'red' : value === 'processing' ? 'blue' : 'default'}>{value}</Tag> },
          { title: '任务数', dataIndex: 'count' },
        ]} /></Card></Col>
      </Row>
    </>
  );
}
