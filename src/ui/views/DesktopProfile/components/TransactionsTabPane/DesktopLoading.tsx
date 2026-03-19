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
            className="flex h-[100px] items-center border-b-[0.5px]  border-rabby-neutral-line"
          >
            {/* Column 1 - Time and Hash */}
            <div className="min-w-[230px] flex-shrink-0 w-[25%]">
              <Skeleton.Button
                active={active}
                className="h-[13px] mb-[6px] block"
                style={{ width: 120 }}
              />
              <div className="flex items-center gap-[6px] mt-1">
                <Skeleton.Avatar
                  active={active}
                  size={16}
                  shape="circle"
                  className="flex-shrink-0"
                />
                <Skeleton.Button
                  active={active}
                  className="h-[14px] block"
                  style={{ width: 80 }}
                />
              </div>
            </div>

            {/* Column 2 - Transaction Details */}
            <div className="flex-[2] min-w-0 mx-4 w-[25%]">
              <Skeleton.Button
                active={active}
                className="h-[14px] mb-[6px] block"
                style={{ width: 200 }}
              />
              <Skeleton.Button
                active={active}
                className="h-[14px] block"
                style={{ width: 150 }}
              />
            </div>

            {/* Column 3 - Token Changes */}
            <div className="flex-[2] min-w-0 mx-4 w-[25%]">
              <div className="flex items-center justify-end gap-[6px] mb-[6px]">
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
              <div className="flex items-center justify-end gap-[6px]">
                <Skeleton.Avatar
                  active={active}
                  size={16}
                  shape="circle"
                  className="flex-shrink-0"
                />
                <Skeleton.Button
                  active={active}
                  className="h-[14px] block"
                  style={{ width: 80 }}
                />
              </div>
            </div>

            {/* Column 4 - Gas Fee and Status */}
            <div className="min-w-[250px] flex-shrink-0 text-right w-[25%]">
              <Skeleton.Button
                active={active}
                className="h-[14px] block ml-auto"
                style={{ width: 150 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
