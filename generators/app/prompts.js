const fsModule = require('fs');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const { getPreviousKafkaConfiguration, extractEntitiesComponents } = require('./utils.js');

const generationTypeChoices = () => {
    return [
        {
            name: 'Big Bang Mode',
            value: 'bigbang'
        },
        {
            name: 'Incremental Mode',
            value: 'incremental'
        }
    ];
};

const offsetChoices = () => {
    const autoOffsetResetPolicies = [];

    autoOffsetResetPolicies.push({
        name: 'earliest (automatically reset the offset to the earliest offset)',
        value: 'earliest'
    });
    autoOffsetResetPolicies.push({
        name: 'latest (automatically reset the offset to the latest offset)',
        value: 'latest'
    });
    autoOffsetResetPolicies.push({
        name: 'none (throw exception to the consumer if no previous offset is found for the consumer group)',
        value: 'none'
    });
    return autoOffsetResetPolicies;
};

const componentChoices = () => {
    const componentsChoices = [];

    componentsChoices.push({
        name: 'Consumer',
        value: 'consumer'
    });
    componentsChoices.push({
        name: 'Producer',
        value: 'producer'
    });
    return componentsChoices;
};

const entitiesChoices = () => {
    const entitiesChoices = [];
    let existingEntityNames = [];
    try {
        existingEntityNames = fsModule.readdirSync('.jhipster');
    } catch (e) {
        console.error('Error while reading entities folder: .jhipster'); // eslint-disable-line
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
};

function askForOperations(context) {
    const prompts = [
        {
            type: 'list',
            name: 'typeOfGeneration',
            message: 'Which kind of generation do you want?',
            choices: generationTypeChoices(),
            default: ['bigbang']
        }
    ];

    const done = context.async();
    context.prompt(prompts).then(props => {
        context.props.typeOfGeneration = props.typeOfGeneration;
        if (props.typeOfGeneration === 'bigbang') {
            askForBigBangOperations(context, done);
        } else {
            askForIncrementalOperations(context, done);
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
            choices: entitiesChoices(),
            default: []
        },
        {
            when: response => response.components.includes('consumer'),
            type: 'number',
            name: 'pollingTimeout',
            message: 'What is the consumer polling timeout (in ms)?',
            default: '10000'
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

    context.prompt(bigbangPrompt).then(props => {
        context.props = { ...context.props, ...props };
        // To access props later use this.props.someOption;
        done();
    });
}

function askForIncrementalOperations(context, done) {
    const previousConfiguration = getPreviousKafkaConfiguration(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`);
    const getConcernedEntities = previousConfiguration => {
        const allEntities = entitiesChoices();
        const entitiesComponents = extractEntitiesComponents(previousConfiguration);
        return allEntities.filter(
            entityName =>
                !entitiesComponents.producers.includes(entityName.value) || !entitiesComponents.consumers.includes(entityName.value)
        );
    };

    const incrementalPrompt = [
        {
            type: 'list',
            name: 'currentEntity',
            message: 'For which entity (class name)?',
            choices: [...getConcernedEntities(previousConfiguration), { name: 'None', value: undefined }],
            default: []
        }
    ];

    context.prompt(incrementalPrompt).then(props => {
        context.props.currentEntity = undefined;

        if (props.currentEntity && props.currentEntity.value !== 'none') {
            context.props.currentEntity = props.currentEntity;
            askForUnitaryEntityOperations(context, done);
        } else {
            done();
        }
    });
}

function askForUnitaryEntityOperations(context, done) {
    const previousConfiguration = getPreviousKafkaConfiguration(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`);
    const getConcernedComponents = (previousConfiguration, entityName) => {
        const availableComponents = [];
        const allComponentChoices = componentChoices();
        const entitiesComponents = extractEntitiesComponents(previousConfiguration);

        if (entitiesComponents) {
            if (!entitiesComponents.producers.includes(entityName)) {
                availableComponents.push(allComponentChoices.find(componentChoice => componentChoice.value === 'producer'));
            }
            if (!entitiesComponents.consumers.includes(entityName)) {
                availableComponents.push(allComponentChoices.find(componentChoice => componentChoice.value === 'consumer'));
            }
        }
        return availableComponents;
    };

    const unitaryEntityOptions = [
        {
            when: context.props.currentEntity,
            type: 'checkbox',
            name: 'currentEntityComponents',
            message: 'For which entity (class name)?',
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
            message: 'Do you want to continue of adding Consumer or Producer?',
            default: false
        }
    ];
    context.prompt(unitaryEntityOptions).then(props => {
        if (context.props.currentEntity) {
            if (!context.props.addEntityComponents) {
                context.props.addEntityComponents = [];
            }

            context.props.addEntityComponents.push({
                name: context.props.currentEntity,
                components: props.currentEntityComponents
            });

            if (props.pollingTimeout) {
                context.props.pollingTimeout = props.pollingTimeout;
            }
            if (props.autoOffsetResetPolicy) {
                context.props.autoOffsetResetPolicy = props.autoOffsetResetPolicy;
            }
            if (props.continueAddingEntitiesComponents) {
                askForIncrementalOperations(context, done);
            } else {
                done();
            }
        } else {
            done();
        }
    });
}

module.exports = {
    askForOperations
};
