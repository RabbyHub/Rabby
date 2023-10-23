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

export const ImportAddress = ({ params }: ConnectProps) => {
  const history = useHistory();
  const addressParams = params.data[0];

  React.useEffect(() => {
    history.replace({
      pathname: '/add-address',
      state: addressParams,
    });
  }, []);

  return null;
};
