import inquirer from 'inquirer';
import helper from 'mbox-builder-helper';
import ora from 'ora';

import { Port } from './model';

/**
 * Prompt available serial ports
 * Show available serial port and return a promise with the one selected.
 */
export const selectPort = (): Promise<Port> => {
  return new Promise((resolve, reject) => {
    const loading = ora('Looking for available serial ports').start();
    helper.getPorts().then(
      (ports: readonly Port[]) => {
        if (ports.length <= 0) {
          loading.warn(`No serial port available`);
          return;
        }
        loading.succeed();
        inquirer
          .prompt([
            {
              type: 'rawlist',
              name: 'port',
              message: 'Please select a port',
              choices: ports.map((port) => {
                return port.path;
              }),
              filter: function (val) {
                return val;
              },
            },
          ])
          .then((answer) => {
            resolve({ path: answer.port });
          });
      },
      (error) => {
        loading.fail(`Could not retrieve serial ports`);
        reject(error);
      }
    );
  });
};

const configMenuQuestions = [
  {
    type: 'list',
    name: 'config',
    message: 'What would you like to configure?',
    choices: [
      { name: 'GitHub Credentials', value: 'github' },
      { name: 'Default Building Options', value: 'building' },
      { name: 'Debug Info', value: 'debug' },
    ],
    filter: function (val: string) {
      return val.toLowerCase();
    },
  },
];

export const configMenu = () => {
  return new Promise((resolve) => {
    inquirer.prompt(configMenuQuestions).then((mainMenuSelection) => {
      resolve(mainMenuSelection);
    });
  });
};
