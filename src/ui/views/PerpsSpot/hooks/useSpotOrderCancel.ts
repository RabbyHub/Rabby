import { useCallback, useRef, useState } from 'react';
import { useSpotActions } from './useSpotActions';

/**
 * Cancels one spot order at a time. The ref is a synchronous lock: state
 * updates land a render late, so a fast double click would otherwise sign two
 * cancels.
 */
export const useSpotOrderCancel = (onCancelled: () => void) => {
  const { cancelSpotOrder } = useSpotActions();
  const [cancellingOid, setCancellingOid] = useState<number | null>(null);
  const lockRef = useRef(false);

  const cancel = useCallback(
    async (pairIndex: number, oid: number) => {
      if (lockRef.current) {
        return;
      }
      lockRef.current = true;
      setCancellingOid(oid);
      try {
        const ok = await cancelSpotOrder({ pairIndex, oid });
        if (ok) {
          onCancelled();
        }
      } finally {
        lockRef.current = false;
        setCancellingOid(null);
      }
    },
    [cancelSpotOrder, onCancelled]
  );

  return { cancel, cancellingOid };
};
