#!/usr/bin/env node

const program = require('commander');
const idGenerator = require('./IdGenerator');
const metaGenerator = require('./MetaGenerator');

program
  .usage('<url> <options>')
  .version('1.0.0')
  .option('-c', '--current', 'use current directory')
  .option('-o, --output <path>', 'set the output directory')
  .option('-nn, --no-numbering', 'disable auto numbering')
  .parse(process.argv);

const url = program.args[0];

function showErrorMessage() {
  console.log('Please input the url first ❌');
  console.log('\n');
  console.log(program.outputHelp());
  process.exit(0);
}

if (!url) {
  showErrorMessage();
  return;
}

const urlParser = require('url');
const parsedUrl = urlParser.parse(url);

if (!parsedUrl.hostname) {
  showErrorMessage();
  return;
}

if (parsedUrl.hostname.toLowerCase().includes('tokopedia')) {
  const topedProcessor = require('../dist/TopedProcessor');
  topedProcessor.process(url);
  return;
}

const request = require('request');

const lastDotPos = url.lastIndexOf('.');
const itemId = url.substring(lastDotPos + 1);

const sub = url.substring(0, lastDotPos);
const shopId = sub.substring(sub.lastIndexOf('.') + 1);

const itemName = url
  .substring(url.lastIndexOf('/') + 1)
  .replace(/\./g, '_')
  .replace(/\-/g, '_');

//const completeUrl = `https://shopee.vn/api/v2/item/get\?itemid\=${itemId}\&shopid\=${shopId}`;
const completeUrl = `https://shopee.vn/api/v2/item/get?itemid=1118676639&shopid=32721292`;

console.log('complete: ', completeUrl);

request.get(completeUrl, (_, res, body) => {
  console.log('Request complete ✅');
  const parsed = JSON.parse(body);
  const images = parsed.item.images;

  const disableAutoNumbering = program.numbering;
  const defaultDir = program.current ? process.cwd() : itemName;
  const outputDirectory = program.output ? program.output : defaultDir;
  const fs = require('fs');

  // If directory doesn't exist, create
  if (outputDirectory !== process.cwd()) {
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory);
    }
  }

  images.forEach((image, index) => {
    let fileName = `${outputDirectory}/${
      disableAutoNumbering ? index : image
    }.jpg`;
    let file = fs.createWriteStream(fileName);
    request.get(`https://cf.shopee.co.id/file/${image}`).pipe(file);
  });

  idGenerator.write(url, outputDirectory);
  metaGenerator.write(url, parsed, outputDirectory);

  console.log(`Downloaded ${images.length} images(s)`);
  console.log('Completed ✅');
});
