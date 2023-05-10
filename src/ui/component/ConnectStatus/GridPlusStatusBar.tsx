import React from 'react';
import { CommonStatusBar } from './CommonStatusBar';
import { useGridPlusStatus } from './useGridPlusStatus';
import clsx from 'clsx';
import { GridPlusSignal } from './GridPlusSignal';

interface Props {
  className?: string;
}

export const GridPlusStatusBar: React.FC<Props> = ({ className }) => {
  const {
    status,
    content,
    onClickConnect,
    connectLoading,
  } = useGridPlusStatus();

  return (
    <CommonStatusBar
      Signal={<GridPlusSignal size="small" />}
      className={className}
      onClickButton={onClickConnect}
      ButtonText={
        <>
          {status === 'DISCONNECTED' && (
            <div
              className={clsx({
                'opacity-60': connectLoading,
                underline: !connectLoading,
              })}
            >
              {connectLoading ? 'Connecting...' : 'Connect'}
            </div>
          )}
        </>
      }
      Content={content}
    />
  );
};
