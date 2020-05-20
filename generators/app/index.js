const chalk = require('chalk');
const shelljs = require('shelljs');
const _ = require('lodash');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const packagejs = require('../../package.json');

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
                    this.error('You need to have Kafka as message broker');
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
            this.log('Skipping prompts...');
            this.props = {};
            this.props.components = [];
            this.props.components.push('consumer', 'producer');
            // DocumentBankAccount entity is generated for tests purpose
            // in the main generator (see: 11-generate-entities.sh).
            this.props.entities = [];
            this.props.entities.push('DocumentBankAccount');
            return;
        }

        const componentsChoices = [];

        componentsChoices.push({
            name: 'Consumer',
            value: 'consumer'
        });
        componentsChoices.push({
            name: 'Producer',
            value: 'producer'
        });

        const domainClassesPath = `${jhipsterConstants.SERVER_MAIN_SRC_DIR + this.jhipsterAppConfig.packageFolder}/domain`;
        const files = shelljs.ls(`${domainClassesPath}/*.java`);

        const entitiesChoices = [];
        files.forEach(file => {
            if (shelljs.grep(/^@Entity$/, file) !== '') {
                const className = file
                    .split('.')
                    .slice(0, -1)
                    .join('.')
                    .match(/\w*$/i);
                entitiesChoices.push({
                    name: className,
                    value: className
                });
            }
        });

        const prompts = [
            {
                type: 'checkbox',
                name: 'components',
                message: 'Which Kafka components would you like to generate?',
                choices: componentsChoices,
                default: []
            },
            {
                when: response => response.components.includes('consumer') || response.components.includes('producer'),
                type: 'checkbox',
                name: 'entities',
                message: 'For which entity (class name)?',
                choices: entitiesChoices,
                default: []
            },
            {
                when: response => response.components.includes('consumer'),
                type: 'number',
                name: 'pollingTimeout',
                message: 'Define the consumer polling timeout?',
                default: '10000'
            }
        ];

        const done = this.async();
        this.prompt(prompts).then(props => {
            this.props = props;
            // To access props later use this.props.someOption;
            done();
        });
    }

    writing() {
        // function to use directly template
        this.template = function(source, destination) {
            this.fs.copyTpl(this.templatePath(source), this.destinationPath(destination), this);
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

        this.kafkaVersion = jhipsterConstants.KAFKA_VERSION;
        this.dockerComposeFormatVersion = jhipsterConstants.DOCKER_COMPOSE_FORMAT_VERSION;
        this.dockerZookeeper = jhipsterConstants.DOCKER_ZOOKEEPER;
        this.dockerKafka = jhipsterConstants.DOCKER_KAFKA;
        this.dockerAkhq = 'tchiotludo/akhq';

        // variable from questions
        this.components = this.props.components;
        this.entities = this.props.entities;
        this.pollingTimeout = this.props.pollingTimeout;

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
        this.log(`kafkaVersion=${this.kafkaVersion}`);
        this.log(`dockerComposeFormatVersion=${this.dockerComposeFormatVersion}`);
        this.log(`dockerZookeeper=${this.dockerZookeeper}`);
        this.log(`dockerKafka=${this.dockerKafka}`);
        this.log(`dockerAkhq=${this.dockerAkhq}`);

        this.log('\n--- variables from questions ---');
        this.log(`\ncomponents=${this.components}`);
        this.log(`\nentities=${this.entities}`);
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
            this.template('src/main/java/package/service/kafka/GenericConsumer.java.ejs', `${javaDir}service/kafka/GenericConsumer.java`);
        }

        if (this.components.includes('consumer') || this.components.includes('producer')) {
            this.template('src/main/java/package/config/KafkaProperties.java.ejs', `${javaDir}config/KafkaProperties.java`);
        }

        let kafkaProperties = `kafka:
  bootstrap.servers: localhost:9092
  `;
        if (this.components.includes('consumer') && this.pollingTimeout) {
            kafkaProperties += `polling.timeout: ${this.pollingTimeout}
  `;
        }
        let consumersCpt = 0;

        this.entities.forEach(entity => {
            this.entityClass = entity;
            this.camelCaseEntityClass = _.camelCase(entity);
            this.snakeCaseEntityClass = _.snakeCase(entity);

            if (this.components.includes('consumer')) {
                if (consumersCpt === 0) {
                    kafkaProperties += 'consumer:';
                }

                kafkaProperties += `
    ${this.camelCaseEntityClass}:
      # This is a template topic naming convention which can be changed.
      # %3Cmessage_type%3E.%3Capplication_name%3E.%3Centity_name%3E with (all in snake_case):
      # - %3Cmessage_type%3E: queuing, logging, tracking, etl/db, streaming, push, user...
      # - %3Capplication_name%3E: the application base name
      # - %3Centity_name%3E: the entity name which is consumed
      name: queuing.${this.snakeCaseBaseName}.${this.snakeCaseEntityClass}
      enabled: true
      '[key.deserializer]': org.apache.kafka.common.serialization.StringDeserializer
      '[value.deserializer]': ${this.packageName}.service.kafka.deserializer.${entity}Deserializer
      '[group.id]': ${this.dasherizedBaseName}
      '[auto.offset.reset]': earliest`;

                this.template(
                    'src/main/java/package/service/kafka/consumer/EntityConsumer.java.ejs',
                    `${javaDir}service/kafka/consumer/${entity}Consumer.java`
                );
                this.template(
                    'src/main/java/package/service/kafka/deserializer/EntityDeserializer.java.ejs',
                    `${javaDir}service/kafka/deserializer/${entity}Deserializer.java`
                );

                consumersCpt++;
            }
        });

        let producersCpt = 0;

        this.entities.forEach(entity => {
            this.entityClass = entity;
            this.camelCaseEntityClass = _.camelCase(entity);
            this.snakeCaseEntityClass = _.snakeCase(entity);

            if (this.components.includes('producer')) {
                if (producersCpt === 0) {
                    kafkaProperties += `
  producer:`;
                }

                kafkaProperties += `
    ${this.camelCaseEntityClass}:
      # This is a template topic naming convention which can be changed.
      # %3Cmessage_type%3E.%3Capplication_name%3E.%3Centity_name%3E with (all in snake_case):
      # - %3Cmessage_type%3E: queuing, logging, tracking, etl/db, streaming, push, user...
      # - %3Capplication_name%3E: the application base name
      # - %3Centity_name%3E: the entity name which is produced
      name: queuing.${this.snakeCaseBaseName}.${this.snakeCaseEntityClass}
      enabled: true
      '[key.serializer]': org.apache.kafka.common.serialization.StringSerializer
      '[value.serializer]': ${this.packageName}.service.kafka.serializer.${entity}Serializer`;

                this.template(
                    'src/main/java/package/service/kafka/producer/EntityProducer.java.ejs',
                    `${javaDir}service/kafka/producer/${entity}Producer.java`
                );
                this.template(
                    'src/main/java/package/service/kafka/serializer/EntitySerializer.java.ejs',
                    `${javaDir}service/kafka/serializer/${entity}Serializer.java`
                );

                producersCpt++;
            }
        });

        kafkaProperties += '\n';

        this.log(`kafkaProperties=\n\n${kafkaProperties}\n\n`);

        const kafkaBlockPattern = /kafka:\n((\s.+)\n)+/g;
        this.replaceContent(`${resourceDir}config/application.yml`, kafkaBlockPattern, kafkaProperties);
        this.replaceContent(`${testResourceDir}config/application.yml`, kafkaBlockPattern, kafkaProperties);

        this.template('src/main/docker/kafka.yml.ejs', `${jhipsterConstants.MAIN_DIR}docker/kafka.yml`);
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
