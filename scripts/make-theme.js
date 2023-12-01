#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const lessVarsToJs = require('less-vars-to-js');
const tinycolor2 = require('tinycolor2');

const { themeColors, rabbyCssPrefix } = require('../src/constant/theme-colors');

const ROOT = path.resolve(__dirname, '..');

const cssvarSrcfile = path.resolve(ROOT, 'src/ui/style/cssvars.css');

const SPACES = `  `;
const LINE_BREAK = '\n';

const SPECIAL_DEFAULT_ALPHA = {
  light: [],
  dark: [],
}

makeCssVar: {
  const cssvarSrcContent = `
/* this file is genetared automatically, never modify it manually! */
:root {
  --rabby-color-opacity: 1;
  --tw-bg-opacity: 1;

  /* -------------------- base define -------------------- */
${['light', 'dark'].map(theme => {
  return Object.entries(themeColors[theme]).map(([cssvarKey, colorValue]) => {
    const varcore = cssvarKey.replace(/^\-\-/, '');

    return `${SPACES}--rabby-${theme}-${varcore}: ${colorValue};`;
  }).join(LINE_BREAK)
}).join(LINE_BREAK.repeat(2))}
}

${[
  {
    theme: 'light',
    parentSelector: ':root',
  },
  {
    theme: 'dark',
    parentSelector: 'html.dark, body.dark',
  }
].map(({ theme, parentSelector }) => {
  const isDarkTheme = theme === 'dark';

  return `${parentSelector} {
${SPACES}/* -------------------- ${theme} mode -------------------- */
${Object.entries(themeColors[theme]).map(([cssvarKey, colorValue]) => {
  const varcore = cssvarKey.replace(/^\-\-/, '');

  const tinyColor = tinycolor2(colorValue);
  const rgbs = tinyColor.toRgb();
  const alpha = tinyColor.getAlpha();
  if (alpha !== 1) {
    SPECIAL_DEFAULT_ALPHA[theme].push({ cssvarKey, alpha });
  }

  return [
    `${SPACES}--${rabbyCssPrefix}${cssvarKey}-rgb: ${rgbs.r}, ${rgbs.g}, ${rgbs.b};`,
    // `${SPACES}--${rabbyCssPrefix}${cssvarKey}-opacity: ${alpha};`,
    // `${SPACES}--${rabbyCssPrefix}${cssvarKey}: rgba(${rgbs.r}, ${rgbs.g}, ${rgbs.b}, var(--${rabbyCssPrefix}${cssvarKey}-opacity, 1));`,
    `${SPACES}--${rabbyCssPrefix}${cssvarKey}: var(--rabby-${theme}-${varcore});`,
  ].filter(Boolean).join(LINE_BREAK);
}).join(LINE_BREAK)}
}
${!SPECIAL_DEFAULT_ALPHA[theme].length ? '' : SPECIAL_DEFAULT_ALPHA[theme].map(({ cssvarKey, alpha }) => {
  return [
//     `${isDarkTheme ? `.dark ` : ''} {
// ${SPACES}--${rabbyCssPrefix}${cssvarKey}-opacity: ${alpha};
// }`,
//     `${isDarkTheme ? `.dark ` : ''}.bg-${rabbyCssPrefix}${cssvarKey} {
// ${SPACES}--bg-${rabbyCssPrefix}${cssvarKey}-opacity: ${alpha};
// }`,
  ].filter(Boolean).join(LINE_BREAK);
}).filter(Boolean).join(LINE_BREAK)}`
}).join(LINE_BREAK)}
`;
  fs.writeFileSync(cssvarSrcfile, cssvarSrcContent, 'utf8');

console.log('[rabby] make-theme css vars version success!');
}

makeVarsInJs: {
  const varsLess = fs.readFileSync(path.resolve(ROOT, './src/ui/style/var.less'), 'utf8');
  
  const palette = lessVarsToJs(varsLess, {
      resolveVariables: true,
      stripPrefix: false
  });

  Object.entries(palette).forEach(([key, value]) => {
      palette[key] = value.trim()
        .replace(/\r\n/g, '')
        .replace(/\n/g, '');
  });

  const fname = path.basename(__filename);

  fs.writeFileSync(path.resolve(ROOT, './src/ui/style/var-defs.ts'), `\
/* eslint-disable */
/* this file is genetared by ${fname} automatically, never modify it manually! */
const LessPalette = ${JSON.stringify(palette, null, '  ')};

export function ellipsis(){
  return \`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  \`
}

export default LessPalette;
`);

console.log('[rabby] make-theme js version success!');
}