import { eth } from 'background/service';
import { jsonFile } from './eth.data';

describe('eth service test', () => {
  test('import JSON file', async () => {
    const data = await eth.importJson(jsonFile.content, jsonFile.password);
    expect(data).toBe('peanut butter');
  });
});
