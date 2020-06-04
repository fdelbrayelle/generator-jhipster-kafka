const _ = require('lodash');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const chalk = require('chalk');
const semver = require('semver');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const jhipsterUtils = require('generator-jhipster/generators/utils');
const jsYaml = require('js-yaml');
const shelljs = require('shelljs');
const packagejs = require('../../package.json');

const constants = require('../constants');
const files = require('./files');
const prompts = require('./prompts');
const utils = require('./utils');

module.exports = class extends BaseGenerator {
    constructor(args, opts) {
        super(args, opts);

        this.configOptions = this.options.configOptions || {};
        this.isFirstGeneration = false;
        // This adds support for a `--skip-prompts` flag
        this.option('skip-prompts', {
            desc: 'Generate pre-existing configuration',
            type: Boolean,
            defaults: false
        });
        // init props
        this.props = {
            entities: [],
            components: [],
            componentsByEntityConfig: [],
            componentsPrefixes: []
        };
        this.setupClientOptions(this);
    }

    get initializing() {
        return {
            init(args) {
                if (args === 'default') {
                    // do something when argument is 'default'
                }
                this.isFirstGeneration = !this.hasKafkaModuleAlreadyUsed();
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
            this.log('Skipping prompts...');
            this.props.generationType = constants.BIGBANG_MODE;
            this.props.components.push(constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT);
            // DocumentBankAccount entity is generated for tests purpose
            // in the main generator (see: 11-generate-entities.sh).
            this.props.entities.push('DocumentBankAccount');
            this.props.autoOffsetResetPolicies = constants.EARLIEST_OFFSET;
            return;
        }

        prompts.askForOperations(this);
    }

    writing() {
        const vavrVersion = '0.10.3';
        this.addMavenProperty('vavr.version', vavrVersion);
        this.addGradleProperty('vavr_version', vavrVersion);
        this.addMavenDependency('io.vavr', 'vavr', '${vavr.version}'); // eslint-disable-line no-template-curly-in-string
        this.addGradleDependency('implementation', 'io.vavr', 'vavr', '${vavr_version}'); // eslint-disable-line no-template-curly-in-string

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

        // variables from questions
        this.generationType = this.props.generationType;
        this.entities = this.props.entities || [];
        this.componentsPrefixes = this.props.componentsPrefixes || [];
        this.components = this.props.components;
        this.componentsByEntityConfig = this.props.componentsByEntityConfig || [];
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
        this.log(`\ncomponentsPrefixes=${this.componentsPrefixes}`);
        this.log(`\npollingTimeout=${this.pollingTimeout}`);
        this.log(`\nautoOffsetResetPolicy=${this.autoOffsetResetPolicy}`);
        this.log('------\n');

        this.registerToEntityPostHook();
        this.cleanMainGeneratorKafkaFiles(javaDir, testDir);

        const generateKafkaProperties = enabled => {
            this.enabled = enabled;

            let generatedKafkaProperties = constants.EMPTY_STRING;
            jhipsterUtils.renderContent(this.templatePath('src/main/resources/application-kafka.yml.ejs'), this, this, {}, res => {
                generatedKafkaProperties = res;
            });
            return generatedKafkaProperties;
        };

        /**
         * Search in dedicated incremental structure if a type of component must be generated for an entity.
         * @param entityName
         * @param componentType
         * @returns {*}
         */
        const haveComponentForEntity = (entityName, componentType) => {
            return (
                this.props.componentsByEntityConfig &&
                this.props.componentsByEntityConfig[entityName] &&
                this.props.componentsByEntityConfig[entityName].includes(componentType)
            );
        };

        /**
         * Search if a type component is present at least once in the asked generations.
         * @param componentType
         * @returns {boolean|boolean|*}
         */
        const containsComponent = componentType => {
            if (this.props.generationType === constants.BIGBANG_MODE) {
                return this.props.components.includes(componentType) && this.entities.length > 0;
            }

            if (this.props.generationType === constants.INCREMENTAL_MODE) {
                let haveComponentWithoutEntity = false;
                this.props.componentsPrefixes.forEach(prefix => {
                    haveComponentWithoutEntity = haveComponentForEntity(prefix, componentType);
                });

                return (
                    haveComponentWithoutEntity ||
                    (this.props.entities.length > 0 &&
                        this.props.entities.find(entityName => haveComponentForEntity(entityName, componentType)))
                );
            }

            return false;
        };

        /**
         * Search if a type of component must be generated for an entity.
         * @param entityName
         * @param componentType - Producer or Consumer
         * @returns {boolean|*}
         */
        const mustGenerateComponent = (entityName, componentType) => {
            if (this.props.generationType === constants.BIGBANG_MODE) {
                return this.props.components.includes(componentType);
            }
            if (this.props.generationType === constants.INCREMENTAL_MODE) {
                return haveComponentForEntity(entityName, componentType);
            }
            return false;
        };

        const writeComponents = (entity, useEntityAsType) => {
            if (entity === constants.NO_ENTITY) {
                return;
            }

            this.entityClass = entity;
            this.camelCaseEntityClass = _.camelCase(entity);
            this.type = useEntityAsType ? entity : 'String';

            if (mustGenerateComponent(entity, constants.CONSUMER_COMPONENT)) {
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
                this.template(
                    'src/main/java/package/service/kafka/deserializer/DeserializationError.java.ejs',
                    `${javaDir}service/kafka/deserializer/DeserializationError.java`,
                    null,
                    null
                );
            }

            if (mustGenerateComponent(entity, constants.PRODUCER_COMPONENT)) {
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
        };

        const writeProperties = (kafkaPreviousConfiguration, kafkaPreviousTestConfiguration, entity) => {
            if (entity === constants.NO_ENTITY) {
                return;
            }

            if (mustGenerateComponent(entity, constants.CONSUMER_COMPONENT)) {
                if (!kafkaPreviousConfiguration.kafka.consumer) {
                    kafkaPreviousConfiguration.kafka.consumer = {};
                }
                if (!kafkaPreviousTestConfiguration.kafka.consumer) {
                    kafkaPreviousTestConfiguration.kafka.consumer = {};
                }
                kafkaPreviousConfiguration.kafka.consumer[`${_.camelCase(entity)}`] = files.buildJsonConsumerConfiguration(
                    this,
                    entity,
                    true
                );
                kafkaPreviousTestConfiguration.kafka.consumer[`${_.camelCase(entity)}`] = files.buildJsonConsumerConfiguration(
                    this,
                    entity,
                    false
                );
            }

            if (mustGenerateComponent(entity, constants.PRODUCER_COMPONENT)) {
                if (!kafkaPreviousConfiguration.kafka.producer) {
                    kafkaPreviousConfiguration.kafka.producer = {};
                }
                if (!kafkaPreviousTestConfiguration.kafka.producer) {
                    kafkaPreviousTestConfiguration.kafka.producer = {};
                }
                kafkaPreviousConfiguration.kafka.producer[`${_.camelCase(entity)}`] = files.buildJsonProducerConfiguration(
                    this,
                    entity,
                    true
                );
                kafkaPreviousTestConfiguration.kafka.producer[`${_.camelCase(entity)}`] = files.buildJsonProducerConfiguration(
                    this,
                    entity,
                    false
                );
            }
        };

        if (this.generationType === constants.BIGBANG_MODE) {
            shelljs.rm('-rf', `${javaDir}service/kafka/`);
        }

        if (containsComponent(constants.CONSUMER_COMPONENT)) {
            this.template(
                'src/main/java/package/service/kafka/GenericConsumer.java.ejs',
                `${javaDir}service/kafka/GenericConsumer.java`,
                null,
                null
            );
        }

        if (containsComponent(constants.CONSUMER_COMPONENT) || containsComponent(constants.PRODUCER_COMPONENT)) {
            this.template('src/main/java/package/config/KafkaProperties.java.ejs', `${javaDir}config/KafkaProperties.java`, null, null);
        }

        this.entities.forEach(entity => {
            writeComponents(entity, true);
        });

        this.componentsPrefixes.forEach(prefix => {
            writeComponents(utils.transformToJavaClassNameCase(prefix), false);
        });

        if (this.generationType === constants.INCREMENTAL_MODE) {
            const kafkaPreviousConfiguration = utils.getPreviousKafkaConfiguration(
                this,
                `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
                this.isFirstGeneration
            );
            const kafkaPreviousTestConfiguration = utils.getPreviousKafkaConfiguration(
                this,
                `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
                this.isFirstGeneration
            );

            // eslint-disable-next-line no-template-curly-in-string
            kafkaPreviousConfiguration.kafka['bootstrap.servers'] = '${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}';
            // eslint-disable-next-line no-template-curly-in-string
            kafkaPreviousTestConfiguration.kafka['bootstrap.servers'] = '${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}';

            if (this.pollingTimeout) {
                kafkaPreviousConfiguration.kafka['polling.timeout'] = this.pollingTimeout;
                kafkaPreviousTestConfiguration.kafka['polling.timeout'] = this.pollingTimeout;
            }

            this.entities.forEach(entity => {
                writeProperties(kafkaPreviousConfiguration, kafkaPreviousTestConfiguration, entity);
            });

            this.componentsPrefixes.forEach(prefix => {
                writeProperties(kafkaPreviousConfiguration, kafkaPreviousTestConfiguration, utils.transformToJavaClassNameCase(prefix));
            });

            const kafkaProperties = jsYaml.dump(utils.orderKafkaProperties(kafkaPreviousConfiguration), {
                lineWidth: -1
            });
            const kafkaTestProperties = jsYaml.dump(utils.orderKafkaProperties(kafkaPreviousTestConfiguration), {
                lineWidth: -1
            });

            const kafkaBlockPattern = /^(\n)?^kafka:\n(?:^[ ]+.*\n?)*$/gm;
            this.replaceContent(
                `${resourceDir}config/application.yml`,
                kafkaBlockPattern,
                `\n${files.sanitizeProperties(kafkaProperties)}`
            );
            this.replaceContent(
                `${testResourceDir}config/application.yml`,
                kafkaBlockPattern,
                `\n${files.sanitizeProperties(kafkaTestProperties)}`
            );
        } else {
            // big bang properties writing
            const kafkaProperties = generateKafkaProperties(true);
            this.log(`kafkaProperties=\n\n${kafkaProperties}\n\n`);

            const kafkaTestProperties = generateKafkaProperties(false);
            this.log(`kafkaTestProperties=\n\n${kafkaTestProperties}\n\n`);

            const kafkaBlockPattern = /\n+kafka:\n(\s.+\n+)+/g;
            this.replaceContent(`${resourceDir}config/application.yml`, kafkaBlockPattern, kafkaProperties);
            this.replaceContent(`${testResourceDir}config/application.yml`, kafkaBlockPattern, kafkaTestProperties);
        }

        this.writeKafkaDockerYaml();
    }

    /**
     * Define in this module has been already use, thanks to hookFile
     * @returns {boolean}
     */
    hasKafkaModuleAlreadyUsed() {
        if (!shelljs.test('-f', constants.MODULES_HOOK_FILE)) {
            return false;
        }

        return shelljs.cat(constants.MODULES_HOOK_FILE).match(constants.MODULE_NAME) !== null;
    }

    writeKafkaDockerYaml() {
        this.kafkaVersion = jhipsterConstants.KAFKA_VERSION;
        this.dockerComposeFormatVersion = jhipsterConstants.DOCKER_COMPOSE_FORMAT_VERSION;
        this.dockerZookeeper = jhipsterConstants.DOCKER_ZOOKEEPER;
        this.dockerKafka = jhipsterConstants.DOCKER_KAFKA;
        this.dockerAkhq = 'tchiotludo/akhq:0.14.1';

        this.log(`kafkaVersion=${this.kafkaVersion}`);
        this.log(`dockerComposeFormatVersion=${this.dockerComposeFormatVersion}`);
        this.log(`dockerZookeeper=${this.dockerZookeeper}`);
        this.log(`dockerKafka=${this.dockerKafka}`);
        this.log(`dockerAkhq=${this.dockerAkhq}`);

        this.template('src/main/docker/akhq.yml.ejs', `${jhipsterConstants.MAIN_DIR}docker/akhq.yml`, this, null, null);

        // Related to: https://github.com/jhipster/generator-jhipster/issues/11846
        this.overrideMainGeneratorAppYml();
    }

    cleanMainGeneratorKafkaFiles(javaDir, testDir) {
        this.removeFile(`${javaDir}web/rest/${this.upperFirstCamelCase(this.baseName)}KafkaResource.java`);
        this.removeFile(`${testDir}web/rest/${this.upperFirstCamelCase(this.baseName)}KafkaResourceIT.java`);
    }

    registerToEntityPostHook() {
        try {
            this.registerModule(
                constants.MODULE_NAME,
                'entity',
                'post',
                'entity',
                'A JHipster module to generate Apache Kafka consumers and producers.'
            );
        } catch (err) {
            this.log(`${chalk.red.bold('WARN!')} Could not register as a jhipster entity post creation hook...\n`);
        }
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
