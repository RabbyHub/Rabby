/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

export abstract class BetterJSON {
  private static parseObject(obj: object): object {
    for (const key of Object.keys(obj)) {
      if (key === 'type' && obj[key] === 'Buffer') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        obj = Buffer.from(obj);
        return obj;
      }

      if (typeof obj[key] === 'object') obj[key] = this.parseObject(obj[key]);
    }

    return obj;
  }

  public static parse<T extends object>(value: string): T {
    let obj: object = JSON.parse(value);
    obj = this.parseObject(obj);

    return obj as T;
  }

  public static stringify(value: object): string {
    return JSON.stringify(value);
  }
}
