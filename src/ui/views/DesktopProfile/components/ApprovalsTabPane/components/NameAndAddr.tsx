import React from 'react';
import { NameAndAddress } from '@/ui/component';

import { RcIconExternalCC, RcIconCopy1CC } from '@/ui/assets/desktop/common';

type Props = Omit<React.ComponentProps<typeof NameAndAddress>, ''>;

const DESKTOP_CELL_TEXT =
  'text-r-neutral-title1 text-[14px] leading-[17px] font-normal';

/**
 * How the approvals table styles the name and address in its cells: the
 * desktop profile gives both the cell's text style, the manage-approvals page
 * only recolours the address.
 */
export const getCellNameAndAddrClasses = (isDesktop?: boolean) =>
  isDesktop
    ? { nameClass: DESKTOP_CELL_TEXT, addressClass: DESKTOP_CELL_TEXT }
    : { addressClass: 'text-r-neutral-title1' };

export default function ApprovalsNameAndAddr(props: Props) {
  return (
    <NameAndAddress.SafeCopy
      {...props}
      externalIconProps={{
        src: RcIconExternalCC,
        width: 16,
        height: 16,
        className: 'text-r-neutral-foot',
        ...(props.externalIconProps as any),
      }}
      copyIconProps={{
        src: RcIconCopy1CC,
        width: 16,
        height: 16,
        className: 'text-r-neutral-foot',
        ...props.copyIconProps,
      }}
    />
  );
}
