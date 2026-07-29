import React from 'react';

import { ReactComponent as RcIconJumpBoldCCSvg } from './jump-bold-cc.svg';

export const RcIconJumpBoldCC = ({
  width = 20,
  height = 20,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <RcIconJumpBoldCCSvg {...props} width={width} height={height} />
);
