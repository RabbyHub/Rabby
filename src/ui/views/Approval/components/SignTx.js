import { CHAINS } from 'constants';

const SignTx = ({ params, origin }) => {
  const [{ chainId, data, from, gas, gasPrice, nonce, to, value }] = params;
  const chain = CHAINS[chainId]?.name;

  return (
    <>
      <div>{origin}</div>
      <div className="font-bold mt-12 mb-4 text-lg">
        Request for Sign Transaction
      </div>
      <div className="text-xs text-gray-400 mb-1">On the chain</div>
      <div className="bg-gray-100 p-2 text-bold">{chain}</div>

      <div className="text-xs text-gray-400 mb-1">
        Interact with the address
      </div>
      <div className="bg-gray-100 p-2">{to}</div>

      <div className="text-xs text-gray-400 mb-1">Transaction detail</div>
      <div className="bg-gray-100 p-2">
        <div className="flex items-center">
          <div>data</div>
          <div className="flex-1 break-all">{data}</div>
        </div>
        <div className="flex items-center">
          <div>nonce</div>
          <div className="flex-1">{nonce}</div>
        </div>
        <div className="flex items-center">
          <div>value</div>
          <div className="flex-1">{value}</div>
        </div>
      </div>

      <div className="bg-gray-100 p-2 flex items-center mb-12">
        <div>Est.gas</div>
        <div className="flex-1">{gas}</div>
      </div>
    </>
  );
};

export default SignTx;
