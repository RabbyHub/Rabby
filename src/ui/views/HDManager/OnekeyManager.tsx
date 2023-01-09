import React from 'react';
import { HDPathType } from './HDPathTypeButton';
import { MainContainer } from './MainContainer';
import { HDManagerStateContext } from './utils';

export const OneKeyManager: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const { getCurrentAccounts, createTask } = React.useContext(
    HDManagerStateContext
  );

  const init = React.useCallback(async () => {
    setLoading(true);
    await createTask(getCurrentAccounts);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    init();
  }, []);

  return (
    <>
      <MainContainer
        setting={{
          startNo: 1,
          type: HDPathType.BIP44,
        }}
        loading={loading}
        HDName="OneKey"
      />
    </>
  );
};
