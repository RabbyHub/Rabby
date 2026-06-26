import { Image } from 'antd';
import IconUnknown from '@/ui/assets/token-default.svg';
import React from 'react';
import { ReactComponent as RcIconLong } from 'ui/assets/perps/IconLong.svg';
import { ReactComponent as RcIconShort } from 'ui/assets/perps/IconShort.svg';

interface TokenImgProps {
  logoUrl?: string;
  withDirection?: boolean;
  direction?: 'Long' | 'Short';
  size?: number;
}

export const TokenImg = ({
  logoUrl,
  size = 32,
  direction,
  withDirection = false,
}: TokenImgProps) => {
  return (
    <div className="relative flex">
      {/* bg-white keeps transparent / dark icons visible on the dark UI.
          Mask (not border-radius) shapes the circle: Chromium doesn't
          anti-alias border-radius on a composited <img> → jagged edges. */}
      <Image
        className={`w-${size} h-${size} rounded-full bg-white`}
        style={{
          WebkitMaskImage:
            'radial-gradient(circle closest-side, #000 calc(100% - 1px), transparent 100%)',
          maskImage:
            'radial-gradient(circle closest-side, #000 calc(100% - 1px), transparent 100%)',
        }}
        src={logoUrl || IconUnknown}
        fallback={IconUnknown}
        preview={false}
      />
      {withDirection && (
        <div
          className={`absolute bottom-[-4px] right-[-4px] w-${size / 2} h-${
            size / 2
          }`}
        >
          {direction === 'Long' ? <RcIconLong /> : <RcIconShort />}
        </div>
      )}
    </div>
  );
};
