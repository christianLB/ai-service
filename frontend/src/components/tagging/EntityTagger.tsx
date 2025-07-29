import React, { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Tag as AntTag, Space, Select, Button, message, Spin, Tooltip } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taggingService } from '../../services/taggingService';
import type { EntityTag, Tag } from '../../services/taggingService';

const { Option } = Select;

interface EntityTaggerProps {
  entityType: string;
  entityId: string;
  mode?: 'view' | 'edit';
  maxTags?: number;
  onTagsChange?: (tags: EntityTag[]) => void;
  className?: string;
}

export const EntityTagger: React.FC<EntityTaggerProps> = ({
  entityType,
  entityId,
  mode = 'edit',
  maxTags,
  className = '',
}) => {
  const queryClient = useQueryClient();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');

  // Fetch entity tags
  const { data: entityTags, isLoading: tagsLoading } = useQuery({
    queryKey: ['entityTags', entityType, entityId],
    queryFn: () => taggingService.getEntityTags(entityType, entityId),
  });

  // Search available tags
  const { data: availableTags, isLoading: searchLoading } = useQuery({
    queryKey: ['tagsSearch', searchValue],
    queryFn: () => taggingService.searchTags(searchValue),
    enabled: searchValue.length > 0,
  });

  // Get all tags for initial dropdown
  const { data: allTags } = useQuery({
    queryKey: ['tags', { limit: 100, isActive: true }],
    queryFn: () => taggingService.getTags({ limit: 100, isActive: true }),
  });

  // Add tags mutation
  const addTagsMutation = useMutation({
    mutationFn: (tagIds: string[]) => 
      taggingService.tagEntity(entityType, entityId, { tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityTags', entityType, entityId] });
      setSelectedTagIds([]);
      message.success('Tags added successfully');
    },
    onError: () => {
      message.error('Failed to add tags');
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) =>
      taggingService.removeEntityTag(entityType, entityId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityTags', entityType, entityId] });
      message.success('Tag removed');
    },
    onError: () => {
      message.error('Failed to remove tag');
    },
  });

  const handleAddTags = () => {
    if (selectedTagIds.length === 0) {
      message.warning('Please select at least one tag');
      return;
    }

    if (maxTags && entityTags?.data) {
      const currentCount = entityTags.data.length;
      const newCount = currentCount + selectedTagIds.length;
      if (newCount > maxTags) {
        message.warning(`Maximum ${maxTags} tags allowed`);
        return;
      }
    }

    addTagsMutation.mutate(selectedTagIds);
  };

  const handleRemoveTag = (tagId: string) => {
    removeTagMutation.mutate(tagId);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  // Get display tags (either from search or all tags)
  const displayTags = searchValue 
    ? availableTags?.data || [] 
    : allTags?.data || [];

  // Filter out already assigned tags
  const assignedTagIds = entityTags?.data?.map((et: EntityTag) => et.tagId) || [];
  const filteredTags = displayTags.filter((tag: Tag) => !assignedTagIds.includes(tag.id));

  if (tagsLoading) {
    return <Spin size="small" />;
  }

  const currentTags = entityTags?.data || [];

  return (
    <div className={className}>
      {/* Display current tags */}
      <div className="mb-3">
        <Space size={[0, 8]} wrap>
          {currentTags.map((entityTag: EntityTag) => (
            <AntTag
              key={entityTag.tagId}
              color={entityTag.tag?.color || 'default'}
              closable={mode === 'edit'}
              onClose={() => handleRemoveTag(entityTag.tagId)}
              style={{ marginRight: 8, marginBottom: 8 }}
            >
              {entityTag.tag?.name || entityTag.tagId}
              {entityTag.confidence && (
                <Tooltip title={`Confidence: ${Math.round(entityTag.confidence * 100)}%`}>
                  <span className="ml-1 text-xs opacity-70">
                    ({Math.round(entityTag.confidence * 100)}%)
                  </span>
                </Tooltip>
              )}
            </AntTag>
          ))}
          {currentTags.length === 0 && (
            <span className="text-gray-500 text-sm">No tags assigned</span>
          )}
        </Space>
      </div>

      {/* Add tags interface */}
      {mode === 'edit' && (
        <div className="flex gap-2">
          <Select
            mode="multiple"
            style={{ minWidth: 200, flex: 1 }}
            placeholder="Select tags to add"
            value={selectedTagIds}
            onChange={setSelectedTagIds}
            onSearch={handleSearch}
            loading={searchLoading}
            filterOption={false}
            showSearch
            allowClear
          >
            {filteredTags.map((tag: Tag) => (
              <Option key={tag.id} value={tag.id}>
                <AntTag color={tag.color || 'default'} style={{ marginRight: 8 }}>
                  {tag.name}
                </AntTag>
                {tag.description && (
                  <span className="text-gray-500 text-xs">{tag.description}</span>
                )}
              </Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTags}
            loading={addTagsMutation.isPending}
            disabled={selectedTagIds.length === 0}
          >
            Add
          </Button>
        </div>
      )}

      {/* Max tags warning */}
      {maxTags && currentTags.length >= maxTags && (
        <div className="mt-2 text-orange-600 text-sm">
          Maximum {maxTags} tags reached
        </div>
      )}
    </div>
  );
};

export default EntityTagger;