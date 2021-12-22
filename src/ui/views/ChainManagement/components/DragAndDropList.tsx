import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChainCard } from 'ui/component';
import { Chain } from 'background/service/chain';

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
        key={item.enum}
        plus={false}
        showIcon={true}
        removeFromPin={removeFromPin}
      />
    </div>
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

  const itemsEven = items.filter((item) => item.index % 2 === 0);
  const itemsOdd = items.filter((item) => item.index % 2 !== 0);

  const onDragEnd = (result) => {
    if (result.source.index === result.destination.index - 1) return;
    const newItems = Array.from(items);
    const [removed] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, removed);
    updateChainSort(newItems);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex p-8">
        <Droppable droppableId="droppableEven">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="w-1/2"
            >
              {itemsEven.map((item) => (
                <Draggable
                  key={item.enum}
                  draggableId={item.enum}
                  index={item.index}
                >
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
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        <Droppable droppableId="droppableOdd">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="w-1/2"
            >
              {itemsOdd.map((item) => (
                <Draggable
                  key={item.enum}
                  draggableId={item.enum}
                  index={item.index}
                >
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
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
};

export default DragAndDropList;
