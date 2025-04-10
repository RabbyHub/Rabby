import clsx from 'clsx';
import dayjs from 'dayjs';
import React from 'react';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export type TabKey = typeof TIME_TAB_LIST[number]['key'];

export const TIME_TAB_LIST = [
  {
    label: '1D',
    key: '24h' as const,
    value: [0, dayjs()],
  },
  {
    label: '1W',
    key: '1W' as const,
    value: [dayjs().add(-7, 'd'), dayjs()],
  },
  {
    label: '1M',
    key: '1M' as const,
    value: [dayjs().add(-1, 'month'), dayjs()],
  },
  {
    label: '1Y',
    key: '1Y' as const,
    value: [dayjs().add(-1, 'year'), dayjs()],
  },
].map((item) => {
  const v0 = item.value[0];
  const v1 = item.value[1];

  return {
    ...item,
    value: [
      typeof v0 === 'number' ? v0 : v0.utcOffset(0).startOf('day').unix(),
      typeof v1 === 'number' ? v1 : v1.utcOffset(0).startOf('day').unix(),
    ],
  };
});

export const REAL_TIME_TAB_LIST: TabKey[] = ['24h', '1W'];

export const TimeTab = ({
  activeKey,
  onSelect,
}: {
  activeKey: TabKey;
  onSelect: (key: TabKey) => void;
}) => {
  return (
    <div className="flex items-center">
      {TIME_TAB_LIST.map((e) => (
        <div
          key={e.key}
          onClick={() => {
            onSelect(e.key);
          }}
          className={clsx(
            'flex-1 flex items-center justify-center h-24 rounded-[6px] cursor-pointer',
            'text-12 font-medium text-r-neutral-body',
            activeKey === e.key && 'bg-r-neutral-card2'
          )}
        >
          {e.label}
        </div>
      ))}
    </div>
  );
};
