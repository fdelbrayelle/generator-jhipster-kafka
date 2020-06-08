const _ = require('lodash');
const chalk = require('chalk');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const jhipsterUtils = require('generator-jhipster/generators/utils');
const jsYaml = require('js-yaml');
const shelljs = require('shelljs');

const constants = require('../constants');
const utils = require('./utils');

module.exports = {
    writeFiles
};

function initVariables(generator) {
    const vavrVersion = '0.10.3';
    generator.addMavenProperty('vavr.version', vavrVersion);
    generator.addGradleProperty('vavr_version', vavrVersion);
    generator.addMavenDependency('io.vavr', 'vavr', '${vavr.version}'); // eslint-disable-line no-template-curly-in-string
    generator.addGradleDependency('implementation', 'io.vavr', 'vavr', '${vavr_version}'); // eslint-disable-line no-template-curly-in-string

    // read config from .yo-rc.json
    generator.baseName = generator.jhipsterAppConfig.baseName;
    generator.dasherizedBaseName = _.kebabCase(generator.baseName);
    generator.snakeCaseBaseName = _.snakeCase(generator.baseName);
    generator.packageName = generator.jhipsterAppConfig.packageName;
    generator.packageFolder = generator.jhipsterAppConfig.packageFolder;
    generator.clientFramework = generator.jhipsterAppConfig.clientFramework;
    generator.clientPackageManager = generator.jhipsterAppConfig.clientPackageManager;
    generator.buildTool = generator.jhipsterAppConfig.buildTool;
    // use function in generator-base.js from generator-jhipster
    generator.angularAppName = generator.getAngularAppName();

    // use constants from generator-constants.js
    generator.javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR + generator.packageFolder}/`;
    generator.resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
    generator.testDir = `${jhipsterConstants.SERVER_TEST_SRC_DIR + generator.packageFolder}/`;
    generator.testResourceDir = jhipsterConstants.SERVER_TEST_RES_DIR;
    generator.webappDir = jhipsterConstants.CLIENT_MAIN_SRC_DIR;

    // variables from questions
    generator.generationType = generator.props.generationType;
    generator.entities = generator.props.entities || [];
    generator.componentsPrefixes = generator.props.componentsPrefixes || [];
    generator.components = generator.props.components;
    generator.componentsByEntityConfig = generator.props.componentsByEntityConfig || [];
    generator.topics = generator.props.topics;
    generator.pollingTimeout = generator.props.pollingTimeout;
    generator.autoOffsetResetPolicy = generator.props.autoOffsetResetPolicy;

    // show all variables
    generator.log('\n--- some config read from config ---');
    generator.log(`baseName=${generator.baseName}`);
    generator.log(`packageName=${generator.packageName}`);
    generator.log(`clientFramework=${generator.clientFramework}`);
    generator.log(`clientPackageManager=${generator.clientPackageManager}`);
    generator.log(`buildTool=${generator.buildTool}`);

    generator.log('\n--- some function ---');
    generator.log(`angularAppName=${generator.angularAppName}`);

    generator.log('\n--- some const ---');
    generator.log(`javaDir=${generator.javaDir}`);
    generator.log(`resourceDir=${generator.resourceDir}`);
    generator.log(`testDir=${generator.testDir}`);
    generator.log(`resourceDir=${generator.testResourceDir}`);
    generator.log(`webappDir=${generator.webappDir}`);
    generator.log(`dockerComposeFormatVersion=${generator.dockerComposeFormatVersion}`);
    generator.log(`dockerAkhq=${generator.dockerAkhq}`);

    if (generator.options['skip-prompts']) {
        generator.log('\n------');
        generator.log('Skipping prompts...');
    } else {
        generator.log('\n--- variables from questions ---');
        generator.log(`\ncomponents=${generator.components}`);
        generator.log(`\nentities=${generator.entities}`);
        generator.log(`\ncomponentsPrefixes=${generator.componentsPrefixes}`);
        generator.log(`\npollingTimeout=${generator.pollingTimeout}`);
        generator.log(`\nautoOffsetResetPolicy=${generator.autoOffsetResetPolicy}`);
    }
    generator.log('------\n');
}

function writeFiles(generator) {
    initVariables(generator);

    registerToEntityPostHook(generator);

    cleanMainGeneratorKafkaFiles(generator, generator.javaDir, generator.testDir);

    const isFirstGeneration = () => {
        if (!shelljs.test('-f', constants.MODULES_HOOK_FILE)) {
            return true;
        }

        return shelljs.cat(constants.MODULES_HOOK_FILE).match(constants.MODULE_NAME) === null;
    };

    const generateKafkaProperties = (generator, enabled) => {
        generator.enabled = enabled;

        let generatedKafkaProperties = constants.EMPTY_STRING;
        jhipsterUtils.renderContent(
            generator.templatePath('src/main/resources/application-kafka.yml.ejs'),
            generator,
            generator,
            {},
            res => {
                generatedKafkaProperties = res;
            }
        );
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
            generator.props.componentsByEntityConfig &&
            generator.props.componentsByEntityConfig[entityName] &&
            generator.props.componentsByEntityConfig[entityName].includes(componentType)
        );
    };

    /**
     * Search if a component type is present at least once in the asked generations.
     * @param componentType
     * @returns {boolean|boolean|*}
     */
    const containsComponent = componentType => {
        if (generator.props.generationType === constants.BIGBANG_MODE) {
            return generator.props.components.includes(componentType) && generator.entities.length > 0;
        }

        if (generator.props.generationType === constants.INCREMENTAL_MODE) {
            let haveComponentWithoutEntity = false;
            generator.props.componentsPrefixes.forEach(prefix => {
                haveComponentWithoutEntity = haveComponentForEntity(prefix, componentType);
            });

            return (
                haveComponentWithoutEntity ||
                (generator.props.entities.length > 0 &&
                    generator.props.entities.find(entityName => haveComponentForEntity(entityName, componentType)))
            );
        }

        return false;
    };

    /**
     * Search if a component type must be generated for an entity.
     * @param entityName
     * @param componentType - Producer or Consumer
     * @returns {boolean|*}
     */
    const mustGenerateComponent = (entityName, componentType) => {
        if (generator.props.generationType === constants.BIGBANG_MODE) {
            return generator.props.components.includes(componentType);
        }
        if (generator.props.generationType === constants.INCREMENTAL_MODE) {
            return haveComponentForEntity(entityName, componentType);
        }
        return false;
    };

    const writeComponents = (entity, useEntityAsType) => {
        if (entity === constants.NO_ENTITY) {
            return;
        }

        generator.entityClass = entity;
        generator.camelCaseEntityClass = _.camelCase(entity);
        generator.type = useEntityAsType ? entity : 'String';

        if (mustGenerateComponent(entity, constants.CONSUMER_COMPONENT)) {
            generator.template(
                'src/main/java/package/service/kafka/consumer/EntityConsumer.java.ejs',
                `${generator.javaDir}service/kafka/consumer/${entity}Consumer.java`,
                null,
                null
            );
            generator.template(
                'src/main/java/package/service/kafka/deserializer/EntityDeserializer.java.ejs',
                `${generator.javaDir}service/kafka/deserializer/${entity}Deserializer.java`,
                null,
                null
            );
        }

        if (mustGenerateComponent(entity, constants.PRODUCER_COMPONENT)) {
            generator.template(
                'src/main/java/package/service/kafka/producer/EntityProducer.java.ejs',
                `${generator.javaDir}service/kafka/producer/${entity}Producer.java`,
                null,
                null
            );
            generator.template(
                'src/main/java/package/service/kafka/serializer/EntitySerializer.java.ejs',
                `${generator.javaDir}service/kafka/serializer/${entity}Serializer.java`,
                null,
                null
            );
            generator.template(
                'src/main/java/package/web/rest/kafka/EntityKafkaResource.java.ejs',
                `${generator.javaDir}web/rest/kafka/${entity}KafkaResource.java`,
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
            kafkaPreviousConfiguration.kafka.consumer[`${_.camelCase(entity)}`] = buildJsonConsumerConfiguration(generator, entity, true);
            kafkaPreviousTestConfiguration.kafka.consumer[`${_.camelCase(entity)}`] = buildJsonConsumerConfiguration(
                generator,
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
            kafkaPreviousConfiguration.kafka.producer[`${_.camelCase(entity)}`] = buildJsonProducerConfiguration(generator, entity, true);
            kafkaPreviousTestConfiguration.kafka.producer[`${_.camelCase(entity)}`] = buildJsonProducerConfiguration(
                generator,
                entity,
                false
            );
        }
    };

    if (generator.generationType === constants.BIGBANG_MODE) {
        shelljs.rm('-rf', `${generator.javaDir}service/kafka/`, `${generator.javaDir}web/rest/kafka/`);
    }

    if (generator.options['skip-prompts'] || containsComponent(constants.CONSUMER_COMPONENT)) {
        generator.template(
            'src/main/java/package/service/kafka/GenericConsumer.java.ejs',
            `${generator.javaDir}service/kafka/GenericConsumer.java`,
            null,
            null
        );
        generator.template(
            'src/main/java/package/service/kafka/deserializer/DeserializationError.java.ejs',
            `${generator.javaDir}service/kafka/deserializer/DeserializationError.java`,
            null,
            null
        );
    }

    if (containsComponent(constants.CONSUMER_COMPONENT) || containsComponent(constants.PRODUCER_COMPONENT)) {
        generator.template(
            'src/main/java/package/config/KafkaProperties.java.ejs',
            `${generator.javaDir}config/KafkaProperties.java`,
            null,
            null
        );
    }

    generator.entities.forEach(entity => {
        writeComponents(entity, true);
    });

    generator.componentsPrefixes.forEach(prefix => {
        writeComponents(utils.transformToJavaClassNameCase(prefix), false);
    });

    if (generator.generationType === constants.INCREMENTAL_MODE) {
        const kafkaPreviousConfiguration = utils.getPreviousKafkaConfiguration(
            generator,
            `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
            isFirstGeneration()
        );

        const kafkaPreviousTestConfiguration = utils.getPreviousKafkaConfiguration(
            generator,
            `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
            isFirstGeneration()
        );

        // eslint-disable-next-line no-template-curly-in-string
        kafkaPreviousConfiguration.kafka['bootstrap.servers'] = '${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}';
        // eslint-disable-next-line no-template-curly-in-string
        kafkaPreviousTestConfiguration.kafka['bootstrap.servers'] = '${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}';

        if (generator.pollingTimeout) {
            kafkaPreviousConfiguration.kafka['polling.timeout'] = generator.pollingTimeout;
            kafkaPreviousTestConfiguration.kafka['polling.timeout'] = generator.pollingTimeout;
        }

        generator.entities.forEach(entity => {
            writeProperties(kafkaPreviousConfiguration, kafkaPreviousTestConfiguration, entity);
        });

        generator.componentsPrefixes.forEach(prefix => {
            writeProperties(kafkaPreviousConfiguration, kafkaPreviousTestConfiguration, utils.transformToJavaClassNameCase(prefix));
        });

        if (!kafkaPreviousConfiguration.kafka.topic) {
            kafkaPreviousConfiguration.kafka.topic = {};
        }

        if (!kafkaPreviousTestConfiguration.kafka.topic) {
            kafkaPreviousTestConfiguration.kafka.topic = {};
        }

        generator.topics.forEach(topic => {
            kafkaPreviousConfiguration.kafka.topic[topic.key] = topic.value;
            kafkaPreviousTestConfiguration.kafka.topic[topic.key] = topic.value;
        });

        const kafkaProperties = jsYaml.dump(utils.orderKafkaProperties(kafkaPreviousConfiguration), {
            lineWidth: -1
        });
        const kafkaTestProperties = jsYaml.dump(utils.orderKafkaProperties(kafkaPreviousTestConfiguration), {
            lineWidth: -1
        });

        const kafkaBlockPattern = /^(\n)?^kafka:\n(?:^[ ]+.*\n?)*$/gm;
        generator.replaceContent(
            `${generator.resourceDir}config/application.yml`,
            kafkaBlockPattern,
            `\n${sanitizeProperties(kafkaProperties)}`
        );
        generator.replaceContent(
            `${generator.testResourceDir}config/application.yml`,
            kafkaBlockPattern,
            `\n${sanitizeProperties(kafkaTestProperties)}`
        );
    } else {
        // big bang properties writing
        const kafkaProperties = generateKafkaProperties(generator, true);
        generator.log(`application.yml (src/main/resources) kafka block will be updated like this:${kafkaProperties}`);

        const kafkaTestProperties = generateKafkaProperties(generator, false);
        generator.log(`application.yml (src/test/resources) kafka block will be updated like this:${kafkaTestProperties}`);

        const kafkaBlockPattern = /\n+kafka:\n(\s.+\n+)+/g;
        generator.replaceContent(`${generator.resourceDir}config/application.yml`, kafkaBlockPattern, kafkaProperties);
        generator.replaceContent(`${generator.testResourceDir}config/application.yml`, kafkaBlockPattern, kafkaTestProperties);
    }

    writeKafkaDockerYaml(generator);
}

function buildJsonConsumerConfiguration(generator, entity, enabled) {
    return {
        enabled,
        '[key.deserializer]': 'org.apache.kafka.common.serialization.StringDeserializer',
        '[value.deserializer]': `${generator.packageName}.service.kafka.deserializer.${entity}Deserializer`,
        '[group.id]': `${generator.dasherizedBaseName}`,
        '[auto.offset.reset]': `${generator.autoOffsetResetPolicy}`
    };
}

function buildJsonProducerConfiguration(generator, entity, enabled) {
    return {
        enabled,
        '[key.serializer]': 'org.apache.kafka.common.serialization.StringSerializer',
        '[value.serializer]': `${generator.packageName}.service.kafka.serializer.${entity}Serializer`
    };
}
function sanitizeProperties(jsyamlGeneratedProperties) {
    // Related to: https://github.com/nodeca/js-yaml/issues/470
    const patternContainingSingleQuote = /^(\s.+)(:[ ]+)('((.+:)+.*)')$/gm;
    // Related to: https://github.com/nodeca/js-yaml/issues/478
    const patternNullGeneratedValue = /^(\s.+)(:)([ ]+null.*)$/gm;
    return jsyamlGeneratedProperties.replace(patternContainingSingleQuote, '$1$2$4').replace(patternNullGeneratedValue, '$1$2');
}

function writeKafkaDockerYaml(generator) {
    generator.kafkaVersion = jhipsterConstants.KAFKA_VERSION;
    generator.dockerComposeFormatVersion = jhipsterConstants.DOCKER_COMPOSE_FORMAT_VERSION;
    generator.dockerZookeeper = jhipsterConstants.DOCKER_ZOOKEEPER;
    generator.dockerKafka = jhipsterConstants.DOCKER_KAFKA;
    generator.dockerAkhq = 'tchiotludo/akhq:0.14.1';

    generator.log(`kafkaVersion=${generator.kafkaVersion}`);
    generator.log(`dockerComposeFormatVersion=${generator.dockerComposeFormatVersion}`);
    generator.log(`dockerZookeeper=${generator.dockerZookeeper}`);
    generator.log(`dockerKafka=${generator.dockerKafka}`);
    generator.log(`dockerAkhq=${generator.dockerAkhq}`);

    generator.template('src/main/docker/akhq.yml.ejs', `${jhipsterConstants.MAIN_DIR}docker/akhq.yml`, generator, null, null);

    // Related to: https://github.com/jhipster/generator-jhipster/issues/11846
    overrideMainGeneratorAppYml(generator);
}

function registerToEntityPostHook(generator) {
    try {
        generator.registerModule(
            constants.MODULE_NAME,
            'entity',
            'post',
            'entity',
            'A JHipster module that generates Apache Kafka consumers and producers and more!'
        );
    } catch (e) {
        generator.log(`${chalk.red.bold('WARN!')} Could not register as a jhipster entity post creation hook...\n`, e);
    }
}

function cleanMainGeneratorKafkaFiles(generator, javaDir, testDir) {
    generator.removeFile(`${javaDir}web/rest/${generator.upperFirstCamelCase(generator.baseName)}KafkaResource.java`);
    generator.removeFile(`${testDir}web/rest/${generator.upperFirstCamelCase(generator.baseName)}KafkaResourceIT.java`);
}

function overrideMainGeneratorAppYml(generator) {
    const appYmlPath = `${jhipsterConstants.MAIN_DIR}docker/app.yml`;

    const kafkaBootstrapServersPattern = /^\s.*KAFKA_BOOTSTRAPSERVERS.*$/gm;
    const kafkaBootstrapServers = '      - KAFKA_BOOTSTRAP_SERVERS=kafka:29092';
    generator.replaceContent(appYmlPath, kafkaBootstrapServersPattern, kafkaBootstrapServers);

    const kafkaAdvertisedListenersPattern = /^\s.*KAFKA_ADVERTISED_LISTENERS.*$/gm;
    const kafkaAdvertisedListeners = '      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092';
    generator.replaceContent(appYmlPath, kafkaAdvertisedListenersPattern, kafkaAdvertisedListeners);
}
