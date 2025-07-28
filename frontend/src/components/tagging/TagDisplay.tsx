import React from 'react';
import { Tag, Space, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  RobotOutlined, 
  EditOutlined,
  UploadOutlined 
} from '@ant-design/icons';
import type { EntityTag } from '../../services/taggingService';

interface TagDisplayProps {
  tags: EntityTag[];
  showSource?: boolean;
  showConfidence?: boolean;
  size?: 'small' | 'default' | 'large';
  maxDisplay?: number;
  onTagClick?: (tag: EntityTag) => void;
  className?: string;
}

const sourceIcons = {
  manual: <EditOutlined />,
  ai: <RobotOutlined />,
  rule: <CheckCircleOutlined />,
  import: <UploadOutlined />,
};

const sourceLabels = {
  manual: 'Manually added',
  ai: 'AI suggested',
  rule: 'Rule-based',
  import: 'Imported',
};

export const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  showSource = false,
  showConfidence = false,
  size = 'default',
  maxDisplay,
  onTagClick,
  className = '',
}) => {
  const displayTags = maxDisplay && tags.length > maxDisplay 
    ? tags.slice(0, maxDisplay)
    : tags;
  
  const remainingCount = maxDisplay && tags.length > maxDisplay 
    ? tags.length - maxDisplay
    : 0;

  const getTagSize = () => {
    switch (size) {
      case 'small':
        return { fontSize: '12px', padding: '0 6px' };
      case 'large':
        return { fontSize: '16px', padding: '2px 12px' };
      default:
        return {};
    }
  };

  const renderTag = (entityTag: EntityTag) => {
    const tagElement = (
      <Tag
        key={entityTag.tagId}
        color={entityTag.tag?.color || 'default'}
        icon={showSource ? sourceIcons[entityTag.source] : undefined}
        style={{ 
          ...getTagSize(),
          cursor: onTagClick ? 'pointer' : 'default',
          marginRight: 8,
          marginBottom: 4,
        }}
        onClick={() => onTagClick?.(entityTag)}
      >
        {entityTag.tag?.name || entityTag.tagId}
        {showConfidence && entityTag.confidence && (
          <span className="ml-1 opacity-70">
            {Math.round(entityTag.confidence * 100)}%
          </span>
        )}
      </Tag>
    );

    if (showSource || (showConfidence && entityTag.confidence)) {
      const tooltipContent = (
        <div>
          {showSource && (
            <div>Source: {sourceLabels[entityTag.source]}</div>
          )}
          {showConfidence && entityTag.confidence && (
            <div>Confidence: {Math.round(entityTag.confidence * 100)}%</div>
          )}
          {entityTag.metadata && Object.keys(entityTag.metadata).length > 0 && (
            <div className="mt-1">
              <div className="font-semibold">Metadata:</div>
              {Object.entries(entityTag.metadata).map(([key, value]) => (
                <div key={key} className="text-xs">
                  {key}: {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      );

      return (
        <Tooltip key={entityTag.tagId} title={tooltipContent}>
          {tagElement}
        </Tooltip>
      );
    }

    return tagElement;
  };

  return (
    <div className={className}>
      <Space size={[0, 8]} wrap>
        {displayTags.map(renderTag)}
        {remainingCount > 0 && (
          <Tag style={getTagSize()}>
            +{remainingCount} more
          </Tag>
        )}
      </Space>
    </div>
  );
};

export default TagDisplay;