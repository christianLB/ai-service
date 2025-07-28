import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Spin, Alert, Button, message } from 'antd';
import { TagsOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import TagForm from '../../components/tagging/TagForm';
import { taggingService } from '../../services/taggingService';

const TagEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch tag details
  const { data: tag, isLoading, error } = useQuery({
    queryKey: ['tag', id],
    queryFn: () => taggingService.getTag(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) {
      navigate('/tags');
    }
  }, [id, navigate]);

  const handleSuccess = () => {
    message.success('Tag updated successfully');
    navigate(`/tags/${id}`);
  };

  const handleCancel = () => {
    navigate(`/tags/${id}`);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !tag?.data) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error"
          description="Failed to load tag details. Please try again."
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/tags')}>
              Back to Tags
            </Button>
          }
        />
      </div>
    );
  }

  const tagData = tag.data;

  if (tagData.isSystem) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="System Tag"
          description="System tags cannot be edited."
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => navigate(`/tags/${id}`)}>
              Back to Tag Details
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <PageHeader
        title={`Edit Tag: ${tagData.name}`}
        subTitle="Update tag information"
        onBack={() => navigate(`/tags/${id}`)}
        avatar={{ icon: <TagsOutlined />, style: { backgroundColor: tagData.color || '#1890ff' } }}
        style={{ marginBottom: 24, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      />

      <Card>
        <TagForm
          mode="edit"
          initialValues={tagData}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Card>
    </div>
  );
};

export default TagEdit;