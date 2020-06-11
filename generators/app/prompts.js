const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

const constants = require('../constants');
const utils = require('./utils.js');

module.exports = {
    askForOperations
};

const previousConfiguration = generator =>
    utils.getPreviousKafkaConfiguration(generator, `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`).kafka;

function generationTypeChoices() {
    return [
        {
            name: 'Big Bang Mode (build a configuration from scratch)',
            value: constants.BIGBANG_MODE
        },
        {
            name: 'Incremental Mode (upgrade an existing configuration)',
            value: constants.INCREMENTAL_MODE
        }
    ];
}

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
    const prompts = [
        {
            when: !generator.options['skip-prompts'],
            type: 'list',
            name: 'generationType',
            message: 'Which type of generation do you want?',
            choices: generationTypeChoices(),
            default: [constants.BIGBANG_MODE]
        }
    ];

    const done = generator.async();
    try {
        generator.prompt(prompts).then(props => {
            generator.props.generationType = props.generationType;
            if (!props.generationType || props.generationType === constants.BIGBANG_MODE) {
                askForBigBangOperations(generator, done);
            } else if (props.generationType === constants.INCREMENTAL_MODE) {
                askForIncrementalOperations(generator, done);
            }
        });
    } catch (e) {
        generator.error('An error occurred while asking for operations', e);
        done();
    }
}

function askForBigBangOperations(generator, done) {
    const bigbangPrompt = [
        {
            when: !generator.options['skip-prompts'],
            type: 'checkbox',
            name: 'components',
            message: 'Which components would you like to generate?',
            choices: componentsChoices(),
            default: [],
            validate: input => (_.isEmpty(input) ? 'You have to choose at least one component' : true)
        },
        {
            when: response =>
                response.components.includes(constants.CONSUMER_COMPONENT) || response.components.includes(constants.PRODUCER_COMPONENT),
            type: 'checkbox',
            name: 'entities',
            message: 'For which entity (class name)?',
            choices: entitiesChoices(generator),
            default: constants.NO_ENTITY,
            validate: input => (_.isEmpty(input) ? 'You have to choose at least one option' : true)
        },
        {
            when: response => response.entities.includes(constants.NO_ENTITY),
            type: 'input',
            name: 'componentPrefix',
            message: 'How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?',
            validate: input => {
                if (_.isEmpty(input)) return 'Please enter a value';
                if (entitiesChoices(generator).find(entity => entity.name === utils.transformToJavaClassNameCase(input))) {
                    return 'This name is already taken by an entity generated with JHipster';
                }
                return true;
            }
        },
        {
            when: response => response.components.includes(constants.CONSUMER_COMPONENT),
            type: 'number',
            name: 'pollingTimeout',
            message: 'What is the consumer polling timeout (in ms)?',
            default: constants.DEFAULT_POLLING_TIMEOUT,
            validate: input => (isNaN(input) ? 'Please enter a number' : true)
        },
        {
            when: response => response.components.includes(constants.CONSUMER_COMPONENT),
            type: 'list',
            name: 'autoOffsetResetPolicy',
            message:
                'Define the auto offset reset policy (what to do when there is no initial offset in Kafka or if the current offset does not exist any more on the server)?',
            choices: offsetChoices(),
            default: constants.EARLIEST_OFFSET
        }
    ];

    if (generator.options['skip-prompts']) {
        generator.props = _.merge(generator.props, bigbangPrompt.map(prompt => prompt.default));
        done();
        return;
    }

    generator.prompt(bigbangPrompt).then(answers => {
        if (answers.componentPrefix) {
            generator.props.componentsPrefixes.push(answers.componentPrefix);
        }

        generator.props = _.merge(generator.props, answers);

        askForBigBangEntityOperations(generator, answers, done);
    });
}

