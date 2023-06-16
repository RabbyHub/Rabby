class UnTriggerTxCounter {
  count = 0;

  increase = (n = 1) => {
    this.count += n;
  };

  reset = () => {
    this.count = 0;
  };

  decrease = (n = 1) => {
    if (this.count >= n) {
      this.count -= n;
    }
  };
}

export default new UnTriggerTxCounter();
