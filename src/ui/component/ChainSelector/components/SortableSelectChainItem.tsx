import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';
import { SelectChainItem, SelectChainItemProps } from './SelectChainItem';

export const SortableSelectChainItem = ({
  data,
  className,
  ...rest
}: SelectChainItemProps) => {
  const {
    attributes,
    setNodeRef,
    transform,
    transition,
    listeners,
  } = useSortable({
    id: data?.id + '',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SelectChainItem
      data={data}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
      ref={setNodeRef}
      {...rest}
    ></SelectChainItem>
  );
};
