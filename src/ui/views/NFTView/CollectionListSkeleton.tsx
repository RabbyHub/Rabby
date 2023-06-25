import { Skeleton } from 'antd';
import React from 'react';

export const CollectionListSkeleton: React.FC = () => {
  return (
    <div className="space-y-12">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton.Input
          active
          key={index}
          className="rounded-6px w-full h-[141px]"
        />
      ))}
    </div>
  );
};
