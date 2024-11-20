import { RabbyRootState, useRabbyDispatch, useRabbyGetter } from '@/ui/store';
import { useSelector } from 'react-redux';

export const useNewUserGuideStore = () => {
  const store = useSelector((s: RabbyRootState) => s.newUserGuide);

  const dispatch = useRabbyDispatch();

  return {
    store,
    setStore: dispatch.newUserGuide.setState,
  };
};
