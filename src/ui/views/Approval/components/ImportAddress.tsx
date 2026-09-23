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
      // addressParams first so an attacker-supplied field of the same name can't shadow our own approvalId.
      state: { ...addressParams, approvalId },
    });
  }, []);

  return null;
};
