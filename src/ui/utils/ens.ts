import axios from 'axios';

/**
 * InvalidResponseError helper for invalid errors.
 */
function invalidResponseError(result, host) {
  const message =
    !!result && !!result.error && !!result.error.message
      ? `[ethjs-provider-http] ${result.error.message}`
      : `[ethjs-provider-http] Invalid JSON RPC response from host provider ${host}: ${JSON.stringify(
          result,
          null,
          2
        )}`;
  return new Error(message);
}

class HttpProvider {
  host = 'https://openapi.debank.com/v1/wallet/eth_rpc';
  timeout = 0;

  constructor(host?: string, timeout = 0) {
    if (typeof host !== 'string') {
      throw new Error(
        '[ethjs-provider-http] the HttpProvider instance requires that the host be specified (e.g. `new HttpProvider("http://localhost:8545")` or via service like infura `new HttpProvider("http://ropsten.infura.io")`)'
      );
    }
    this.host = host;
    this.timeout = timeout || 0;
  }

  sendAsync = async (payload, callback) => {
    // eslint-disable-line
    const request = axios.create({
      baseURL: this.host,
      timeout: this.timeout,
    });

    try {
      const { data } = await request.post(
        this.host,
        {
          chain_id: 'eth',
          method: 'eth_call',
          params: payload.params,
        },
        {
          params: {
            origin: 'rabby',
            method: 'eth_call',
          },
        }
      );
      callback(null, data);
    } catch (e) {
      callback(e);
    }
  };
}

export default HttpProvider;
