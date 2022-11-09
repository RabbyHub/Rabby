const fs = require('fs');
const path = require('path');
const lessVarsToJs = require('less-vars-to-js');

const ROOT = path.dirname(__dirname);
 
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
/* this file is genetared by ${fname} automatic, never modify it manually! */
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

console.log('[rabby] make-vars js version success!');