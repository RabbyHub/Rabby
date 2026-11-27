import { useCallback } from 'react';

import { ContractApprovalItem, AssetApprovalSpender } from '@/utils/approval';
import { HandleClickTableRow } from './Table';
import { appIsDev } from '@/utils/env';
import { detectClientOS } from '@/ui/utils/os';
import { EIP7702Delegated } from '../useEIP7702Approvals';

const IS_WINDOWS = detectClientOS() === 'win32';
export function useInspectRowItem<
  T extends ContractApprovalItem | AssetApprovalSpender | EIP7702Delegated
>(origOnClickRow?: HandleClickTableRow<T>) {
  // const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const onClickRowInspection: HandleClickTableRow<T> = useCallback(
    (ctx) => {
      if (
        (IS_WINDOWS && ctx.event.ctrlKey && ctx.event.altKey) ||
        (!IS_WINDOWS &&
          (ctx.event.metaKey || ctx.event.ctrlKey) &&
          ctx.event.altKey)
      ) {
        console.debug(ctx.record);
      }

      // if (appIsDev) {
      //   if (ctx.event.ctrlKey) {
      //     setSelectedRow(ctx.record);
      //     return;
      //   }
      // }

      return origOnClickRow?.(ctx);
    },
    [origOnClickRow]
  );

  // const onModalCancel = useCallback(() => {
  //   setSelectedRow(null);
  // }, []);

  return {
    // selectedRow,
    // onModalCancel,
    onClickRowInspection: onClickRowInspection,
  };
}
