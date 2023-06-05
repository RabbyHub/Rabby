import React from 'react';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';

interface ReceiverData {
  address: string;
}

export interface Props {
  data: ReceiverData;
}

export interface ReceiverPopupProps extends Props {
  type: 'receiver';
}

export const ReceiverPopup: React.FC<Props> = ({ data }) => {
  return <div>ReceiverPopup</div>;
};
