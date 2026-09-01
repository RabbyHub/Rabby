import { resolveNftDisplayMedia } from '@/ui/utils/nft';

describe('resolveNftDisplayMedia', () => {
  it('uses NFT media when it is available', () => {
    expect(
      resolveNftDisplayMedia(
        {
          content: 'https://cdn.example/nft.png',
          content_type: 'image_url',
        },
        { logo_url: 'https://cdn.example/collection.png' }
      )
    ).toEqual({
      content: 'https://cdn.example/nft.png',
      type: 'image_url',
    });
  });

  it('uses the collection logo as an image fallback when NFT media is absent', () => {
    expect(
      resolveNftDisplayMedia(
        {
          content: '',
          content_type: null,
        },
        { logo_url: 'https://cdn.example/collection.png' }
      )
    ).toEqual({
      content: 'https://cdn.example/collection.png',
      type: 'image_url',
    });
  });

  it('preserves an empty result when neither NFT nor collection media exists', () => {
    expect(
      resolveNftDisplayMedia(
        {
          content: '',
          content_type: null,
        },
        { logo_url: '' }
      )
    ).toEqual({
      content: '',
      type: undefined,
    });
  });
});
