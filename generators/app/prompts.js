const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

const constants = require('../constants');
const utils = require('./utils.js');

module.exports = {
    askForOperations
};

const previousConfiguration = context =>
    utils.getPreviousKafkaConfiguration(context, `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`).kafka;

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

function componentChoices() {
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

/**
 * Retrieve from .jhipster metadata, the list of all project entities.
 *
 * @param context - execution context (ex:generator)
 * @returns {[]} - all entities choices possible
 */
function entitiesChoices(context) {
    const entitiesChoices = [];
    let existingEntityNames = [];

    entitiesChoices.push({ name: 'No entity (will be typed String)', value: constants.NO_ENTITY });

    try {
        existingEntityNames = fs.readdirSync(constants.JHIPSTER_CONFIG_DIR);
    } catch (e) {
        context.log(`${chalk.red.bold('WARN!')} Error while reading entities folder: ${constants.JHIPSTER_CONFIG_DIR}`); // eslint-disable-line
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

function askForOperations(context) {
    const prompts = [
        {
            type: 'list',
            name: 'generationType',
            message: 'Which type of generation do you want?',
            choices: generationTypeChoices(),
            default: [constants.BIGBANG_MODE]
        }
    ];

    const done = context.async();
    context.prompt(prompts).then(props => {
        context.props.generationType = props.generationType;
        if (props.generationType === constants.INCREMENTAL_MODE) {
            askForIncrementalOperations(context, done);
        } else {
            askForBigBangOperations(context, done);
        }
    });
}

function askForBigBangOperations(context, done) {
    const bigbangPrompt = [
        {
            type: 'checkbox',
            name: 'components',
            message: 'Which Kafka components would you like to generate?',
            choices: componentChoices(),
            default: [],
            validate: input => (_.isEmpty(input) ? 'You have to choose at least one component' : true)
        },
        {
            when: response =>
                response.components.includes(constants.CONSUMER_COMPONENT) || response.components.includes(constants.PRODUCER_COMPONENT),
            type: 'checkbox',
            name: 'entities',
            message: 'For which entity (class name)?',
            choices: entitiesChoices(context),
            default: [],
            validate: input => (_.isEmpty(input) ? 'You have to choose at least one option' : true)
        },
        {
            when: response => response.entities.includes(constants.NO_ENTITY),
            type: 'input',
            name: 'componentPrefix',
            message: 'How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?',
            validate: input => (_.isEmpty(input) ? 'Please enter a value' : true)
        },
        {
            when: response => response.components.includes(constants.CONSUMER_COMPONENT),
            type: 'number',
            name: 'pollingTimeout',
            message: 'What is the consumer polling timeout (in ms)?',
            default: '10000',
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

    context.prompt(bigbangPrompt).then(answers => {
        context.props.componentsPrefixes.push(answers.componentPrefix);
        context.props = _.merge(context.props, answers);
        // To access props later use this.props.someOption;
        done();
    });
}

function askForIncrementalOperations(context, done) {
    const getConcernedEntities = previousConfiguration => {
        const allEntities = entitiesChoices(context);
        const entitiesComponents = utils.extractEntitiesComponents(previousConfiguration);
        // exclude entities found in the previous configuration
        // and those already store for this instance execution {@see context.props}
        return allEntities.filter(
            entityName =>
                (!entitiesComponents.consumers.includes(entityName.value) || !entitiesComponents.producers.includes(entityName.value)) &&
                (!context.props.componentsByEntityConfig[entityName.value] ||
                    !context.props.componentsByEntityConfig[entityName.value].includes(constants.CONSUMER_COMPONENT) ||
                    !context.props.componentsByEntityConfig[entityName.value].includes(constants.PRODUCER_COMPONENT) ||
                    entityName.value === constants.NO_ENTITY)
        );
    };

    const incrementalPrompt = [
        {
            type: 'list',
            name: 'currentEntity',
            message: 'For which entity (class name)?',
            choices: [...getConcernedEntities(previousConfiguration(context)), { name: 'None (leave incremental mode)', value: undefined }],
            default: []
        },
        {
            when: response => response.currentEntity === constants.NO_ENTITY,
            type: 'input',
            name: 'currentPrefix',
            message: 'How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?',
            validate: input => {
                if (_.isEmpty(input)) return 'Please enter a value';

                const availableComponents = getAvailableComponentsWithoutEntity(context, previousConfiguration(context), input);
                if (availableComponents.length === 0) return 'Both consumer and producer already exist for this prefix';

                return true;
            }
        }
    ];

    context.prompt(incrementalPrompt).then(answers => {
        context.props.currentEntity = undefined;

        if (answers.currentEntity) {
            context.props.currentEntity = answers.currentEntity;
            context.props.currentPrefix = answers.currentPrefix;
            if (!context.props.entities.includes(answers.currentEntity) || answers.currentEntity !== constants.NO_ENTITY) {
                context.props.entities.push(answers.currentEntity);
            }
            if (answers.currentPrefix && !context.props.componentsPrefixes.includes(answers.currentPrefix)) {
                context.props.componentsPrefixes.push(answers.currentPrefix);
            }
            askForUnitaryEntityOperations(context, done);
        } else {
            done();
        }
    });
}

function getAvailableComponentsWithoutEntity(context, previousConfiguration, prefix) {
    const availableComponents = [];
    const allComponentChoices = componentChoices();
    const entitiesComponents = utils.extractEntitiesComponents(previousConfiguration);
    const prefixJavaClassName = utils.transformToJavaClassNameCase(prefix);
    if (context.props.componentsByEntityConfig) {
        const componentForPrefix = context.props.componentsByEntityConfig[prefixJavaClassName];
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

function askForUnitaryEntityOperations(context, done) {
    const getConcernedComponents = (previousConfiguration, entityName, currentPrefix) => {
        const availableComponents = [];
        const allComponentChoices = componentChoices();
        const entitiesComponents = utils.extractEntitiesComponents(previousConfiguration);

        if (entityName === constants.NO_ENTITY) {
            return getAvailableComponentsWithoutEntity(context, previousConfiguration, currentPrefix);
        }

        // exclude components found in the previous configuration
        // and those already store for this instance execution {@see context.props}
        if (entitiesComponents) {
            if (
                !entitiesComponents.consumers.includes(entityName) &&
                (!context.props.componentsByEntityConfig[entityName] ||
                    !context.props.componentsByEntityConfig[entityName].includes(constants.CONSUMER_COMPONENT))
            ) {
                availableComponents.push(
                    allComponentChoices.find(componentChoice => componentChoice.value === constants.CONSUMER_COMPONENT)
                );
            }
            if (
                !entitiesComponents.producers.includes(entityName) &&
                (!context.props.componentsByEntityConfig[entityName] ||
                    !context.props.componentsByEntityConfig[entityName].includes(constants.PRODUCER_COMPONENT))
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
            when: context.props.currentEntity,
            type: 'checkbox',
            name: 'currentEntityComponents',
            validate: input => (_.isEmpty(input) ? 'You have to choose at least one component' : true),
            message: 'Which components do you want to generate?',
            choices: getConcernedComponents(previousConfiguration(context), context.props.currentEntity, context.props.currentPrefix),
            default: []
        },
        {
            when: response =>
                response.currentEntityComponents.includes(constants.CONSUMER_COMPONENT) &&
                context.props.currentEntity &&
                !context.props.pollingTimeout,
            type: 'number',
            name: 'pollingTimeout',
            message: 'What is the consumer polling timeout (in ms)?',
            default: '10000'
        },
        {
            when: response =>
                response.currentEntityComponents.includes(constants.CONSUMER_COMPONENT) &&
                context.props.currentEntity &&
                !context.props.autoOffsetResetPolicy,
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

    context.prompt(unitaryEntityPrompt).then(answers => {
        if (context.props.currentEntity) {
            if (!context.props.componentsByEntityConfig) {
                context.props.componentsByEntityConfig = [];
            }
            if (answers.currentEntityComponents && answers.currentEntityComponents.length > 0) {
                if (context.props.currentEntity === constants.NO_ENTITY) {
                    pushComponentsByEntity(context, answers, utils.transformToJavaClassNameCase(context.props.currentPrefix));
                } else {
                    pushComponentsByEntity(context, answers, context.props.currentEntity);
                }
            }
            if (answers.pollingTimeout) {
                context.props.pollingTimeout = +answers.pollingTimeout; // force conversion to int
            }
            if (answers.autoOffsetResetPolicy) {
                context.props.autoOffsetResetPolicy = answers.autoOffsetResetPolicy;
            }
            if (answers.continueAddingEntitiesComponents) {
                askForIncrementalOperations(context, done);
            } else {
                done();
            }
        } else {
            done();
        }
    });
}

function pushComponentsByEntity(context, answers, entity) {
    context.props.componentsByEntityConfig.push(entity);
    if (context.props.componentsByEntityConfig[entity]) {
        context.props.componentsByEntityConfig[entity].push(...answers.currentEntityComponents);
    } else {
        context.props.componentsByEntityConfig[entity] = [...answers.currentEntityComponents];
    }
}
