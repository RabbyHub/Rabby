import React, { useEffect, useState } from 'react';

interface I_CustomSuspense {
  delay: number;
  fallback: React.ReactNode;
  children: React.ReactNode;
}

export default function CustomSuspense(props: I_CustomSuspense) {
  const { children, delay, fallback } = props;
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsShown(true);
    }, delay);
  }, [delay]);

  return isShown ? children : fallback;
}
