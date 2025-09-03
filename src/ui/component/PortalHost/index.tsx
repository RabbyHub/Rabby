import React from 'react';
import { createPortal } from 'react-dom';
import { portalController } from './PortalController';

export const PortalHost: React.FC = React.memo(() => {
  const [, force] = React.useState(0);

  React.useEffect(() => {
    portalController.subscribe(() => {
      force((x) => x + 1);
    });
  }, []);

  const items = portalController.snapshot();

  return <>{items.map((it) => createPortal(it.element, it.container))}</>;
});
