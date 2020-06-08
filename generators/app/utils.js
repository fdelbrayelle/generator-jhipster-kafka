const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const jsYaml = require('js-yaml');

module.exports = {
    getPreviousKafkaConfiguration,
    extractEntitiesComponents,
    orderKafkaProperties,
    transformToJavaClassNameCase,
    topicNamingFormat
};

// This is a default topic naming convention which can be updated (see also application-kafka.yml.ejs)
function topicNamingFormat(baseName, name) {
    return `queuing.${baseName}.${name}`;
}

function transformToJavaClassNameCase(entityName) {
    return _.upperFirst(_.camelCase(entityName));
}

function loadPreviousConfiguration(generator, pathOfApplicationYaml) {
    try {
        return jsYaml.safeLoad(fs.readFileSync(`${pathOfApplicationYaml}`, 'utf8'));
    } catch (e) {
        generator.log(
            `${chalk.red.bold(
                'WARN!'
            )} Could not parse the previous Kafka configuration, the previous configuration could be overwritten\n`,
            e
        );
    }
    return {};
}

/**
 * Return the kafka configuration as a Json Object from properties at #{param pathOfApplicationYaml}
 * or return an empty configuration.
 *
 * @param {Object} generator
 * @param pathOfApplicationYaml - the path to yaml file {@see jsYaml}
 * @param boolean forceCleanConfiguration - to retrieve an empty configuration.
 * @return {Object} - Json object representing all kafka yaml block. {@see jsYaml#safeLoad}
 */
function getPreviousKafkaConfiguration(generator, pathOfApplicationYaml, forceCleanConfiguration = false) {
    const previousGlobalConfiguration = loadPreviousConfiguration(generator, pathOfApplicationYaml);
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

function orderKafkaProperties(properties = {}) {
    if (!properties.kafka) {
        return {};
    }
    const kafkaOrderedProperties = { kafka: {} };

    Object.entries(properties.kafka)
        .sort((a, b) => {
            // sort by type of values, put complex type at the end
            if (typeof a[1] === 'object' && typeof b[1] !== 'object') {
                return 1;
            }
            if (typeof a[1] !== 'object' && typeof b[1] === 'object') {
                return -1;
            }
            // then compare by key
            return a[0].localeCompare(b[0]);
        })
        .forEach(currentProps => {
            kafkaOrderedProperties.kafka[currentProps[0]] = currentProps[1];
        });

    return kafkaOrderedProperties;
}
