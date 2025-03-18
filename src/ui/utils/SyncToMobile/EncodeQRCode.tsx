import QRCode from 'qrcode.react';
import React from 'react';
import { UR, UREncoder } from '@ngraveio/bc-ur';

export const EncodeQRCode: React.FC<{
  input: string;
}> = ({ input }) => {
  const urEncoder = React.useMemo(() => new UREncoder(UR.from(input), 200), [
    input,
  ]);
  const [data, setData] = React.useState(urEncoder.nextPart());

  React.useEffect(() => {
    const id = setInterval(() => {
      setData(urEncoder.nextPart());
    }, 100);
    return () => {
      clearInterval(id);
    };
  }, [urEncoder]);

  if (!data) {
    return null;
  }

  return <QRCode value={data} size={200} />;
};
