import React from 'react';
import { hexToUtf8 } from 'web3-utils';

const SignText = ({ params }) => {
  const [hexData, addr] = params;
  const data = hexToUtf8(hexData);

  return <>
    <div>{addr}</div>
    <div className="font-bold mt-12 mb-4">Request for Sign text</div>
    <div className="text-gray">Text detail</div>
    <div className="bg-gray-100 p-2">{data}</div>
  </>
}

export default SignText;
