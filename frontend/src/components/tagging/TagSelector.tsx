import React, { useState, useEffect } from 'react';
import { Select, Tag, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { taggingService } from '../../services/taggingService';
import type { Tag as TagType } from '../../services/taggingService';

const { Option } = Select;

interface TagSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  maxTags?: number;
  showDescription?: boolean;
  filterByActive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  value = [],
  onChange,
  multiple = true,
  placeholder = 'Select tags',
  allowClear = true,
  disabled = false,
  maxTags,
  showDescription = false,
  filterByActive = true,
  style,
  className,
}) => {
  const [searchValue, setSearchValue] = useState('');

  // Fetch tags based on search
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['tagsSearch', searchValue],
    queryFn: () => taggingService.searchTags(searchValue),
    enabled: searchValue.length > 0,
  });

  // Get initial tags
  const { data: allTags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags', { limit: 100, isActive: filterByActive }],
    queryFn: () => taggingService.getTags({ 
      limit: 100, 
      isActive: filterByActive || undefined 
    }),
  });

  // Get display tags (either from search or all tags)
  const displayTags = searchValue 
    ? searchResults?.data || [] 
    : allTags?.data || [];

  const handleChange = (selectedValues: string | string[]) => {
    if (!multiple && typeof selectedValues === 'string') {
      onChange?.([selectedValues]);
    } else if (Array.isArray(selectedValues)) {
      if (maxTags && selectedValues.length > maxTags) {
        return; // Don't allow exceeding max tags
      }
      onChange?.(selectedValues);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  const loading = tagsLoading || searchLoading;

  return (
    <Select
      mode={multiple ? 'multiple' : undefined}
      style={style}
      className={className}
      placeholder={placeholder}
      value={multiple ? value : value[0]}
      onChange={handleChange}
      onSearch={handleSearch}
      loading={loading}
      disabled={disabled}
      allowClear={allowClear}
      filterOption={false}
      showSearch
      notFoundContent={loading ? <Spin size="small" /> : 'No tags found'}
      maxTagCount={maxTags}
      tagRender={(props) => {
        const tag = displayTags.find(t => t.id === props.value);
        return (
          <Tag
            color={tag?.color || 'default'}
            closable={props.closable}
            onClose={props.onClose}
            style={{ marginRight: 3 }}
          >
            {props.label}
          </Tag>
        );
      }}
    >
      {displayTags.map((tag) => (
        <Option key={tag.id} value={tag.id} label={tag.name}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Tag color={tag.color || 'default'} style={{ marginRight: 8 }}>
                {tag.name}
              </Tag>
              {showDescription && tag.description && (
                <span className="text-gray-500 text-xs ml-2">{tag.description}</span>
              )}
            </div>
            {tag.usageCount !== undefined && (
              <span className="text-gray-400 text-xs">
                Used {tag.usageCount} times
              </span>
            )}
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default TagSelector;