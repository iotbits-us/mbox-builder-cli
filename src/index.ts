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
  .command('cid [port]')
  .description('get device chip id')
  .action((port) => {
    app.getChipId(port);
  });

/**
 * Firmware upload
 */
app
  .command('upload [port]')
  .description('compile and upload firmware')
  .option('-l, --lock [cid]', 'lock firmware to specific chip id')
  .option('-s, --max_slv [max_slv]', 'maximum number of slaves allowed')
  .option('-w --webui', 'upload Web-UI after uploading the firmware image')
  .action((port, options) => {
    app.uploadFirmware(port, options);
  });

/**
 * Flash erase
 */
app
  .command('erase [port]')
  .description('erase device flash')
  .action(async (port: string) => {
    app.eraseFlash(port);
  });

// Start application. Always run this at the end of this file.
app.start(version, description);
