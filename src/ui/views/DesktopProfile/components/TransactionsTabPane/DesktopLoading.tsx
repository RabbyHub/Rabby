import React from 'react';
import { Skeleton } from 'antd';

interface DesktopLoadingProps {
  active?: boolean;
  count?: number;
}

export const DesktopLoading = ({
  count = 1,
  active = false,
}: DesktopLoadingProps) => {
  return (
    <div>
      {new Array(count).fill(null).map((_, index) => {
        return (
          <div
            key={index}
            className="flex h-[100px] items-center border-b-[0.5px] px-16 border-rabby-neutral-line"
          >
            {/* Column 1 - Time and Hash */}
            <div className="w-[180px] flex-shrink-0">
              <Skeleton.Button
                active={active}
                className="h-[13px] mb-2 block"
                style={{ width: 120 }}
              />
              <div className="flex items-center gap-1 mt-1">
                <Skeleton.Avatar
                  active={active}
                  size={16}
                  shape="circle"
                  className="flex-shrink-0"
                />
                <Skeleton.Button
                  active={active}
                  className="h-[13px] block ml-6"
                  style={{ width: 80 }}
                />
              </div>
            </div>

            {/* Column 2 - Transaction Details */}
            <div className="flex-1 min-w-0 mx-4">
              <Skeleton.Button
                active={active}
                className="h-[15px] mb-1 block"
                style={{ width: 200 }}
              />
              <Skeleton.Button
                active={active}
                className="h-[13px] block"
                style={{ width: 150 }}
              />
            </div>

            {/* Column 3 - Token Changes */}
            <div className="flex-1 mx-4">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton.Avatar
                  active={active}
                  size={16}
                  shape="circle"
                  className="flex-shrink-0"
                />
                <Skeleton.Button
                  active={active}
                  className="h-[13px] block"
                  style={{ width: 100 }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton.Avatar
                  active={active}
                  size={16}
                  shape="circle"
                  className="flex-shrink-0"
                />
                <Skeleton.Button
                  active={active}
                  className="h-[13px] block"
                  style={{ width: 80 }}
                />
              </div>
            </div>

            {/* Column 4 - Gas Fee and Status */}
            <div className="w-[200px] flex-shrink-0 text-right">
              <Skeleton.Button
                active={active}
                className="h-[12px] block ml-auto"
                style={{ width: 150 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
