const _ = require('lodash');
const chalk = require('chalk');
const jsYaml = require('js-yaml');
const fsModule = require('fs');

function transformToJavaClassNameCase(entityName) {
    return _.upperFirst(_.camelCase(entityName));
}

function loadPreviousConfiguration(pathOfApplicationYaml) {
    try {
        return jsYaml.safeLoad(fsModule.readFileSync(`${pathOfApplicationYaml}`, 'utf8'));
    } catch (err) {
        console.log(
            `${chalk.red.bold('WARN!')} Could not parse the previous Kafka configuration, the previous configuration could be overwritten\n`
        );
    }
    return {};
}

function getPreviousKafkaConfiguration(pathOfApplicationYaml) {
    const previousGlobalConfiguration = loadPreviousConfiguration(pathOfApplicationYaml);
    if (previousGlobalConfiguration.kafka) {
        return { kafka: previousGlobalConfiguration.kafka };
    }
    return { kafka: {} };
}

function extractConsumerEntitiesName(previousKafkaConfiguration) {
    const consumerEntities = [];
    if (previousKafkaConfiguration && previousKafkaConfiguration.consumer) {
        Object.keys(previousKafkaConfiguration.consumer).forEach(key => {
            consumerEntities.push(`${transformToJavaClassNameCase(key)}`);
        });
    }
    return consumerEntities;
}

function extractProducerEntitiesName(previousKafkaConfiguration) {
    const producerEntities = [];
    if (previousKafkaConfiguration && previousKafkaConfiguration.producer) {
        Object.keys(previousKafkaConfiguration.producer).forEach(key => {
            producerEntities.push(`${transformToJavaClassNameCase(key)}`);
        });
    }
    return producerEntities;
}

function extractEntitiesComponents(previousKafkaConfiguration) {
    return {
        producers: extractProducerEntitiesName(previousKafkaConfiguration),
        consumers: extractConsumerEntitiesName(previousKafkaConfiguration)
    };
}

module.exports = {
    getPreviousKafkaConfiguration,
    extractEntitiesComponents
};
