// this script is injected into webpage's context
// so it doesn't export anything
import EventEmitter from 'events';
import { Message } from 'helper';

const { DomMessage } = Message;

class EthereumProvider extends EventEmitter {
  chainId = null;

  constructor() {
    super();

    this.initialize();
  }

  initialize = async () => {
    this.dm = new DomMessage('provider-cs').connect();
    this.dm.on('message', (data) => this.emit('message', data));

    const { accounts, chainId } = this.request({
      method: 'getProviderState',
    });

    this.chainId = chainId;
    this.emit('connected', { chainId });
  }

  isConnected = () => {
    return true;
  }

  request = (args) => {
    console.log('[request: send]', args);
    if (!args) {
      throw new Error('xxxx')
    }

    return this.dm.request(args).then(_ => {
      console.log('[request: resolve]', _)
      return _;
    }).catch(_ => {
      console.log('[request: catch]', _)
      throw _
    });
  }

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
    this.request(payload)
      .then(result => callback(null, { result }))
      .catch(err => callback(err, { error: new Error('reject') }));
  }

}

window.ethereum = new EthereumProvider();



