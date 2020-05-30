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

/**
 * Return the kafka configuration as a Json Object from properties at #{param pathOfApplicationYaml}
 * or return an empty configuration.
 *
 * @param {Object} context - the Execution context (ex: generator).
 * @param pathOfApplicationYaml - the path to yaml file {@see jsYaml}
 * @param boolean forceCleanConfiguration - to retrieve an empty configuration.
 * @return {Object} - Json object representing all kafka yaml block. {@see jsYaml#safeLoad}
 */
function getPreviousKafkaConfiguration(context, pathOfApplicationYaml, forceCleanConfiguration = false) {
    const previousGlobalConfiguration = loadPreviousConfiguration(context, pathOfApplicationYaml);
    if (previousGlobalConfiguration.kafka && !forceCleanConfiguration) {
        return { kafka: previousGlobalConfiguration.kafka };
    }
    return {
        kafka: {}
    };
}

/**
 * Extract from {Object} previousKafkaConfiguration all consumers.
 *
 * @param {Object} previousKafkaConfiguration - the previous kafka configuration as Json {@see jsYaml}
 * @return [Array] - array listing all entities having a consumers.
 */
function extractConsumerEntitiesName(previousKafkaConfiguration) {
    const consumerEntities = [];
    if (previousKafkaConfiguration && previousKafkaConfiguration.consumer) {
        Object.keys(previousKafkaConfiguration.consumer).forEach(key => {
            consumerEntities.push(`${transformToJavaClassNameCase(key)}`);
        });
    }
    return consumerEntities;
}
/**
 * Extract from {Object} previousKafkaConfiguration all producers.
 *
 * @param {Object} previousKafkaConfiguration - the previous kafka configuration as Json {@see jsYaml}
 * @return [Array] - array listing all entities having a producers.
 */
function extractProducerEntitiesName(previousKafkaConfiguration) {
    const producerEntities = [];
    if (previousKafkaConfiguration && previousKafkaConfiguration.producer) {
        Object.keys(previousKafkaConfiguration.producer).forEach(key => {
            producerEntities.push(`${transformToJavaClassNameCase(key)}`);
        });
    }
    return producerEntities;
}
/**
 * Construct an object with all producers and consumers by entity
 *
 * @param {Object} previousKafkaConfiguration - the previous kafka configuration as Json {@see jsYaml}
 * @return {producers:[],consumers:[]} - object listing all entities having a producers or/and a consumer.
 */
function extractEntitiesComponents(previousKafkaConfiguration) {
    return {
        producers: extractProducerEntitiesName(previousKafkaConfiguration),
        consumers: extractConsumerEntitiesName(previousKafkaConfiguration)
    };
}
