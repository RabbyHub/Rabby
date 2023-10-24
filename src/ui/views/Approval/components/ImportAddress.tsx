import React from 'react';
import { useNavigate } from 'react-router';

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
  const navigate = useNavigate();
  const addressParams = params.data[0];

  React.useEffect(() => {
    navigate('/add-address', {
      state: addressParams,
    });
  }, []);

  return null;
};
