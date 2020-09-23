import app from './app';

// App version
const version = '1.0.0';
// App description
const description =
  'ModbusBox Firmware Builder CLI | IOTBITS (www.iotbits.net)';

/**
 * List available serial ports
 */
app
  .command('ports')
  .description('list available serial ports')
  .action(() => {
    app.listSerialPorts();
  });

/**
 * Get chip id
 */
app
  .command('cid')
  .description('get device chip id')
  .option('-p, --port <port>', 'device port')
  .action((options) => {
    app.getChipId(options.port);
  });

/**
 * Firmware upload
 */
app
  .command('upload')
  .description('compile and upload firmware')
  .option('-p, --port <port>', 'device port')
  .option('-d, --dir <dir>', 'firmware directory')
  .option('-l, --lock <chip_id>', 'lock firmware to specific chip id')
  .option('-s, --slaves <slaves>', 'maximum number of slaves allowed')
  .option('-w --webui', 'upload web-ui after uploading the firmware image')
  .option('-t --trial <time>', 'enable trial mode')
  .action((options) => {
    app.uploadFirmware(options);
  });

/**
 * Flash erase
 */
app
  .command('erase')
  .description('erase device flash')
  .option('-p, --port <port>', 'device port')
  .action((options) => {
    app.eraseFlash(options.port);
  });

// Start application. Always run this at the end of this file.
app.start(version, description);
