const _ = require('lodash');
const chalk = require('chalk');
const jsYaml = require('js-yaml');
const fs = require('fs');

function transformToJavaClassNameCase(entityName) {
    return _.upperFirst(_.camelCase(entityName));
}

function loadPreviousConfiguration(pathOfApplicationYaml) {
    try {
        return jsYaml.safeLoad(fs.readFileSync(`${pathOfApplicationYaml}`, 'utf8'));
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log(
            `${chalk.red.bold('WARN!')} Could not parse the previous Kafka configuration, the previous configuration could be overwritten\n`
        );
    }
    return {};
}

function getPreviousKafkaConfiguration(pathOfApplicationYaml, forceCleanConfiguration = false) {
    const previousGlobalConfiguration = loadPreviousConfiguration(pathOfApplicationYaml);
    if (previousGlobalConfiguration.kafka && !forceCleanConfiguration) {
        return { kafka: previousGlobalConfiguration.kafka };
    }
    return {
        kafka: {}
    };
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
