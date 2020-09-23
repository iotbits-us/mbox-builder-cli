import chalk from 'chalk';
import clear from 'clear';
import Table from 'cli-table';
import { Command } from 'commander';
import figlet from 'figlet';
import helper from 'mbox-builder-helper';
import ora from 'ora';

import { Port } from './model';
import * as prompt from './prompt';

class App extends Command {
  private static instance: App;

  private constructor(appName?: string) {
    super(appName);
    this.spinner = ora();
    clear();
    console.log(
      chalk.cyanBright(
        figlet.textSync('MBox Builder', { horizontalLayout: 'full' })
      )
    );
  }

  public static getInstance(appName?: string): App {
    if (!App.instance) {
      App.instance = new App(appName);
    }

    return App.instance;
  }

  // start app
  start(version: string, description: string) {
    this.version(version);
    this.description(description);
    this.parse(process.argv);

    if (!process.argv.slice(2).length) {
      this.outputHelp();
    }
  }

  // list available serial ports
  async listSerialPorts() {
    const loading = ora('Looking for available serial ports').start();

    // create table
    const table = new Table({
      head: [chalk.blue('Path'), chalk.blue('Manufacturer')],
      colWidths: [25, 25],
    });

    // get serial ports
    helper.getPorts().then(
      (ports: readonly Port[]) => {
        // no serial port found
        if (ports.length <= 0) {
          loading.warn(`No serial port available`);
          return;
        }

        // done loading
        loading.succeed();

        // populate table
        ports.forEach((port) => {
          table.push([port.path, port.manufacturer]);
        });

        // show table
        console.log(table.toString());
      },
      (error) => {
        app.spinner.fail(`Could not retrieve serial ports`);
        // TODO: Only show detailed error message if verbose output enabled.
        console.log(chalk.red(`Error: ${error}`));
      }
    );
  }

  // get chip id
  async getChipId(port: string) {
    const loading = ora();

    // if no port provided as argument, prompt with available ports.
    if (!port) {
      port = (await prompt.selectPort()).path;
    }

    loading.start('Getting chip id from device');

    helper.getChipId(port).then(
      (chipId) => {
        loading.succeed(`Chip id: ${chalk.green(chipId)}`);
      },
      (error) => {
        loading.fail(`Could not read chip id from device`);
        // TODO: Only show detailed error message if verbose output enabled.
        console.log(chalk.red(`Error: ${error}`));
      }
    );
  }

  // upload firmware
  async uploadFirmware(options: {
    port: string;
    chipId: string;
    slaves: number;
    webui: boolean;
    trialTime: number;
  }) {
    console.log(chalk.blueBright('Firmware upload'));
    // if no port provided as argument, prompt with available ports.
    if (!options.port) {
      options.port = (await prompt.selectPort()).path;
    }
  }

  // erase device flash memory
  async eraseFlash(port: string) {
    const loading = ora();

    // if no port provided as argument, prompt with available ports.
    if (!port) {
      port = (await prompt.selectPort()).path;
    }

    loading.start(chalk.red('Performing flash erase on device'));

    helper.eraseFlash(port).then(
      () => {
        loading.succeed(
          chalk.greenBright('Device flash has been successfully erased')
        );
      },
      (error) => {
        loading.fail(`An error has ocurred trying to erase device flash`);
        // TODO: Only show detailed error message if verbose output enabled.
        console.log(chalk.red(`Error: ${error}`));
      }
    );
  }
}

const app = App.getInstance('mbox-builder');
export default app;
