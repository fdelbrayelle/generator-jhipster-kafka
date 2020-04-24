const chalk = require('chalk');
const shelljs = require('shelljs');
const _ = require('lodash');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const packagejs = require('../../package.json');

module.exports = class extends BaseGenerator {
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
        const testResourceDir = jhipsterConstants.SERVER_TEST_RES_DIR;
        const webappDir = jhipsterConstants.CLIENT_MAIN_SRC_DIR;

        // variable from questions
        this.components = this.props.components;
        this.entities = this.props.entities;

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

        if (this.components.includes('consumer') && this.entities.length > 0) {
            this.template('src/main/java/package/service/kafka/GenericConsumer.java.ejs', `${javaDir}service/kafka/GenericConsumer.java`);
        }

        this.entities.forEach(entity => {
            this.entityClass = entity;
            this.dasherizedEntityClass = _.kebabCase(entity);
            this.dasherizedBaseName = _.kebabCase(this.baseName);
            this.camelCaseEntityClass = _.camelCase(entity);

            if (this.components.includes('consumer')) {
                this.template(
                    'src/main/java/package/service/kafka/consumer/EntityConsumer.java.ejs',
                    `${javaDir}service/kafka/consumer/${entity}Consumer.java`
                );
                this.template(
                    'src/main/java/package/service/kafka/deserializer/EntityDeserializer.java.ejs',
                    `${javaDir}service/kafka/deserializer/${entity}Deserializer.java`
                );
            }

            if (this.components.includes('producer')) {
                this.template(
                    'src/main/java/package/service/kafka/producer/EntityProducer.java.ejs',
                    `${javaDir}service/kafka/producer/${entity}Producer.java`
                );
                this.template(
                    'src/main/java/package/service/kafka/serializer/EntitySerializer.java.ejs',
                    `${javaDir}service/kafka/serializer/${entity}Serializer.java`
                );
            }

            const sourceKafkaProperties = `kafka:
  bootstrap-servers: localhost:9092
  consumer:
    key.deserializer: org.apache.kafka.common.serialization.StringDeserializer
    value.deserializer: org.apache.kafka.common.serialization.StringDeserializer
    group.id: ${this.dasherizedBaseName}
    auto.offset.reset: earliest
  producer:
    key.serializer: org.apache.kafka.common.serialization.StringSerializer
    value.serializer: org.apache.kafka.common.serialization.StringSerializer`;

            const destinationKafkaProperties = `kafka:
  '[bootstrap.servers]': localhost:9092
  consumer:
    ${this.camelCaseEntityClass}:
      name: ${this.dasherizedEntityClass}-topic
      enabled: true
      '[key.deserializer]': ${this.packageName}.service.kafka.deserializer.${entity}Deserializer
      '[value.deserializer]': ${this.packageName}.service.kafka.deserializer.${entity}Deserializer
      '[group.id]': ${this.dasherizedBaseName}
      '[auto.offset.reset]': earliest
  producer:
    ${this.camelCaseEntityClass}:
      name: ${this.dasherizedEntityClass}-topic
      enabled: true
      '[key.serializer]': ${this.packageName}.service.kafka.serializer.${entity}Serializer
      '[value.serializer]': ${this.packageName}.service.kafka.serializer.${entity}Serializer`;

            const destinationKafkaTestProperties = `kafka:
  '[bootstrap.servers]': localhost:9092
  consumer:
    ${this.camelCaseEntityClass}:
      name: ${this.dasherizedEntityClass}-topic
      enabled: false
      '[key.deserializer]': ${this.packageName}.service.kafka.deserializer.${entity}Deserializer
      '[value.deserializer]': ${this.packageName}.service.kafka.deserializer.${entity}Deserializer
      '[group.id]': ${this.dasherizedBaseName}
      '[auto.offset.reset]': earliest
  producer:
    ${this.camelCaseEntityClass}:
      name: ${this.dasherizedEntityClass}-topic
      enabled: false
      '[key.serializer]': ${this.packageName}.service.kafka.serializer.${entity}Serializer
      '[value.serializer]': ${this.packageName}.service.kafka.serializer.${entity}Serializer`;

            this.replaceContent(`${resourceDir}config/application.yml`, sourceKafkaProperties, destinationKafkaProperties);
            this.replaceContent(`${testResourceDir}config/application.yml`, sourceKafkaProperties, destinationKafkaTestProperties);
        });
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
