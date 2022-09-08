/**
 * replace string with other assets content at "afterProcessAssets"
 */

class AssetReplacePlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    const {
      webpack: {
        sources: { RawSource },
      },
    } = compiler;
    compiler.hooks.make.tapAsync(
      'AssetReplacePlugin',
      (compilation, callback) => {
        compilation.hooks.afterProcessAssets.tap('AssetReplacePlugin', () => {
          const replaceArr = Object.entries(this.options)
            .map(([k, v]) => {
              let assetName;
              for (const chunk of compilation.chunks.values()) {
                if (chunk.name === v) {
                  assetName = chunk.files.values().next().value;

                  break;
                }
              }
              return [k, assetName];
            })
            .filter(([, assetName]) => assetName);

          const replaceFn = replaceArr
            .map(([k, assetName]) => {
              // github.com/webpack/webpack-sources/blob/master/lib/ConcatSource.js
              const content = compilation.assets[assetName]?.source();

              return (source) => {
                return source
                  .split(new RegExp(`['"]?${k}['"]?`))
                  .join(JSON.stringify(content));
              };
            })
            .reduce((m, n) => (content) => n(m(content)));

          for (const chunk of compilation.chunks.values()) {
            const fileName = chunk.files.values().next().value;
            if (
              !replaceArr.includes(([, assetName]) => assetName === fileName)
            ) {
              compilation.updateAsset(fileName, (content) => {
                const result = replaceFn(content.source());

                return new RawSource(result);
              });
            }
          }
        });
        callback();
      }
    );
  }
}

module.exports = AssetReplacePlugin;
