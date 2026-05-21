import React from 'react';
import clsx from 'clsx';

import type { DetailTabKey } from './DetailSectionUtils';

export const DetailTabs = ({
  activeTab,
  tabs,
  onChange,
}: {
  activeTab: DetailTabKey;
  tabs: Array<{ key: DetailTabKey; label: string }>;
  onChange: (key: DetailTabKey) => void;
}) => (
  <div className={clsx('staking-tabs', tabs.length === 3 && 'is-three')}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        className={clsx(
          'staking-tab-item',
          activeTab === tab.key && 'is-active'
        )}
        onClick={() => onChange(tab.key)}
      >
        {tab.label}
        {activeTab === tab.key ? <span className="staking-tab-line" /> : null}
      </button>
    ))}
  </div>
);

export const BottomActionBar = ({
  disabled,
  onClick,
  showDivider,
  actionRef,
}: {
  disabled?: boolean;
  onClick: () => void;
  showDivider?: boolean;
  actionRef?: React.Ref<HTMLDivElement>;
}) => (
  <div
    ref={actionRef}
    className={clsx('staking-bottom-action', showDivider && 'has-divider')}
  >
    <button
      type="button"
      className="staking-primary-action"
      disabled={disabled}
      onClick={onClick}
    >
      Deposit
    </button>
  </div>
);
