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
import clsx from 'clsx';
import React, { memo, ReactNode, useEffect, useState } from 'react';
import { Item, ConnectionItem } from './ConnectionItem';

interface ConnectionProps {
  className?: string;
  title: string;
  empty?: ReactNode;
  extra?: ReactNode;
  data?: ConnectedSite[];
  sortable?: boolean;
  onSort?(list: ConnectedSite[]): void;
  onClick?(item: ConnectedSite): void;
  onFavoriteChange?(item: ConnectedSite, value: boolean): void;
  onRemove?(origin: string): void;
}

const ConnectionList = memo(
  ({
    className,
    data = [],
    onClick,
    onFavoriteChange,
    extra,
    title,
    sortable = false,
    onSort,
    onRemove,
    empty,
  }: ConnectionProps) => {
    const [activeItem, setActiveItem] = useState<ConnectedSite | null>(null);
    const [visible, setVisible] = useState(false);
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
    useEffect(() => {
      setTimeout(() => {
        setVisible(true);
      });
    }, []);
    return (
      <div className={clsx('list', className)}>
        <div className="list-header">
          <div className="list-title">{title}</div>
          <div className="list-extra">{extra}</div>
        </div>
        {visible && data && data.length > 0 ? (
          <div className="list-content droppable">
            {sortable ? (
              <DndContext
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                sensors={sensors}
                measuring={{
                  droppable: { strategy: MeasuringStrategy.Always },
                }}
              >
                <SortableContext
                  items={data.map((item) => ({ ...item, id: item.origin }))}
                >
                  {data.map((item, index) => (
                    <ConnectionItem
                      onRemove={onRemove}
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
            ) : (
              <>
                {data.map((item, index) => (
                  <Item
                    onRemove={onRemove}
                    item={item}
                    key={item?.origin || index}
                    onFavoriteChange={(v) =>
                      onFavoriteChange && onFavoriteChange(item, v)
                    }
                    onClick={() => onClick && onClick(item)}
                  />
                ))}
              </>
            )}
          </div>
        ) : (
          empty
        )}
      </div>
    );
  }
);

export default ConnectionList;
