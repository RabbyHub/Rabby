import React from 'react';

import {
  connectStore,
  useRabbyDispatch,
  useRabbySelector,
  useRabbyGetter,
} from 'ui/store';

import RiskCheck from './RiskCheck';
import DisplayMnemonic from './DisplayMnemonic';
import VerifyMnemonics from './VerifyMnemonics';

const CreateMnemonic = () => {
  const step = useRabbySelector((s) => s.createMnemonics.step);

  const dispatch = useRabbyDispatch();
  React.useEffect(() => {
    dispatch.createMnemonics.getAllHDKeyrings();
  }, []);

  switch (step) {
    case 'risk-check':
      return <RiskCheck />;
    case 'display':
      return <DisplayMnemonic />;
    case 'verify':
      return <VerifyMnemonics />;
    default:
      throw new Error(`[CreateMnemonics] unexpected step ${step}`);
  }
};

export default connectStore()(CreateMnemonic);
