#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const lessVarsToJs = require('less-vars-to-js');

const { themeColors, rabbyCssPrefix } = require('../src/constant/theme-colors');

const ROOT = path.resolve(__dirname, '..');

const cssvarSrcfile = path.resolve(ROOT, 'src/ui/style/cssvars.css');

const SPACES = `  `;

makeCssVar: {
  const cssvarSrcContent = `
/* this file is genetared automatically, never modify it manually! */
:root {
  /* -------------------- base define -------------------- */
${Object.entries(themeColors.light).map(([cssvarKey, cssvarValue]) => {
  const varcore = cssvarKey.replace(/^\-\-/, '');
  return `${SPACES}--rabby-light-${varcore}: ${cssvarValue};`;
}).join('\n')}
}

html, body {
  /* -------------------- default light mode -------------------- */
${Object.entries(themeColors.light).map(([cssvarKey]) => {
  const varcore = cssvarKey.replace(/^\-\-/, '');
  return `${SPACES}--${rabbyCssPrefix}${cssvarKey}: var(--rabby-light-${varcore});`;
}).join('\n')}
}
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