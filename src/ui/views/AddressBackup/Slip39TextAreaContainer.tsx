import IconCopy from '@/ui/assets/component/icon-copy.svg';
import { Copy } from '@/ui/component';
import React from 'react';

interface Props {
  data: string;
}
export const Slip39TextareaContainer: React.FC<Props> = ({ data }) => {
  const secretShares = React.useMemo(() => data.split('\n'), [data]);

  return (
    <div className="space-y-12">
      {secretShares.map((secretShare) => (
        <div className="relative">
          <div className="private-key" key={secretShare}>
            {secretShare}
          </div>
          <Copy
            icon={IconCopy}
            data={secretShare}
            className="absolute right-12 bottom-12 w-16 h-16"
          ></Copy>
        </div>
      ))}
    </div>
  );
};
