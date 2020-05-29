const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const utils = require('./utils.js');

module.exports = {
    askForOperations
};

function generationTypeChoices() {
    return [
        {
            name: 'Big Bang Mode (build a configuration from scratch)',
            value: 'bigbang'
        },
        {
            name: 'Incremental Mode (upgrade an existing configuration)',
            value: 'incremental'
        }
    ];
}

function offsetChoices() {
    return [
        {
            name: 'earliest (automatically reset the offset to the earliest offset)',
            value: 'earliest'
        },
        {
            name: 'latest (automatically reset the offset to the latest offset)',
            value: 'latest'
        },
        {
            name: 'none (throw exception to the consumer if no previous offset is found for the consumer group)',
            value: 'none'
        }
    ];
}

function componentChoices() {
    return [
        {
            name: 'Consumer',
            value: 'consumer'
        },
        {
            name: 'Producer',
            value: 'producer'
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
    try {
        existingEntityNames = fs.readdirSync('.jhipster');
    } catch (e) {
        context.log(`${chalk.red.bold('WARN!')} Error while reading entities folder: .jhipster`); // eslint-disable-line
    }
    existingEntityNames.forEach(entry => {
        if (entry.indexOf('.json') !== -1) {
            const entityName = entry.replace('.json', '');
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
            default: ['bigbang']
        }
    ];

    const done = context.async();
    context.prompt(prompts).then(props => {
        context.props.generationType = props.generationType;
        if (props.generationType === 'incremental') {
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
            default: []
        },
        {
            when: response => response.components.includes('consumer') || response.components.includes('producer'),
            type: 'checkbox',
            name: 'entities',
            message: 'For which entity (class name)?',
            choices: entitiesChoices(context),
            default: []
        },
        {
            when: response => response.components.includes('consumer'),
            type: 'number',
            name: 'pollingTimeout',
            message: 'What is the consumer polling timeout (in ms)?',
            default: '10000',
            validate: input => {
                if (isNaN(input)) return 'Please enter a number';
                return true;
            }
        },
        {
            when: response => response.components.includes('consumer'),
            type: 'list',
            name: 'autoOffsetResetPolicy',
            message:
                'Define the auto offset reset policy (what to do when there is no initial offset in Kafka or if the current offset does not exist any more on the server)?',
            choices: offsetChoices(),
            default: 'earliest'
        }
    ];

    context.prompt(bigbangPrompt).then(answers => {
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
                (!entitiesComponents.producers.includes(entityName.value) || !entitiesComponents.consumers.includes(entityName.value)) &&
                (!context.props.componentsByEntityConfig[entityName.value] ||
                    !context.props.componentsByEntityConfig[entityName.value].includes('producer') ||
                    !context.props.componentsByEntityConfig[entityName.value].includes('consumer'))
        );
    };

    const previousConfiguration = utils.getPreviousKafkaConfiguration(
        context,
        `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
        context.isFirstGeneration
    ).kafka;

    const incrementalPrompt = [
        {
            type: 'list',
            name: 'currentEntity',
            message: 'For which entity (class name)?',
            choices: [...getConcernedEntities(previousConfiguration), { name: 'None', value: undefined }],
            default: []
        }
    ];

    context.prompt(incrementalPrompt).then(answers => {
        context.props.currentEntity = undefined;

        if (answers.currentEntity && answers.currentEntity.value !== 'none') {
            context.props.currentEntity = answers.currentEntity;
            if (!context.props.entities.includes(answers.currentEntity)) {
                context.props.entities.push(answers.currentEntity);
            }
            askForUnitaryEntityOperations(context, done);
        } else {
            done();
        }
    });
}

function askForUnitaryEntityOperations(context, done) {
    const getConcernedComponents = (previousConfiguration, entityName) => {
        const availableComponents = [];
        const allComponentChoices = componentChoices();
        const entitiesComponents = utils.extractEntitiesComponents(previousConfiguration);

        // exclude components found in the previous configuration
        // and those already store for this instance execution {@see context.props}
        if (entitiesComponents) {
            if (
                !entitiesComponents.producers.includes(entityName) &&
                (!context.props.componentsByEntityConfig[entityName] ||
                    !context.props.componentsByEntityConfig[entityName].includes('producer'))
            ) {
                availableComponents.push(allComponentChoices.find(componentChoice => componentChoice.value === 'producer'));
            }
            if (
                !entitiesComponents.consumers.includes(entityName) &&
                (!context.props.componentsByEntityConfig[entityName] ||
                    !context.props.componentsByEntityConfig[entityName].includes('consumer'))
            ) {
                availableComponents.push(allComponentChoices.find(componentChoice => componentChoice.value === 'consumer'));
            }
        }
        return availableComponents;
    };

    const previousConfiguration = utils.getPreviousKafkaConfiguration(
        context,
        `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`
    ).kafka;

    const unitaryEntityPrompt = [
        {
            when: context.props.currentEntity,
            type: 'checkbox',
            name: 'currentEntityComponents',
            validate: input => (_.isEmpty(input) ? 'you have to choose at least one component' : true),
            message: 'Which components do you want to generate?',
            choices: getConcernedComponents(previousConfiguration, context.props.currentEntity),
            default: []
        },
        {
            when: response =>
                response.currentEntityComponents.includes('consumer') && context.props.currentEntity && !context.props.pollingTimeout,
            type: 'number',
            name: 'pollingTimeout',
            message: 'What is the consumer polling timeout (in ms)?',
            default: '10000'
        },
        {
            when: response =>
                response.currentEntityComponents.includes('consumer') &&
                context.props.currentEntity &&
                !context.props.autoOffsetResetPolicy,
            type: 'list',
            name: 'autoOffsetResetPolicy',
            message:
                'Define the auto offset reset policy (what to do when there is no initial offset in Kafka or if the current offset does not exist any more on the server)?',
            choices: offsetChoices(),
            default: 'earliest'
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
                if (context.props.componentsByEntityConfig[context.props.currentEntity]) {
                    context.props.componentsByEntityConfig[context.props.currentEntity].push(...answers.currentEntityComponents);
                } else {
                    context.props.componentsByEntityConfig[context.props.currentEntity] = [...answers.currentEntityComponents];
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
