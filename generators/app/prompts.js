const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

const constants = require('../constants');
const utils = require('./utils.js');

module.exports = {
    askForOperations
};

const previousConfiguration = (generator, cleanup = false) =>
    utils.getPreviousKafkaConfiguration(generator, `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, cleanup).kafka;

function offsetChoices() {
    return [
        {
            name: 'earliest (automatically reset the offset to the earliest offset)',
            value: constants.EARLIEST_OFFSET
        },
        {
            name: 'latest (automatically reset the offset to the latest offset)',
            value: constants.LATEST_OFFSET
        },
        {
            name: 'none (throw exception to the consumer if no previous offset is found for the consumer group)',
            value: constants.NONE_OFFSET
        }
    ];
}

function componentsChoices() {
    return [
        {
            name: 'Consumer',
            value: constants.CONSUMER_COMPONENT
        },
        {
            name: 'Producer',
            value: constants.PRODUCER_COMPONENT
        }
    ];
}

function topicsChoices(generator, previousConfiguration) {
    const topicsChoices = [];
    topicsChoices.push({
        name: 'Default topic name following this convention: message_type.application_type.entity_name',
        value: constants.DEFAULT_TOPIC
    });
    topicsChoices.push({
        name: 'Custom topic name',
        value: constants.CUSTOM_TOPIC
    });

    if (previousConfiguration && previousConfiguration.topic) {
        Object.entries(previousConfiguration.topic).forEach(topic => {
            if (!topicsChoices.some(t => t.name === topic[1])) {
                topicsChoices.push({ name: topic[1], value: topic[1] });
            }
        });
    }

    generator.props.topics.forEach(topic => {
        if (!topic.existingTopicName) {
            topicsChoices.push({ name: topic.value, value: topic.value });
        }
    });

    return topicsChoices;
}

function getDefaultPromptBootstrapServers(previousConfiguration) {
    const regexExtractConfig = /\${KAFKA_BOOTSTRAP_SERVERS:(.*)}/;
    if (
        previousConfiguration &&
        previousConfiguration['bootstrap.servers'] &&
        regexExtractConfig.test(previousConfiguration['bootstrap.servers'])
    ) {
        return previousConfiguration['bootstrap.servers'].match(regexExtractConfig)[1];
    }
    return constants.DEFAULT_BOOTSTRAP_SERVERS;
}

/**
 * Retrieve from .jhipster metadata, the list of all project entities.
 *
 * @param generator
 * @returns {[]} - all entities choices possible
 */
function entitiesChoices(generator) {
    const entitiesChoices = [];
    let existingEntityNames = [];

    entitiesChoices.push({ name: 'No entity (will be typed String)', value: constants.NO_ENTITY });

    try {
        existingEntityNames = fs.readdirSync(constants.JHIPSTER_CONFIG_DIR);
    } catch (e) {
        generator.log(`${chalk.red.bold('WARN!')} Error while reading entities folder: ${constants.JHIPSTER_CONFIG_DIR}`, e);
    }
    existingEntityNames.forEach(entry => {
        if (entry.indexOf(constants.JSON_EXTENSION) !== -1) {
            const entityName = entry.replace(constants.JSON_EXTENSION, constants.EMPTY_STRING);
            entitiesChoices.push({
                name: entityName,
                value: entityName
            });
        }
    });
    return entitiesChoices;
}

function askForOperations(generator) {
    const boostrapServersUnitPattern = /^((([a-zA-Z0-9-]+)(\.?))+(:[0-9]+)?)$/;
    function isNotValidBootstrapServerString(input) {
        return _.isEmpty(input) || input.split(',').some(bootstrapServer => boostrapServersUnitPattern.test(bootstrapServer) === false);
    }

    const prompts = [
        {
            when: !generator.options['skip-prompts'],
            type: 'confirm',
            name: 'cleanup',
            message: 'Do you want to clean up your current Kafka configuration?',
            default: false
        },
        {
            when: !generator.options['skip-prompts'],
            type: 'input',
            name: 'bootstrapServers',
            message: 'What is your bootstrap servers string connection (you can add several bootstrap servers by using a "," delimiter)?',
            validate: input => {
                return isNotValidBootstrapServerString(input) ? 'the bootstrap server string must be correct' : true;
            },
            default: response => getDefaultPromptBootstrapServers(previousConfiguration(generator, response.cleanup))
        }
    ];

    const done = generator.async();
    try {
        generator.prompt(prompts).then(answers => {
            if (answers.cleanup) {
                generator.props.cleanup = answers.cleanup;
            }
            if (answers.bootstrapServers) {
                generator.props.bootstrapServers = answers.bootstrapServers;
            }
            askForEntityOperations(generator, done);
        });
    } catch (e) {
        generator.error('An error occurred while asking for operations', e);
        done();
    }
}

function askForEntityOperations(generator, done) {
    const getConcernedEntities = previousConfiguration => {
        const allEntities = entitiesChoices(generator);
        const entitiesComponents = utils.extractEntitiesComponents(previousConfiguration);
        // exclude entities found in the previous configuration
        // and those already store for this instance execution {@see generator.props}
        return allEntities.filter(
            entityName =>
                (!entitiesComponents.consumers.includes(entityName.value) || !entitiesComponents.producers.includes(entityName.value)) &&
                (!generator.props.componentsByEntityConfig[entityName.value] ||
                    !generator.props.componentsByEntityConfig[entityName.value].includes(constants.CONSUMER_COMPONENT) ||
                    !generator.props.componentsByEntityConfig[entityName.value].includes(constants.PRODUCER_COMPONENT) ||
                    entityName.value === constants.NO_ENTITY)
        );
    };

    const entityPrompts = [
        {
            when: !generator.options['skip-prompts'],
            type: 'list',
            name: 'currentEntity',
            message: 'For which entity (class name)?',
            choices: [...getConcernedEntities(previousConfiguration(generator, generator.props.cleanup))],
            default: constants.NO_ENTITY
        },
        {
            when: response => response.currentEntity === constants.NO_ENTITY,
            type: 'input',
            name: 'currentPrefix',
            message: 'How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?',
            validate: input => {
                if (_.isEmpty(input)) return 'Please enter a value';

                if (entitiesChoices(generator).find(entity => entity.name === utils.transformToJavaClassNameCase(input))) {
                    return 'This name is already taken by an entity generated with JHipster';
                }

                const availableComponents = getAvailableComponentsWithoutEntity(
                    generator,
                    previousConfiguration(generator, generator.props.cleanup),
                    input
                );
                if (availableComponents.length === 0) return 'Both consumer and producer already exist for this prefix';

                return true;
            }
        }
    ];

    generator.prompt(entityPrompts).then(answers => {
        generator.props.currentEntity = undefined;

        if (answers.currentEntity) {
            generator.props.currentEntity = answers.currentEntity;
            generator.props.currentPrefix = answers.currentPrefix;
            if (!generator.props.entities.includes(answers.currentEntity) || answers.currentEntity !== constants.NO_ENTITY) {
                generator.props.entities.push(answers.currentEntity);
            }
            if (answers.currentPrefix && !generator.props.componentsPrefixes.includes(answers.currentPrefix)) {
                generator.props.componentsPrefixes.push(answers.currentPrefix);
            }
            askForEntityComponentsOperations(generator, done);
        } else {
            done();
        }
    });
}

function getAvailableComponentsWithoutEntity(generator, previousConfiguration, prefix) {
    const availableComponents = [];
    const allComponentChoices = componentsChoices();
    const entitiesComponents = utils.extractEntitiesComponents(previousConfiguration);
    const prefixJavaClassName = utils.transformToJavaClassNameCase(prefix);
    if (generator.props.componentsByEntityConfig) {
        const componentForPrefix = generator.props.componentsByEntityConfig[prefixJavaClassName];
        if (
            !entitiesComponents.consumers.includes(prefixJavaClassName) &&
            (!componentForPrefix || !componentForPrefix.includes(constants.CONSUMER_COMPONENT))
        ) {
            availableComponents.push(allComponentChoices.find(componentChoice => componentChoice.value === constants.CONSUMER_COMPONENT));
        }
        if (
            !entitiesComponents.producers.includes(prefixJavaClassName) &&
            (!componentForPrefix || !componentForPrefix.includes(constants.PRODUCER_COMPONENT))
        ) {
            availableComponents.push(allComponentChoices.find(componentChoice => componentChoice.value === constants.PRODUCER_COMPONENT));
        }
    }
    return availableComponents;
}

function askForEntityComponentsOperations(generator, done) {
    const getConcernedComponents = (previousConfiguration, entityName, currentPrefix) => {
        const availableComponents = [];
        const allComponentChoices = componentsChoices();
        const entitiesComponents = utils.extractEntitiesComponents(previousConfiguration);

        if (entityName === constants.NO_ENTITY) {
            return getAvailableComponentsWithoutEntity(generator, previousConfiguration, currentPrefix);
        }

        // exclude components found in the previous configuration
        // and those already store for this instance execution {@see generator.props}
        if (entitiesComponents) {
            if (
                !entitiesComponents.consumers.includes(entityName) &&
                (!generator.props.componentsByEntityConfig[entityName] ||
                    !generator.props.componentsByEntityConfig[entityName].includes(constants.CONSUMER_COMPONENT))
            ) {
                availableComponents.push(
                    allComponentChoices.find(componentChoice => componentChoice.value === constants.CONSUMER_COMPONENT)
                );
            }
            if (
                !entitiesComponents.producers.includes(entityName) &&
                (!generator.props.componentsByEntityConfig[entityName] ||
                    !generator.props.componentsByEntityConfig[entityName].includes(constants.PRODUCER_COMPONENT))
            ) {
                availableComponents.push(
                    allComponentChoices.find(componentChoice => componentChoice.value === constants.PRODUCER_COMPONENT)
                );
            }
        }
        return availableComponents;
    };

    let name = generator.props.currentEntity;
    if (generator.props.currentEntity === constants.NO_ENTITY) {
        name = generator.props.currentPrefix;
    }

    const unitaryEntityPrompt = [
        {
            when: generator.props.currentEntity,
            type: 'checkbox',
            name: 'currentEntityComponents',
            message: 'Which components would you like to generate?',
            choices: getConcernedComponents(
                previousConfiguration(generator, generator.props.cleanup),
                generator.props.currentEntity,
                generator.props.currentPrefix
            ),
            default: [],
            validate: input => (_.isEmpty(input) ? 'You have to choose at least one component' : true)
        },
        {
            when: response =>
                response.currentEntityComponents.includes(constants.CONSUMER_COMPONENT) ||
                response.currentEntityComponents.includes(constants.PRODUCER_COMPONENT),
            type: 'list',
            name: 'topic',
            message: `Which topic for ${name}?`,
            choices: topicsChoices(generator, previousConfiguration(generator, generator.props.cleanup)),
            default: constants.DEFAULT_TOPIC
        },
        {
            when: response => response.topic === constants.CUSTOM_TOPIC,
            type: 'input',
            name: 'topicName',
            message: `What is the topic name for ${name}?`,
            validate: input => validateTopic(input)
        },
        {
            when: response =>
                response.currentEntityComponents.includes(constants.CONSUMER_COMPONENT) &&
                generator.props.currentEntity &&
                !generator.props.pollingTimeout, // as it's defined for all consumers once for the moment
            type: 'number',
            name: 'pollingTimeout',
            message: 'What is the consumer polling timeout (in ms)?',
            default: constants.DEFAULT_POLLING_TIMEOUT
        },
        {
            when: response =>
                response.currentEntityComponents.includes(constants.CONSUMER_COMPONENT) &&
                generator.props.currentEntity &&
                !generator.props.autoOffsetResetPolicy, // as it's defined for all consumers once for the moment
            type: 'list',
            name: 'autoOffsetResetPolicy',
            message:
                'Define the auto offset reset policy (what to do when there is no initial offset in Kafka or if the current offset does not exist any more on the server)?',
            choices: offsetChoices(),
            default: constants.EARLIEST_OFFSET
        },
        {
            when: response => response.currentEntityComponents.includes(constants.PRODUCER_COMPONENT),
            type: 'confirm',
            name: 'sendOrderedMessages',
            message: `Do you want to send ordered messages for ${name} production?`,
            default: true
        },
        {
            type: 'confirm',
            name: 'continueAddingEntitiesComponents',
            message: 'Do you want to continue adding consumers or producers?',
            default: false
        }
    ];

    generator.prompt(unitaryEntityPrompt).then(answers => {
        if (generator.props.currentEntity) {
            if (!generator.props.componentsByEntityConfig) {
                generator.props.componentsByEntityConfig = [];
            }

            if (!generator.props.topics) {
                generator.props.topics = [];
            }

            if (answers.currentEntityComponents && answers.currentEntityComponents.length > 0) {
                if (generator.props.currentEntity === constants.NO_ENTITY) {
                    pushComponentsByEntity(
                        generator,
                        answers.currentEntityComponents,
                        utils.transformToJavaClassNameCase(generator.props.currentPrefix)
                    );
                } else {
                    pushComponentsByEntity(generator, answers.currentEntityComponents, generator.props.currentEntity);
                }
            }

            pushTopicName(generator, answers.topic, answers.topicName);

            if (answers.pollingTimeout) {
                generator.props.pollingTimeout = +answers.pollingTimeout; // force conversion to int
            }

            if (answers.autoOffsetResetPolicy) {
                generator.props.autoOffsetResetPolicy = answers.autoOffsetResetPolicy;
            }

            if (answers.sendOrderedMessages) {
                if (generator.props.currentEntity === constants.NO_ENTITY) {
                    pushEntitiesOrder(
                        generator,
                        utils.transformToJavaClassNameCase(generator.props.currentPrefix),
                        answers.sendOrderedMessages
                    );
                } else {
                    pushEntitiesOrder(generator, generator.props.currentEntity, answers.sendOrderedMessages);
                }
            }

            if (answers.continueAddingEntitiesComponents) {
                askForEntityOperations(generator, done);
            } else {
                done();
            }
        } else {
            done();
        }
    });
}

function pushEntitiesOrder(generator, name, sendOrderedMessages) {
    generator.props.entitiesOrder.push(name);
    generator.props.entitiesOrder[name] = sendOrderedMessages;
}

function pushComponentsByEntity(generator, currentEntityComponents, entity) {
    generator.props.componentsByEntityConfig.push(entity);
    if (generator.props.componentsByEntityConfig[entity]) {
        generator.props.componentsByEntityConfig[entity].push(...currentEntityComponents);
    } else {
        generator.props.componentsByEntityConfig[entity] = [...currentEntityComponents];
    }
}

function pushTopicName(generator, topicChoice, topicName) {
    const name = generator.props.currentEntity === constants.NO_ENTITY ? generator.props.currentPrefix : generator.props.currentEntity;

    if (topicChoice) {
        if (topicChoice === constants.CUSTOM_TOPIC) {
            generator.props.topics.push({ key: _.camelCase(name), value: topicName, existingTopicName: false });
        } else if (topicChoice === constants.DEFAULT_TOPIC) {
            generator.props.topics.push({
                key: _.camelCase(name),
                value: utils.topicNamingFormat(_.snakeCase(generator.jhipsterAppConfig.baseName), _.snakeCase(name)),
                existingTopicName: false
            });
        } else {
            generator.props.topics.push({ key: _.camelCase(name), value: topicChoice, existingTopicName: true });
        }
    }
}

function validateTopic(input) {
    if (_.isEmpty(input)) return 'You have to choose a topic name';

    const legalChars = /^[A-Za-z0-9._]+$/gm;
    if (!input.match(new RegExp(legalChars))) {
        return 'You can only use alphanumeric characters, dots and underscores';
    }

    if (input.length > constants.TOPIC_NAME_MAX_SIZE) {
        return `Your topic name cannot exceed ${constants.TOPIC_NAME_MAX_SIZE} characters`;
    }

    return true;
}
