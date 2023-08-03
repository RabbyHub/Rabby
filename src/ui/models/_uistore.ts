import store from '@/ui/store';
import { RabbyRootState, RabbyDispatch } from '@/ui/models';
import { onBackgroundStoreChangedStore } from '../utils/broadcastToUI';

const dispatch = store.dispatch as RabbyDispatch;

onBackgroundStoreChangedStore('contactBook', (payload) => {
  const state = store.getState() as RabbyRootState;
  // console.log('[feat] payload, state', payload, state);

  const currentAccount = state.account.currentAccount;
  state.account.currentAccount?.address;

  const addr = currentAccount?.address;

  if (addr && payload.partials[addr]) {
    // dispatch.account.fetchCurrentAccountAliasNameAsync();
    dispatch.account.setField({
      alianName: payload.partials[addr]!.name,
      currentAccount: { ...currentAccount },
    });
  }
});

onBackgroundStoreChangedStore('preference', (payload) => {
  const state = store.getState() as RabbyRootState;

  console.log('[feat] payload, state', payload, state);
});

export default null;
