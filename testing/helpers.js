const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

function readSource(...segments) {
  return fs.readFileSync(path.join(BASE, ...segments), 'utf-8');
}

module.exports = { readSource, BASE };
