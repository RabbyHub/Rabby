import { RabbyRootState, useRabbyDispatch, useRabbyGetter } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { useSelector } from 'react-redux';

export const useNewUserGuideStore = () => {
  const store = useSelector((s: RabbyRootState) => s.newUserGuide);

  const dispatch = useRabbyDispatch();

  const clearStore = useMemoizedFn(() => {
    dispatch.newUserGuide.setState(
      Object.keys(store).reduce((res, key) => {
        res[key] = undefined;
        return res;
      }, {})
    );
  });

  return {
    store,
    setStore: dispatch.newUserGuide.setState,
    clearStore,
  };
};
