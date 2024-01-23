import React from 'react';
import { NameAndAddress } from '@/ui/component';

import { ReactComponent as RcIconShare } from '../icons/icon-share-cc.svg';
import { ReactComponent as RcIconCopy } from '../icons/icon-copy-cc.svg';

type Props = Omit<React.ComponentProps<typeof NameAndAddress>, 'copyIcon'>;

export default function ApprovalsNameAndAddr(props: Props) {
  return (
    <NameAndAddress.SafeCopy
      {...props}
      externalIconProps={{
        src: RcIconShare,
        width: 16,
        height: 16,
        className: 'text-r-neutral-foot',
        ...(props.externalIconProps as any),
      }}
      copyIconProps={{
        src: RcIconCopy,
        width: 16,
        height: 16,
        className: 'text-r-neutral-foot',
        ...props.copyIconProps,
      }}
    />
  );
}
