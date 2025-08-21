import React, { useState } from 'react';
import { Card, Button, Space, Tag, Table, Alert, Switch, Tabs } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  setFeatureFlag,
  enableAllOpenAPIHooks,
  disableAllOpenAPIHooks,
} from '../config/feature-flags';

// Import both implementations for comparison
import * as AxiosClientHooks from '../hooks/use-client';
import * as OpenAPIClientHooks from '../hooks/use-client-openapi';

interface TestResult {
  name: string;
  axiosResult: any;
  openAPIResult: any;
  match: boolean;
  error?: string;
}

/**
 * Component for testing the migration from axios to OpenAPI hooks
 * Allows side-by-side comparison and feature flag toggling
 */
export const MigrationTester: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  // Run comparison tests
  const runTests = async () => {
    setTesting(true);
    const results: TestResult[] = [];

    // Test 1: List clients
    try {
      const axiosClients = AxiosClientHooks.useClients({ page: 1, limit: 10 });
      const openAPIClients = OpenAPIClientHooks.useClients({ page: 1, limit: 10 });

      results.push({
        name: 'List Clients',
        axiosResult: axiosClients.data,
        openAPIResult: openAPIClients.data,
        match: JSON.stringify(axiosClients.data) === JSON.stringify(openAPIClients.data),
      });
    } catch (error: any) {
      results.push({
        name: 'List Clients',
        axiosResult: null,
        openAPIResult: null,
        match: false,
        error: error.message,
      });
    }

    setTestResults(results);
    setTesting(false);
  };

  // Feature flag toggles
  const handleFeatureFlagToggle = (flag: keyof typeof FEATURE_FLAGS, checked: boolean) => {
    setFeatureFlag(flag, checked);
    // Force re-render
    window.location.reload();
  };

  const columns = [
    {
      title: 'Feature',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => <code>{key}</code>,
    },
    {
      title: 'Status',
      dataIndex: 'value',
      key: 'status',
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'default'} icon={value ? <CheckCircleOutlined /> : null}>
          {value ? 'ENABLED' : 'DISABLED'}
        </Tag>
      ),
    },
    {
      title: 'Toggle',
      key: 'action',
      render: (_: any, record: { key: string; value: boolean }) => (
        <Switch
          checked={record.value}
          onChange={(checked) => handleFeatureFlagToggle(record.key as keyof typeof FEATURE_FLAGS, checked)}
        />
      ),
    },
  ];

  const flagData = Object.entries(FEATURE_FLAGS).map(([key, value]) => ({
    key,
    value,
  }));

  const testColumns = [
    {
      title: 'Test',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Match',
      dataIndex: 'match',
      key: 'match',
      render: (match: boolean) => (
        <Tag color={match ? 'green' : 'red'} icon={match ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {match ? 'PASS' : 'FAIL'}
        </Tag>
      ),
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      render: (error?: string) => error ? <Tag color="red">{error}</Tag> : '-',
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card title="Migration Tester - Axios to OpenAPI Hooks" style={{ marginBottom: '20px' }}>
        <Alert
          message="Migration Testing Tool"
          description="This tool helps validate the migration from axios-based hooks to OpenAPI-generated hooks. Use it to compare outputs and toggle feature flags."
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />

        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Feature Flags" key="1">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ marginBottom: '20px' }}>
                <Space>
                  <Button type="primary" onClick={enableAllOpenAPIHooks}>
                    Enable All OpenAPI Hooks
                  </Button>
                  <Button onClick={disableAllOpenAPIHooks}>
                    Disable All OpenAPI Hooks
                  </Button>
                </Space>
              </div>

              <Table
                columns={columns}
                dataSource={flagData}
                pagination={false}
                size="small"
              />
            </Space>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Comparison Tests" key="2">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={runTests}
                loading={testing}
              >
                Run Comparison Tests
              </Button>

              {testResults.length > 0 && (
                <Table
                  columns={testColumns}
                  dataSource={testResults}
                  pagination={false}
                  size="small"
                />
              )}
            </Space>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Migration Status" key="3">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert
                message="Week 2 Migration Progress"
                type="warning"
                showIcon
              />
              
              <Card size="small" title="Financial Module">
                <Space direction="vertical">
                  <div>✅ Client hooks migrated</div>
                  <div>✅ Invoice template hooks migrated</div>
                  <div>✅ Accounts hooks migrated (read-only)</div>
                  <div>⏳ Invoice hooks pending</div>
                  <div>⏳ Transaction hooks pending</div>
                </Space>
              </Card>

              <Card size="small" title="Document Management">
                <Space direction="vertical">
                  <div>✅ Attachment hooks migrated (read-only)</div>
                  <div>⏳ Document service hooks pending</div>
                </Space>
              </Card>

              <Card size="small" title="Dashboard & Metrics">
                <Space direction="vertical">
                  <div>⏳ Dashboard hooks pending</div>
                  <div>⏳ Metrics hooks pending</div>
                  <div>⏳ Report hooks pending</div>
                </Space>
              </Card>
            </Space>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};