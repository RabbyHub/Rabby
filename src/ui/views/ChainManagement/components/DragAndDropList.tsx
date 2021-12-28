import React from 'react';
import { DndContext, MeasuringStrategy } from '@dnd-kit/core';
import { DragEndEvent } from '@dnd-kit/core/dist/types';
import { SortableContext } from '@dnd-kit/sortable';
import { ChainCard } from 'ui/component';
import { Chain } from 'background/service/openapi';

import '../style.less';

const ListItem = ({ item, removeFromPin }) => {
  return (
    <ChainCard
      chain={item}
      key={item.enum}
      plus={false}
      showIcon={true}
      removeFromPin={removeFromPin}
    />
  );
};

const DragAndDropList = ({
  pinnedChains,
  removeFromPin,
  updateChainSort,
}: {
  pinnedChains: Chain[];
  removeFromPin(chainName: string): Promise<void>;
  updateChainSort(list: Chain[]): Promise<void>;
}) => {
  const items = pinnedChains.map((item, index) => ({
    ...item,
    index,
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const source = event.active.id;
    const destination = event.over?.id;
    if (!destination || destination === source) return;
    const sourceIndex = items.findIndex(
      (item) => item.id.toString() === source
    );
    const destinationIndex = items.findIndex(
      (item) => item.id.toString() === destination
    );
    const newItems = Array.from(items);
    const [removed] = newItems.splice(sourceIndex, 1);
    newItems.splice(destinationIndex, 0, removed);
    updateChainSort(newItems);
  };

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <SortableContext
        items={items.map((item) => ({ ...item, id: item.id.toString() }))}
      >
        {items
          .map((item) => ({ ...item, id: item.id.toString() }))
          .map((item) => (
            <ListItem item={item} removeFromPin={removeFromPin} />
          ))}
      </SortableContext>
    </DndContext>
  );
};

export default DragAndDropList;
