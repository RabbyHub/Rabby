import compose from 'koa-compose';

export default class PromiseFlow {
  private _tasks: ((args: any) => void)[] = [];
  _context: any = {};
  requestedApproval = false;

  use(fn): PromiseFlow {
    if (typeof fn !== 'function') {
      throw new Error('promise need function to handle');
    }
    this._tasks.push(fn);

    return this;
  }

  callback() {
    return compose(this._tasks);
  }
}
