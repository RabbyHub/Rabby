import compose from 'koa-compose';

type ContextType = Record<string, any>;
type FlowTask<T extends Record<string, any> = Record<string, any>, U = any> = (
  ctx: T,
  next: () => U
) => U;

export default class PromiseFlow<T extends ContextType = ContextType> {
  private _tasks: FlowTask<T>[] = [];
  _context: ContextType = {};
  requestedApproval = false;

  use(fn: FlowTask<T>): PromiseFlow<T> {
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
