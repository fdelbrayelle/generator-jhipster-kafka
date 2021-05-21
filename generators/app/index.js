const BaseGenerator = require('generator-jhipster/generators/generator-base');
const chalk = require('chalk');
const semver = require('semver');
const shelljs = require('shelljs');
const packagejs = require('../../package.json');

const constants = require('../constants');
const files = require('./files');
const prompts = require('./prompts');

module.exports = class extends BaseGenerator {
    constructor(args, opts) {
        super(args, opts);

        this.configOptions = this.options.configOptions || {};

        // This adds support for a `--skip-prompts` option
        this.option('skip-prompts', {
            desc: 'Generate configuration with default values',
            type: Boolean,
            defaults: false
        });

        // props used for writing
        this.props = {
            entities: [],
            componentsByEntityConfig: [],
            componentsPrefixes: [],
            topics: [],
            cleanup: false || this.options['skip-prompts'],
            entitiesOrder: []
        };
    }

    isFirstGeneration() {
        if (!shelljs.test('-f', constants.MODULES_HOOK_FILE)) {
            return true;
        }

        return shelljs.cat(constants.MODULES_HOOK_FILE).match(constants.MODULE_NAME) === null;
    }

    get initializing() {
        return {
            init(args) {
                if (args === 'default') {
                    // do something when argument is 'default'
                }
            },
            readConfig() {
                this.jhipsterAppConfig = this.getJhipsterConfig('.yo-rc.json').createProxy();

                if (!this.jhipsterAppConfig) {
                    this.error('Cannot read .yo-rc.json');
                }

                if (this.jhipsterAppConfig.messageBroker !== 'kafka') {
                    this.error('You need to use Kafka as message broker!');
                }
            },
            displayLogo() {
                // it's here to show that you can use functions from generator-jhipster
                // this function is in: generator-jhipster/generators/generator-base.js
                this.printJHipsterLogo();

                // Have Yeoman greet the user.
                this.log(
                    `\nWelcome to the ${chalk.bold.yellow('Kafka')} Module for ${chalk.bold.green('J')}${chalk.bold.red(
                        'Hipster'
                    )}! ${chalk.yellow(`v${packagejs.version}\n`)}`
                );
            },
            checkJhipster() {
                const currentJhipsterVersion = this.jhipsterAppConfig.jhipsterVersion;
                const minimumJhipsterVersion = packagejs.dependencies['generator-jhipster'];
                if (!semver.satisfies(currentJhipsterVersion, minimumJhipsterVersion)) {
                    this.warning(
                        `\nYour generated project used an old JHipster version (${currentJhipsterVersion})... you need at least (${minimumJhipsterVersion})\n`
                    );
                }
            }
        };
    }

    prompting() {
        prompts.askForOperations(this);
    }

    writing() {
        files.writeFiles(this);
    }

    install() {
        const logMsg = `To install your dependencies manually, run: ${chalk.yellow.bold(`${this.clientPackageManager} install`)}`;

        if (this.options['skip-install']) {
            this.log(logMsg);
        } else if (this.clientPackageManager === 'npm') {
            shelljs.exec('npm install');
        } else if (this.clientPackageManager === 'yarn') {
            shelljs.exec('yarn install');
        }
    }

    end() {
        this.log('End of kafka generator');
    }
};
