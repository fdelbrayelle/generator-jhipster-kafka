const fsModule = require('fs');

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
        console.log('Error while reading entities folder: .jhipster');
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
        console.log(context.props);
        // To access props later use this.props.someOption;
        done();
    });
}

function askForIncrementalOperations(context, done) {
    const incrementalPrompt = [
        {
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

    const incrementalActionAsk = (incrementalPrompt, done) => {};
    incrementalActionAsk(incrementalPrompt, done);
    /* context.prompt(incrementalPrompt).then(props => {
            context.props = { ...context.props, ...props };
            console.log(context.props);
            // To access props later use this.props.someOption;
            done();
        }); */
}

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
        context.props = props;
        if (props.typeOfGeneration === 'bigbang') {
            askForBigBangOperations(context, done);
        } else {
            done();
        }
        // To access props later use this.props.someOption;
    });
}

module.exports = {
    askForOperations
};
