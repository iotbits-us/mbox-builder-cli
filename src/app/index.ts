import chalk from 'chalk';
import clear from 'clear';
import Table from 'cli-table';
import { Command } from 'commander';
import Configstore from 'configstore';
import figlet from 'figlet';
import inquirer from 'inquirer';
import _ from 'lodash';
import helper, { BuildOptions, GitHubAuth } from 'mbox-builder-helper';
import ora from 'ora';
import readPkgUp from 'read-pkg-up';

import { Port } from './model';
import * as prompts from './prompt';
class App extends Command {
  private static instance: App;
  private pkg: readPkgUp.NormalizedReadResult;
  private config: Configstore;
  /**
   * Class constructor
   * @param appName
   */
  private constructor() {
    // read data from package.json
    const _pkgUp = readPkgUp.sync({
      cwd: __filename,
    });
    // get app's bin name from package.json
    const appBinName = _.keys(_pkgUp.packageJson.bin)[0];
    // call super
    super(appBinName);
    // copy local _pkg to class scoped pkg object
    this.pkg = _pkgUp;
    // create config store
    this.config = new Configstore(this.pkg.packageJson.name);
    // clear console
    clear();
    // show top caption
    console.log(
      chalk.cyanBright(
        figlet.textSync('MBox Builder', { horizontalLayout: 'full' })
      )
    );
  }

  /**
   * Store github credentials
   * @param username
   * @param password
   */
  private storeGithubLogin(username: string, password: string): boolean {
    this.config.set('gh_username', username);
    this.config.set('gh_password', password);
    return true;
  }

  /**
   * Retrieve stored github credentials
   * @param username
   * @param password
   */
  private getGithubLogin(): GitHubAuth {
    const auth = {
      username: this.config.get('gh_username'),
      password: this.config.get('gh_password'),
    };
    return auth;
  }

  private checkGithubLogin(): boolean {
    if (this.config.get('gh_username') || this.config.get('gh_password')) {
      return true;
    }
    return false;
  }

  /**
   * Get class's singleton instance
   * @param appName
   */
  public static getInstance(): App {
    if (!App.instance) {
      App.instance = new App();
    }

    return App.instance;
  }

  /**
   * Start app
   */
  public start() {
    this.version(this.pkg.packageJson.version);
    this.description(this.pkg.packageJson.description);
    this.parse(process.argv);
    if (!process.argv.slice(2).length) {
      this.outputHelp();
    }
  }

  /**
   * list available serial ports
   */
  public async listSerialPorts() {
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
        loading.fail(`Could not retrieve serial ports`);
        // TODO: Only show detailed error message if verbose output enabled.
        console.log(chalk.red(`Error: ${error}`));
      }
    );
  }

  /**
   *  Get chip id
   * @param port
   */
  public async getChipId(port: string) {
    const loading = ora();

    // if no port provided as argument, prompt with available ports.
    if (!port) {
      port = (await prompts.selectPort()).path;
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

  /**
   * Upload firmware
   */
  public async uploadFirmware(options: {
    port: string;
    dir: string;
    lock: string;
    slaves: number;
    webui: boolean;
    trial: number;
    wizard: boolean;
  }) {
    const loading = ora();
    // if no port provided, prompt with available ports.
    if (!options.port) {
      options.port = (await prompts.selectPort()).path;
    }

    // if no firmware directory provided, use current working directory.
    if (!options.dir) {
      options.dir = process.cwd();
    }

    loading.start('Compiling and uploading firmware');

    if (!this.checkGithubLogin()) {
      loading.fail(chalk.red('Github credentials not found in config'));
      return;
    }

    const buildOptions: BuildOptions = {
      chipId: options.lock ? options.lock : '',
      maxSlave: options.slaves ? options.slaves : 4,
      trialMode: options.trial ? true : false,
      trialTime: options.trial ? options.trial : 1440,
    };

    helper
      .buildAndUpload(
        options.dir,
        options.port,
        this.getGithubLogin(),
        buildOptions
      )
      .then(
        () => {
          loading.succeed(chalk.greenBright('Firmware successfully uploaded'));
        },
        (error) => {
          loading.fail(
            `An error has ocurred trying to build and upload firmware`
          );
          // TODO: Only show detailed error message if verbose output enabled.
          console.log(chalk.red(`Error: ${error}`));
        }
      );
  }

  /**
   * Erase device flash memory
   * @param port
   */
  public async eraseFlash(port: string) {
    const loading = ora();

    // if no port provided as argument, prompt with available ports.
    if (!port) {
      port = (await prompts.selectPort()).path;
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

  /**
   * Show config menu
   */
  public async showConfigMenu() {
    prompts.configMenu().then((configMenuSelection: { config: string }) => {
      switch (configMenuSelection.config) {
        case 'github':
          if (this.checkGithubLogin()) {
            console.log(chalk.green('Github credentials already exist.'));
            console.log(chalk.grey(JSON.stringify(this.getGithubLogin())));
            inquirer
              .prompt({
                type: 'confirm',
                name: 'editCredentials',
                message: 'Would you like to modify them?',
                default: false,
              })
              .then((result) => {
                if (result.editCredentials) {
                  prompts.addGithubLogin().then((entry: GitHubAuth) => {
                    this.storeGithubLogin(entry.username, entry.password);
                    console.log(chalk.greenBright('Saved!'));
                  });
                } else {
                  return;
                }
              });
          } else {
            prompts.addGithubLogin().then((entry: GitHubAuth) => {
              this.storeGithubLogin(entry.username, entry.password);
            });
          }
          break;

        default:
          break;
      }
    });
  }
}

const app = App.getInstance();

export default app;
