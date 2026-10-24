import { describe, expect, it } from 'vitest';
import { generateAccountKey, unwrapKey, wrapKey } from './keyring';
import { generateTreeKey } from './treefile';

describe('key wrapping', () => {
  it('opens with the account key and the same context only', async () => {
    const account = generateAccountKey();
    const tree = generateTreeKey();
    const sealed = await wrapKey(tree, account, 'tree-1');
    expect(sealed).not.toContain(tree);
    expect(await unwrapKey(sealed, account, 'tree-1')).toBe(tree);
    await expect(unwrapKey(sealed, generateAccountKey(), 'tree-1')).rejects.toThrow();
    await expect(unwrapKey(sealed, account, 'tree-2')).rejects.toThrow();
  });
});
