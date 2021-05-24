export default class PromiseFlow {
  private _tasks: ((args: any) => void)[] = [];
  _context: any = {};

  use(fn) {
    if (typeof fn !== 'function') {
      throw new Error('promise need function to handle');
    }
    this._tasks.push(fn);

    return this;
  }

  handle = async (req) => {
    this._context.request = req;

    let result;

    for (const fn of this._tasks) {
      result = await fn(this._context);
    }

    return result;
  };
}
