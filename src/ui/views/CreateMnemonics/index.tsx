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
  let node;

  switch (step) {
    case 'risk-check':
      node = <RiskCheck />;
      break;
    case 'display':
      node = <DisplayMnemonic />;
      break;
    case 'verify':
      node = <VerifyMnemonics />;
      break;
    default:
      throw new Error(`[CreateMnemonics] unexpected step ${step}`);
  }

  return <div className="w-screen h-screen bg-gray-bg">{node}</div>;
};

export default connectStore()(CreateMnemonic);
