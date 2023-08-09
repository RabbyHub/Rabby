import React from 'react';
import { CommonStatusBar } from './CommonStatusBar';
import { useGridPlusStatus } from './useGridPlusStatus';
import clsx from 'clsx';
import { GridPlusSignal } from './GridPlusSignal';
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();

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
              {connectLoading
                ? t('component.ConnectStatus.connecting')
                : t('component.ConnectStatus.connect')}
            </div>
          )}
        </>
      }
      Content={content}
    />
  );
};
