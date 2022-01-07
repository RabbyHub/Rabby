import { ConnectedSite } from '@/background/service/permission';
import {
  DndContext,
  MeasuringStrategy,
  MouseSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core/dist/types';
import { SortableContext } from '@dnd-kit/sortable';
import React, { memo, ReactNode, useState } from 'react';
import { Item, ConnectionItem } from './ConnectionItem';

interface ConnectionProps {
  title: string;
  empty?: ReactNode;
  extra?: ReactNode;
  data?: ConnectedSite[];
  sort?: boolean;
  onSort?(list: ConnectedSite[]): void;
  onClick?(item: ConnectedSite): void;
  onFavoriteChange?(item: ConnectedSite, value: boolean): void;
}

const ConnectionList = memo(
  ({
    data = [],
    onClick,
    onFavoriteChange,
    extra,
    title,
    sort = false,
    onSort,
    empty,
  }: ConnectionProps) => {
    const [activeItem, setActiveItem] = useState<ConnectedSite | null>(null);
    const handleDragStart = (event: DragStartEvent) => {
      const id = event.active?.id;
      if (!id) {
        return;
      }
      const result = data.find((item) => item.origin === id);
      if (result) {
        setActiveItem(result);
      }
    };
    const handleDragEnd = (event: DragEndEvent) => {
      setActiveItem(null);
      if (!onSort) {
        return;
      }
      const source = event.active.id;
      const destination = event.over?.id;
      if (!destination || destination === source) return;
      const sourceIndex = data.findIndex((item) => item.origin === source);
      const destinationIndex = data.findIndex(
        (item) => item.origin === destination
      );
      const newItems = Array.from(data);
      const [removed] = newItems.splice(sourceIndex, 1);
      newItems.splice(destinationIndex, 0, removed);
      onSort(newItems.map((item, index) => ({ ...item, order: index })));
    };
    const handleDragCancel = () => {
      setActiveItem(null);
    };
    const sensors = useSensors(
      useSensor(MouseSensor, {
        activationConstraint: {
          distance: 3,
        },
      })
    );
    return (
      <div className="list">
        <div className="list-header">
          <div className="list-title">{title}</div>
          <div className="list-extra">{extra}</div>
        </div>
        {data && data.length > 0 ? (
          <div className="list-content droppable">
            <DndContext
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              sensors={sensors}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            >
              <SortableContext
                items={data.map((item) => ({ ...item, id: item.origin }))}
              >
                {data.map((item, index) => (
                  <ConnectionItem
                    sort={sort}
                    item={item}
                    key={item?.origin || index}
                    onFavoriteChange={(v) =>
                      onFavoriteChange && onFavoriteChange(item, v)
                    }
                    onClick={() => onClick && onClick(item)}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeItem && (
                  <Item item={activeItem} className="is-overlay"></Item>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          <div className="list-empty">{empty}</div>
        )}
      </div>
    );
  }
);

export default ConnectionList;
