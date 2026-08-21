import {
  getDefaultRateModalState,
  useRateGuidanceStore,
} from '@/ui/state/rateGuidance';

describe('rate guidance store', () => {
  beforeEach(() => {
    useRateGuidanceStore.setState(getDefaultRateModalState());
  });

  test('uses the existing rate modal defaults', () => {
    expect(useRateGuidanceStore.getState()).toMatchObject({
      visible: false,
      userStar: 5,
      userFeedback: '',
      isSubmitting: false,
    });
  });

  test('merges partial modal state updates', () => {
    const { setField } = useRateGuidanceStore.getState();

    setField({ visible: true, userStar: 3 });
    setField({ userFeedback: 'Needs improvement' });
    setField({ isSubmitting: true });

    expect(useRateGuidanceStore.getState()).toMatchObject({
      visible: true,
      userStar: 3,
      userFeedback: 'Needs improvement',
      isSubmitting: true,
    });
  });

  test('creates a fresh default state for each modal reset', () => {
    const first = getDefaultRateModalState();
    first.userFeedback = 'Changed';

    expect(getDefaultRateModalState()).toEqual({
      visible: false,
      userStar: 5,
      userFeedback: '',
      isSubmitting: false,
    });
  });
});
