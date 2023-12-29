import { ConnectedSite } from '@/background/service/permission';
import clsx from 'clsx';
import React, { ReactNode, memo, useEffect, useState } from 'react';
import { Item } from './ConnectionItem';

interface ConnectionProps {
  className?: string;
  empty?: ReactNode;
  data?: ConnectedSite[];
  onClick?(item: ConnectedSite): void;
  onRemove?(origin: string): void;
}

const ConnectionList = memo(
  ({ className, data = [], onClick, onRemove, empty }: ConnectionProps) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      setTimeout(() => {
        setVisible(true);
      });
    }, []);
    return (
      <div className={clsx('list', className)}>
        {visible && data && data.length > 0 ? (
          <div className="list-content droppable">
            <>
              {data.map((item, index) => (
                <Item
                  onRemove={onRemove}
                  item={item}
                  key={item?.origin || index}
                  onClick={() => onClick && onClick(item)}
                />
              ))}
            </>
          </div>
        ) : (
          empty
        )}
      </div>
    );
  }
);

export default ConnectionList;
