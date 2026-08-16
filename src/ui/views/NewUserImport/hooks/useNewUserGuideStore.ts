import { useNewUserGuideStore as useNewUserGuideZustandStore } from '@/ui/state/newUserGuide';

export const useNewUserGuideStore = () => {
  const store = useNewUserGuideZustandStore((state) => state.data);
  const setStore = useNewUserGuideZustandStore((state) => state.setStore);
  const clearStore = useNewUserGuideZustandStore((state) => state.clearStore);

  return {
    store,
    setStore,
    clearStore,
  };
};
