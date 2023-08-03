import { RabbyRootState, RabbyDispatch } from '@/ui/models';
import { onBackgroundStoreChanged } from '../utils/broadcastToUI';

export default (store: typeof import('@/ui/store').default) => {
  const dispatch = store.dispatch as RabbyDispatch;

  onBackgroundStoreChanged('contactBook', (payload) => {
    const state = store.getState() as RabbyRootState;

    const currentAccount = state.account.currentAccount;

    const addr = currentAccount?.address;

    if (addr && payload.partials[addr]) {
      const aliasName = payload.partials[addr]!.name;
      currentAccount.alianName = aliasName;
      dispatch.account.setField({
        alianName: aliasName,
        currentAccount: { ...currentAccount },
      });
    }
  });

  // onBackgroundStoreChanged('preference', (payload) => {
  //   const state = store.getState() as RabbyRootState;
  //   const preference = state.preference;
  // });

  onBackgroundStoreChanged('whitelist', payload => {
    // const state = store.getState() as RabbyRootState;

    if (payload.changedKeys.includes('whitelists')) {
      dispatch.whitelist.setField({
        whitelist: payload.partials.whitelists,
      });
    }

    if (payload.changedKeys.includes('enabled')) {
      dispatch.whitelist.setField({
        enabled: payload.partials.enabled,
      });
    }
  });
};
