import { useWallet } from '@/ui/utils';
import { useMount } from 'ahooks';
import React from 'react';
import { useHistory } from 'react-router-dom';
import SelectAddress from '../SelectAddress';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';

export const NewUserSelectAddress = () => {
  const { store } = useNewUserGuideStore();

  const history = useHistory();

  const wallet = useWallet();

  useMount(async () => {
    if (!store.password) {
      history.replace('/new-user/guide');
    }
    if (await wallet.isBooted()) {
      window.close();
    }
  });

  return <SelectAddress />;
};
