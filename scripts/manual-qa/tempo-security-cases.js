/*
 * Paste into the console of a normal HTTP(S) page with the patched Rabby loaded.
 * Pasting only installs helpers. Run await tempoGate.connect(), then open ONE case.
 * open() uses eth_sendTransaction: final wallet confirmation CAN broadcast.
 * Inspect the approval and CANCEL it. See tempo-security-cases.md.
 */
(() => {
  const chainId = '0x1079';
  const token = '0x20c0000000000000000000000000000000000000';
  const otherToken = '0x20c000000000000000000000b9537d11c60e8b50';
  const spenderA = '0x000000000000000000000000000000000000dead';
  const spenderB = '0x000000000000000000000000000000000000beef';
  const encode = (selector, address) =>
    selector + address.slice(2).padStart(64, '0') + '1'.padStart(64, '0');
  const call = (selector, address) => ({
    to: token,
    value: '0x0',
    data: encode(selector, address),
  });
  const approve = (address) => call('0x095ea7b3', address);
  const transfer = (address) => call('0xa9059cbb', address);
  const provider = () => {
    const candidates = [
      window.rabby,
      ...(window.ethereum?.providers || []),
      window.ethereum,
    ];
    const rabby = candidates.find((item) => item?.isRabby || item?._isRabby);
    if (!rabby) throw new Error('Rabby provider not found. Reload this page with Rabby enabled.');
    return rabby;
  };
  const build = (name, from) => {
    const base = { from, chainId, type: '0x76', feeToken: token };
    if (name === 'single') return { ...base, ...approve(spenderA) };
    if (name === 'double') return { ...base, calls: [approve(spenderA), approve(spenderB)] };
    if (name === 'transfers') return { ...base, calls: [transfer(token), transfer(otherToken)] };
    throw new Error('Unknown case. Use single, double, or transfers.');
  };
  let pending = false;
  window.tempoGate = {
    token,
    spenderA,
    spenderB,
    async connect() {
      const rabby = provider();
      const accounts = await rabby.request({ method: 'eth_requestAccounts' });
      await rabby.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
      console.log('Tempo mainnet connected. Use a dedicated mnemonic/private-key test account.', accounts);
      return accounts;
    },
    async preview(name) {
      const [from] = await provider().request({ method: 'eth_accounts' });
      if (!from) throw new Error('Run await tempoGate.connect() first.');
      const tx = build(name, from);
      console.log(JSON.stringify(tx, null, 2));
      return tx;
    },
    async open(name) {
      if (pending) throw new Error('Cancel the current approval before opening another case.');
      pending = true;
      try {
        const rabby = provider();
        const currentChain = await rabby.request({ method: 'eth_chainId' });
        if (BigInt(currentChain) !== BigInt(chainId)) throw new Error('Switch this site to Tempo mainnet first.');
        const tx = await this.preview(name);
        console.warn('Inspect risks, then CANCEL. Final confirmation can broadcast this mainnet transaction.');
        const hash = await rabby.request({ method: 'eth_sendTransaction', params: [tx] });
        console.warn('Transaction was submitted; this was not a simulation-only request.', hash);
        return hash;
      } catch (error) {
        if (Number(error?.code) === 4001) {
          console.log('Approval cancelled as expected.');
          return null;
        }
        throw error;
      } finally {
        pending = false;
      }
    },
  };
  console.log('tempoGate ready. No wallet request has been sent. Cases: single, double, transfers.');
})();
