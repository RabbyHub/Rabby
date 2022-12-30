class UnTriggerTxCounter {
  count = 0;

  increase = (n = 1) => {
    this.count += n;
    console.log('increase', this.count);
  };

  reset = () => {
    this.count = 0;
    console.log('reset', this.count);
  };

  decrease = (n = 1) => {
    if (this.count >= n) {
      this.count -= n;
    }
    console.log('decrease', this.count);
  };
}

export default new UnTriggerTxCounter();
