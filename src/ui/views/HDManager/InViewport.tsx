import { useInViewport } from 'ahooks';
import React, { useEffect, useRef } from 'react';

export const InViewport: React.FC<{ callback?(): void }> = ({
  children,
  callback,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inViewport] = useInViewport(ref);
  useEffect(() => {
    if (inViewport) {
      callback?.();
    }
  }, [inViewport]);

  return <div ref={ref}>{children}</div>;
};
