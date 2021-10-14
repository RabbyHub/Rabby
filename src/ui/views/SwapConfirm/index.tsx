import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';

const SwapConfirm = () => {
  const { state } = useLocation<{
    keyring: string;
    isMnemonics?: boolean;
    isWebUSB?: boolean;
    path?: string;
    keyringId?: number | null;
  }>();

  return (
    <div className="swapConfirm">
      <div></div>
    </div>
  );
};

export default SwapConfirm;
