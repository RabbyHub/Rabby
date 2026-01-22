import React from 'react';
import { NameAndAddress } from '@/ui/component';

import { RcIconExternalCC, RcIconCopy1CC } from '@/ui/assets/desktop/common';

type Props = Omit<React.ComponentProps<typeof NameAndAddress>, ''>;

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