function askForBigBangEntityOperations(generator, answers, done, entityIndex = 0) {
    let name = answers.entities[entityIndex];
    if (answers.entities[entityIndex] === constants.NO_ENTITY) {
        name = answers.componentPrefix;
    }

    const bigbangEntityPrompt = [
        {
            when: answers.components.includes(constants.CONSUMER_COMPONENT) || answers.components.includes(constants.PRODUCER_COMPONENT),
            type: 'list',
            name: 'topic',
            message: `Which topic for ${name}?`,
            choices: topicsChoices(generator, null),
            default: constants.DEFAULT_TOPIC
        },
        {
            when: response => response.topic === constants.CUSTOM_TOPIC,
            type: 'input',
            name: 'topicName',
            message: `What is the topic name for ${name}?`,
            validate: input => {
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
        },
        {
            when: entityIndex < answers.entities.length - 1,
            type: 'confirm',
            name: 'confirmBigBangEntityOperations',
            message: 'Do you want to continue to the next entity/prefix or exit?',
            default: true
        }
    ];

    generator.prompt(bigbangEntityPrompt).then(subAnswers => {
        if (!generator.props.topics) {
            generator.props.topics = [];
        }

        generator.props.currentEntity = answers.entities[entityIndex];

        if (generator.props.currentEntity === constants.NO_ENTITY) {
            generator.props.currentPrefix = answers.componentPrefix;
        }

        pushTopicName(generator, subAnswers.topic, subAnswers.topicName);

        generator.props = _.merge(generator.props, subAnswers);

        if (entityIndex === answers.entities.length - 1) {
            done();
        }

        if (subAnswers.confirmBigBangEntityOperations) {
            askForBigBangEntityOperations(generator, answers, done, ++entityIndex);
        }
    });
}

function askForIncrementalOperations(generator, done) {
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

    const incrementalPrompt = [
        {
            type: 'list',
            name: 'currentEntity',
            message: 'For which entity (class name)?',
            choices: [...getConcernedEntities(previousConfiguration(generator))],
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

                const availableComponents = getAvailableComponentsWithoutEntity(generator, previousConfiguration(generator), input);
                if (availableComponents.length === 0) return 'Both consumer and producer already exist for this prefix';

                return true;
            }
        }
    ];

    generator.prompt(incrementalPrompt).then(answers => {
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
            askForIncrementalEntityOperations(generator, done);
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

function askForIncrementalEntityOperations(generator, done) {
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

    const unitaryEntityPrompt = [
        {
            when: generator.props.currentEntity,
            type: 'checkbox',
            name: 'currentEntityComponents',
            message: 'Which components would you like to generate?',
            choices: getConcernedComponents(previousConfiguration(generator), generator.props.currentEntity, generator.props.currentPrefix),
            default: [],
            validate: input => (_.isEmpty(input) ? 'You have to choose at least one component' : true)
        },
        {
            when: response =>
                response.currentEntityComponents.includes(constants.CONSUMER_COMPONENT) ||
                response.currentEntityComponents.includes(constants.PRODUCER_COMPONENT),
            type: 'list',
            name: 'topic',
            message: 'For which topic?',
            choices: topicsChoices(generator, previousConfiguration(generator)),
            default: constants.DEFAULT_TOPIC
        },
        {
            when: response => response.topic === constants.CUSTOM_TOPIC,
            type: 'input',
            name: 'topicName',
            message: 'What is the topic name?',
            validate: input => {
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

            pushTopicName(generator, answers.topic, answers.topicName);

            if (answers.currentEntityComponents && answers.currentEntityComponents.length > 0) {
                if (generator.props.currentEntity === constants.NO_ENTITY) {
                    pushComponentsByEntity(generator, answers, utils.transformToJavaClassNameCase(generator.props.currentPrefix));
                } else {
                    pushComponentsByEntity(generator, answers, generator.props.currentEntity);
                }
            }

            if (answers.pollingTimeout) {
                generator.props.pollingTimeout = +answers.pollingTimeout; // force conversion to int
            }

            if (answers.autoOffsetResetPolicy) {
                generator.props.autoOffsetResetPolicy = answers.autoOffsetResetPolicy;
            }

            if (answers.continueAddingEntitiesComponents) {
                askForIncrementalOperations(generator, done);
            } else {
                done();
            }
        } else {
            done();
        }
    });
}

function pushComponentsByEntity(generator, answers, entity) {
    generator.props.componentsByEntityConfig.push(entity);
    if (generator.props.componentsByEntityConfig[entity]) {
        generator.props.componentsByEntityConfig[entity].push(...answers.currentEntityComponents);
    } else {
        generator.props.componentsByEntityConfig[entity] = [...answers.currentEntityComponents];
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
