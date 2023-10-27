import React from 'react';

import './style.less';
import { Header } from './components/Header';
import { PrePackInfo } from './components/PrePackInfo';

export const PendingDetail = () => {
  return (
    <div className="page-pending-detail">
      <Header />
      <div className="layout-container mt-[28px]">
        <PrePackInfo />
      </div>
    </div>
  );
};
