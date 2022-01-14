import { IconApproval, IconCancel, IconContract, IconSend } from '@/ui/assets';
import React, { memo } from 'react';

interface TxAvatarProps {
  className?: string;
  src?: string | null;
  cateId?: string | null;
}
export const TxAvatar = memo(({ src, cateId, className }: TxAvatarProps) => {
  let img = src;
  if (!img) {
    switch (cateId) {
      case 'receive':
      case 'send':
        img = IconSend;
        break;
      case 'cancel':
        img = IconCancel;
        break;
      case 'approve':
        img = IconApproval;
        break;
      default:
        img = IconContract;
    }
  }
  return <img src={img} alt="" className={className}></img>;
});
