const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const jsYaml = require('js-yaml');

module.exports = {
    getPreviousKafkaConfiguration,
    extractEntitiesComponents
};

function transformToJavaClassNameCase(entityName) {
    return _.upperFirst(_.camelCase(entityName));
}

function loadPreviousConfiguration(context, pathOfApplicationYaml) {
    try {
        return jsYaml.safeLoad(fs.readFileSync(`${pathOfApplicationYaml}`, 'utf8'));
    } catch (err) {
        context.log(
            `${chalk.red.bold('WARN!')} Could not parse the previous Kafka configuration, the previous configuration could be overwritten\n`
        );
    }
    return {};
}

function getPreviousKafkaConfiguration(context, pathOfApplicationYaml, forceCleanConfiguration = false) {
    const previousGlobalConfiguration = loadPreviousConfiguration(context, pathOfApplicationYaml);
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
