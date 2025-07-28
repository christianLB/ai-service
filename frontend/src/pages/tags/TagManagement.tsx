import React from 'react';
import { PageHeader } from 'antd';
import { TagsOutlined } from '@ant-design/icons';
import TagList from '../../components/tagging/TagList';

const TagManagement: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <PageHeader
        title="Tag Management"
        subTitle="Manage and organize your tags"
        avatar={{ icon: <TagsOutlined />, style: { backgroundColor: '#1890ff' } }}
        style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      />
      <TagList />
    </div>
  );
};

export default TagManagement;