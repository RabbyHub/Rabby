import React from 'react';
import Popup from '../Popup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

export interface Props {
  token: TokenItem;
}

export const TokenDetail: React.FC<Props> = ({ children }) => {
  return <Popup>123</Popup>;
};
