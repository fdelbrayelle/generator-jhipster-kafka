const _ = require('lodash');

const buildJsonConsumerConfiguration = (context, entity, enabled) => {
    return {
        name: `queuing.${context.snakeCaseBaseName}.${_.snakeCase(entity)}`,
        enabled,
        '[key.deserializer]': 'org.apache.kafka.common.serialization.StringDeserializer',
        '[value.deserializer]': `${context.packageName}.service.kafka.deserializer.${entity}Deserializer`,
        '[group.id]': `${context.dasherizedBaseName}`,
        '[auto.offset.reset]': `${context.autoOffsetResetPolicy}`
    };
};

function buildJsonProducerConfiguration(context, entity, enabled) {
    return {
        name: `queuing.${context.snakeCaseBaseName}.${_.snakeCase(entity)}`,
        enabled,
        '[key.serializer]': 'org.apache.kafka.common.serialization.StringSerializer',
        '[value.serializer]': `${context.packageName}.service.kafka.serializer.${entity}Serializer`
    };
}

module.exports = {
    buildJsonConsumerConfiguration,
    buildJsonProducerConfiguration
};
