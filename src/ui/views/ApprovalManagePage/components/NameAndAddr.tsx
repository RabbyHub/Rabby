import React from 'react';
import { NameAndAddress } from '@/ui/component';

import IconCopy from '../icons/icon-copy.svg';

type Props = Omit<React.ComponentProps<typeof NameAndAddress>, 'copyIcon'>;

export default function ApprovalsNameAndAddr(props: Props) {
  return <NameAndAddress.SafeCopy {...props} copyIcon={IconCopy} />;
}
