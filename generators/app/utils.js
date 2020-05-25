const chalk = require('chalk');
const _ = require('lodash');
const jsYaml = require('js-yaml');
const fsModule = require('fs');

exports.module = {
    getPreviousKafkaConfiguration,
    extractConsumerEntitiesName,
    extractProducerEntitiesName
};
function _transformToJavaClassNameCase(entityName) {
    return _.upperFirst(_.camelCase(entityName));
}
function _loadPreviousConfiguration(pathOfApplicationYaml) {
    try {
        return jsYaml.safeLoad(fsModule.readFileSync(`${pathOfApplicationYaml}`, 'utf8'));
    } catch (err) {
        this.log(
            `${chalk.red.bold('WARN!')} Could not parse the previous Kafka configuration, the previous configuration could be overwritten\n`
        );
    }
    return {};
}

function getPreviousKafkaConfiguration(pathOfApplicationYaml) {
    const previousGlobalConfiguration = _loadPreviousConfiguration();
    if (previousGlobalConfiguration.kafka) {
        return previousGlobalConfiguration.kafka;
    }
    return {};
}

function extractConsumerEntitiesName(previousKafkaConfiguration) {
    const consumerEntities = [];
    if (previousKafkaConfiguration && previousKafkaConfiguration.consumer) {
        Object.keys(previousKafkaConfiguration.consumer).forEach(key => {
            consumerEntities.push(`${_transformToJavaClassNameCase(key)}`);
        });
    }
    return consumerEntities;
}

function extractProducerEntitiesName(previousKafkaConfiguration) {
    const producerEntities = [];
    if (previousKafkaConfiguration && previousKafkaConfiguration.producer) {
        Object.keys(previousKafkaConfiguration.producer).forEach(key => {
            producerEntities.push(`${_transformToJavaClassNameCase(key)}`);
        });
    }
    return producerEntities;
}

// eslint-disable-next-line no-unused-vars
function extractDefaultPromptValues(previousKafkaConfiguration, possibleComponents) {
    const defaultComponents = [];
    const defaultEntities = [];
    if (previousKafkaConfiguration) {
        if (previousKafkaConfiguration.consumer) {
            defaultComponents.push(possibleComponents.find(choice => choice.value === 'consumer').value);
            Object.keys(previousKafkaConfiguration.consumer).forEach(key => {
                defaultEntities.push(`${_transformToJavaClassNameCase(key)}`);
            });
        }
        if (previousKafkaConfiguration.producer) {
            defaultComponents.push(possibleComponents.find(choice => choice.value === 'producer').value);
            Object.keys(previousKafkaConfiguration.producer).forEach(key => {
                defaultEntities.push(`${_transformToJavaClassNameCase(key)}`);
            });
        }
    }
    return {
        components: defaultComponents,
        entities: [...new Set(defaultEntities)] //
    };
}
