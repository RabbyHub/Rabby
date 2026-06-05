import React, { useEffect, useState } from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useWallet } from 'ui/utils';

export const PrivateRouteGuard = ({ children }) => {
  const wallet = useWallet();
  const location = useLocation();
  const [isBooted, setIsBooted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  // `from` lets Unlock return here instead of the default page.
  const unlockTo = `/unlock?from=${encodeURIComponent(
    location.pathname + location.search
  )}`;
  const to = !isBooted ? '/welcome' : unlockTo;

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const [booted, unlocked] = await Promise.all([
        wallet.isBooted(),
        wallet.isUnlocked(),
      ]);
      if (cancelled) {
        return;
      }
      setIsBooted(booted);
      setIsUnlocked(unlocked);
      setCheckedPath(location.pathname);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, wallet]);

  // Keep children mounted across route switches (keep-alive).
  if (isUnlocked) {
    return children;
  }
  // Wait for a recheck — a stale "locked" right after unlock-nav would bounce back here.
  if (checkedPath !== location.pathname) {
    return <></>;
  }
  // Guards keep running on /unlock; redirecting again would nest `from` and loop.
  if (location.pathname === '/unlock') {
    return <></>;
  }
  return <Redirect to={to} />;
};

const PrivateRoute = ({ children, ...rest }) => {
  return (
    <Route
      {...rest}
      render={() => <PrivateRouteGuard>{children}</PrivateRouteGuard>}
    />
  );
};

export default PrivateRoute;
