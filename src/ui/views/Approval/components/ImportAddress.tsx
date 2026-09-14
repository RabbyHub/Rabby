import React from 'react';
import { useHistory } from 'react-router';

interface ConnectProps {
  params: {
    data: [
      {
        type: string;
        address: string;
        chainId: number;
      }
    ];
    session: {
      icon: string;
      name: string;
      origin: string;
    };
  };
}

export const ImportAddress = ({
  params,
  approvalId,
}: ConnectProps & { approvalId?: string }) => {
  const history = useHistory();
  const addressParams = params.data[0];

  React.useEffect(() => {
    history.replace({
      pathname: '/add-address',
      // Spread dApp-controlled addressParams first so our own approvalId (set
      // last) can never be shadowed by an attacker-supplied field of the same
      // name — identity must come from the wallet, never from request params.
      state: { ...addressParams, approvalId },
    });
  }, []);

  return null;
};
