const chalk = require('chalk');
const _ = require('lodash');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const jhipsterUtils = require('generator-jhipster/generators/utils');

const packagejs = require('../../package.json');
const prompts = require('./prompts');

module.exports = class extends BaseGenerator {
    constructor(args, opts) {
        super(args, opts);

        this.configOptions = this.options.configOptions || {};

        // This adds support for a `--skip-prompts` flag
        this.option('skip-prompts', {
            desc: 'Generate pre-existing configuration',
            type: Boolean,
            defaults: false
        });
        this.props = {};
        this.setupClientOptions(this);
    }

    get initializing() {
        return {
            init(args) {
                if (args === 'default') {
                    // do something when argument is 'default'
                }
            },
            readConfig() {
                this.jhipsterAppConfig = this.getAllJhipsterConfig();
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
                this.log(`\nWelcome to the ${chalk.bold.yellow('JHipster kafka')} generator! ${chalk.yellow(`v${packagejs.version}\n`)}`);
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
        // To generate a consumer and a producer for CI tests
        if (this.options['skip-prompts']) {
            this.props.typeOfGeneration = 'bigbang';
            this.log('Skipping prompts...');
            this.props = {};
            this.props.components = [];
            this.props.components.push('consumer', 'producer');
            // DocumentBankAccount entity is generated for tests purpose
            // in the main generator (see: 11-generate-entities.sh).
            this.props.entities = [];
            this.props.entities.push('DocumentBankAccount');
            this.props.autoOffsetResetPolicies = 'earliest';
            return;
        }
        prompts.askForOperations(this);
    }

    writing() {
        // function generate kafka application properties
        this.generateKafkaProperties = function(enabled) {
            this.enabled = enabled;

            let generatedKafkaProperties = '';
            jhipsterUtils.renderContent(this.templatePath('src/main/resources/application-kafka.yml.ejs'), this, this, {}, res => {
                generatedKafkaProperties = res;
            });
            return generatedKafkaProperties;
        };

        // read config from .yo-rc.json
        this.baseName = this.jhipsterAppConfig.baseName;
        this.dasherizedBaseName = _.kebabCase(this.baseName);
        this.snakeCaseBaseName = _.snakeCase(this.baseName);
        this.packageName = this.jhipsterAppConfig.packageName;
        this.packageFolder = this.jhipsterAppConfig.packageFolder;
        this.clientFramework = this.jhipsterAppConfig.clientFramework;
        this.clientPackageManager = this.jhipsterAppConfig.clientPackageManager;
        this.buildTool = this.jhipsterAppConfig.buildTool;
        // use function in generator-base.js from generator-jhipster
        this.angularAppName = this.getAngularAppName();

        // use constants from generator-constants.js
        const javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR + this.packageFolder}/`;
        const resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
        const testDir = `${jhipsterConstants.SERVER_TEST_SRC_DIR + this.packageFolder}/`;
        const testResourceDir = jhipsterConstants.SERVER_TEST_RES_DIR;
        const webappDir = jhipsterConstants.CLIENT_MAIN_SRC_DIR;

        this.dockerComposeFormatVersion = jhipsterConstants.DOCKER_COMPOSE_FORMAT_VERSION;
        this.dockerAkhq = 'tchiotludo/akhq:0.14.1';

        // variables from questions
        this.typeOfGeneration = this.props.typeOfGeneration;

        if (this.typeOfGeneration === 'bigbang') {
            this.components = this.props.components;
            this.entities = this.props.entities || [];
        } else {
            this.log('not implemented yet');
            return;
        }

        this.pollingTimeout = this.props.pollingTimeout;
        this.autoOffsetResetPolicy = this.props.autoOffsetResetPolicy;

        // show all variables
        this.log('\n--- some config read from config ---');
        this.log(`baseName=${this.baseName}`);
        this.log(`packageName=${this.packageName}`);
        this.log(`clientFramework=${this.clientFramework}`);
        this.log(`clientPackageManager=${this.clientPackageManager}`);
        this.log(`buildTool=${this.buildTool}`);

        this.log('\n--- some function ---');
        this.log(`angularAppName=${this.angularAppName}`);

        this.log('\n--- some const ---');
        this.log(`javaDir=${javaDir}`);
        this.log(`resourceDir=${resourceDir}`);
        this.log(`resourceDir=${testResourceDir}`);
        this.log(`webappDir=${webappDir}`);
        this.log(`dockerComposeFormatVersion=${this.dockerComposeFormatVersion}`);
        this.log(`dockerAkhq=${this.dockerAkhq}`);

        this.log('\n--- variables from questions ---');
        this.log(`\ncomponents=${this.components}`);
        this.log(`\nentities=${this.entities}`);
        this.log(`\npollingTimeout=${this.pollingTimeout}`);
        this.log(`\nautoOffsetResetPolicy=${this.autoOffsetResetPolicy}`);
        this.log('------\n');
        try {
            this.registerModule(
                'generator-jhipster-kafka',
                'entity',
                'post',
                'entity',
                'A JHipster module to generate Apache Kafka consumers and producers.'
            );
        } catch (err) {
            this.log(`${chalk.red.bold('WARN!')} Could not register as a jhipster entity post creation hook...\n`);
        }

        this.removeFile(`${javaDir}web/rest/${this.upperFirstCamelCase(this.baseName)}KafkaResource.java`);
        this.removeFile(`${testDir}web/rest/${this.upperFirstCamelCase(this.baseName)}KafkaResourceIT.java`);

        if (this.components.includes('consumer') && this.entities.length > 0) {
            this.template(
                'src/main/java/package/service/kafka/GenericConsumer.java.ejs',
                `${javaDir}service/kafka/GenericConsumer.java`,
                null,
                null
            );
        }

        if (this.components.includes('consumer') || this.components.includes('producer')) {
            this.template('src/main/java/package/config/KafkaProperties.java.ejs', `${javaDir}config/KafkaProperties.java`, null, null);
        }

        this.entities.forEach(entity => {
            this.entityClass = entity;
            this.camelCaseEntityClass = _.camelCase(entity);

            if (this.components.includes('consumer')) {
                this.template(
                    'src/main/java/package/service/kafka/consumer/EntityConsumer.java.ejs',
                    `${javaDir}service/kafka/consumer/${entity}Consumer.java`,
                    null,
                    null
                );
                this.template(
                    'src/main/java/package/service/kafka/deserializer/EntityDeserializer.java.ejs',
                    `${javaDir}service/kafka/deserializer/${entity}Deserializer.java`,
                    null,
                    null
                );
            }
        });

        this.entities.forEach(entity => {
            this.entityClass = entity;
            this.camelCaseEntityClass = _.camelCase(entity);

            if (this.components.includes('producer')) {
                this.template(
                    'src/main/java/package/service/kafka/producer/EntityProducer.java.ejs',
                    `${javaDir}service/kafka/producer/${entity}Producer.java`,
                    null,
                    null
                );
                this.template(
                    'src/main/java/package/service/kafka/serializer/EntitySerializer.java.ejs',
                    `${javaDir}service/kafka/serializer/${entity}Serializer.java`,
                    null,
                    null
                );
            }
        });

        const kafkaProperties = this.generateKafkaProperties(true);
        this.log(`kafkaProperties=\n\n${kafkaProperties}\n\n`);

        const kafkaTestProperties = this.generateKafkaProperties(false);
        this.log(`kafkaTestProperties=\n\n${kafkaTestProperties}\n\n`);

        const kafkaBlockPattern = /\n+kafka:\n(\s.+\n+)+/g;
        this.replaceContent(`${resourceDir}config/application.yml`, kafkaBlockPattern, kafkaProperties);
        this.replaceContent(`${testResourceDir}config/application.yml`, kafkaBlockPattern, kafkaTestProperties);

        this.template('src/main/docker/akhq.yml.ejs', `${jhipsterConstants.MAIN_DIR}docker/akhq.yml`, this, null, null);

        // Related to: https://github.com/jhipster/generator-jhipster/issues/11846
        this.overrideMainGeneratorAppYml();
    }

    overrideMainGeneratorAppYml() {
        const appYmlPath = `${jhipsterConstants.MAIN_DIR}docker/app.yml`;

        const kafkaBootstrapServersPattern = /^\s.*KAFKA_BOOTSTRAPSERVERS.*$/gm;
        const kafkaBootstrapServers = '      - KAFKA_BOOTSTRAP_SERVERS=kafka:29092';
        this.replaceContent(appYmlPath, kafkaBootstrapServersPattern, kafkaBootstrapServers);

        const kafkaAdvertisedListenersPattern = /^\s.*KAFKA_ADVERTISED_LISTENERS.*$/gm;
        const kafkaAdvertisedListeners = '      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092';
        this.replaceContent(appYmlPath, kafkaAdvertisedListenersPattern, kafkaAdvertisedListeners);
    }

    install() {
        const logMsg = `To install your dependencies manually, run: ${chalk.yellow.bold(`${this.clientPackageManager} install`)}`;

        const injectDependenciesAndConstants = err => {
            if (err) {
                this.warning('Install of dependencies failed!');
                this.log(logMsg);
            }
        };
        const installConfig = {
            bower: false,
            npm: this.clientPackageManager !== 'yarn',
            yarn: this.clientPackageManager === 'yarn',
            callback: injectDependenciesAndConstants
        };
        if (this.options['skip-install']) {
            this.log(logMsg);
        } else {
            this.installDependencies(installConfig);
        }
    }

    end() {
        this.log('End of kafka generator');
    }
};
