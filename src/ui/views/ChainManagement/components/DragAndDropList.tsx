import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChainCard } from 'ui/component';

import '../style.less';
const ListItem = ({ item, provided, snapshot, removeFromPin }) => {
  return (
    <div
      ref={provided.innerRef}
      snapshot={snapshot}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
    >
      <ChainCard
        chain={item}
        key={item.id}
        plus={false}
        showIcon={true}
        removeFromPin={removeFromPin}
      />
    </div>
  );
};
const DragAndDropList = ({ pinnedChains, removeFromPin, updateChainSort }) => {
  const items = pinnedChains.map((item) => ({
    ...item,
    id: item.enum,
  }));
  const onDragEnd = (result) => {
    const newItems = Array.from(items);
    const [removed] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, removed);
    updateChainSort(newItems);
  };
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="droppable" direction="horizontal">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex flex-wrap p-8"
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <ListItem
                    provided={provided}
                    snapshot={snapshot}
                    item={item}
                    removeFromPin={removeFromPin}
                  />
                )}
              </Draggable>
            ))}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default DragAndDropList;
