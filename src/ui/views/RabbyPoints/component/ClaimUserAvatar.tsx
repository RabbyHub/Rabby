import clsx from 'clsx';
import React from 'react';
import defaultAvatar from 'ui/assets/rabby-points/default-avatar.png';

export const ClaimUserAvatar = (
  props: React.DetailedHTMLProps<
    React.ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  >
) => {
  return (
    <img
      {...props}
      className={clsx('rounded-full', props.className)}
      src={props.src || defaultAvatar}
    />
  );
};
