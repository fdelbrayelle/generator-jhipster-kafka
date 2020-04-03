const chalk = require('chalk');
const semver = require('semver');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const packagejs = require('../../package.json');
const utilYaml = require('./utilYaml.js');

module.exports = class extends BaseGenerator {
    get initializing() {
        return {
            init(args) {
                if (args === 'default') {
                    // do something when argument is 'default'
                }
            },
            readConfig() {
                this.jhipsterAppConfig = this.getAllJhipsterConfig();
                if (!this.jhipsterAppConfig) {
                    this.error('Cannot read .yo-rc.json');
                }
                if (this.jhipsterAppConfig.messageBroker !== 'kafka') {
                    this.error('You need to have Kafka as message broker');
                }
            },
            displayLogo() {
                // it's here to show that you can use functions from generator-jhipster
                // this function is in: generator-jhipster/generators/generator-base.js
                this.printJHipsterLogo();

                // Have Yeoman greet the user.
                this.log(`\nWelcome to the ${chalk.bold.yellow('JHipster kafka')} generator! ${chalk.yellow(`v${packagejs.version}\n`)}`);
            },
            checkJhipster() {
                const currentJhipsterVersion = this.jhipsterAppConfig.jhipsterVersion;
                const minimumJhipsterVersion = packagejs.dependencies['generator-jhipster'];
                if (!semver.satisfies(currentJhipsterVersion, minimumJhipsterVersion)) {
                    this.warning(
                        `\nYour generated project used an old JHipster version (${currentJhipsterVersion})... you need at least (${minimumJhipsterVersion})\n`
                    );
                }
            }
        };
    }

    prompting() {
        const choices = [];

        choices.push({
            name: 'Consumer',
            value: 'consumer'
        });
        choices.push({
            name: 'Producer',
            value: 'producer'
        });

        const prompts = [
            {
                type: 'checkbox',
                name: 'components',
                message: 'Which Kafka component do you want ?',
                choices,
                default: []
            },
            {
                type: 'input',
                name: 'entityClass',
                message: 'What is the entity ?',
                validate: input => {
                    if (!/^([a-zA-Z0-9_]*)$/.test(input)) {
                        return 'Your field name cannot contain special characters';
                    }
                    if (input === '') {
                        return 'Your field name cannot be empty';
                    }
                    return true;
                }
            }
        ];

        const done = this.async();
        this.prompt(prompts).then(props => {
            this.props = props;
            // To access props later use this.props.someOption;

            done();
        });
    }

    writing() {
        // function to use directly template
        this.template = function(source, destination) {
            this.fs.copyTpl(this.templatePath(source), this.destinationPath(destination), this);
        };

        // read config from .yo-rc.json
        this.baseName = this.jhipsterAppConfig.baseName;
        this.packageName = this.jhipsterAppConfig.packageName;
        this.packageFolder = this.jhipsterAppConfig.packageFolder;
        this.clientFramework = this.jhipsterAppConfig.clientFramework;
        this.clientPackageManager = this.jhipsterAppConfig.clientPackageManager;
        this.buildTool = this.jhipsterAppConfig.buildTool;

        // use function in generator-base.js from generator-jhipster
        this.angularAppName = this.getAngularAppName();

        // use constants from generator-constants.js
        const javaDir = `${jhipsterConstants.SERVER_MAIN_SRC_DIR + this.packageFolder}/`;
        const resourceDir = jhipsterConstants.SERVER_MAIN_RES_DIR;
        const testResourceDir = jhipsterConstants.SERVER_TEST_RES_DIR;
        const webappDir = jhipsterConstants.CLIENT_MAIN_SRC_DIR;

        // variable from questions
        this.message = this.props.message;

        // show all variables
        this.log('\n--- some config read from config ---');
        this.log(`baseName=${this.baseName}`);
        this.log(`packageName=${this.packageName}`);
        this.log(`clientFramework=${this.clientFramework}`);
        this.log(`clientPackageManager=${this.clientPackageManager}`);
        this.log(`buildTool=${this.buildTool}`);

        this.log('\n--- some function ---');
        this.log(`angularAppName=${this.angularAppName}`);

        this.log('\n--- some const ---');
        this.log(`javaDir=${javaDir}`);
        this.log(`resourceDir=${resourceDir}`);
        this.log(`resourceDir=${testResourceDir}`);
        this.log(`webappDir=${webappDir}`);

        this.log('\n--- variables from questions ---');
        this.log(`\nmessage=${this.message}`);
        this.log('------\n');

        try {
            this.registerModule(
                'generator-jhipster-kafka',
                'entity',
                'post',
                'entity',
                'A JHipster module to generate Apache Kafka consumers and producers.'
            );
        } catch (err) {
            this.log(`${chalk.red.bold('WARN!')} Could not register as a jhipster entity post creation hook...\n`);
        }

        this.entityClass = this.props.entityClass;

        this.template('src/main/java/package/service/kafka/GenericConsumer.java.ejs', `${javaDir}service/kafka/GenericConsumer.java`);

        if (this.props.components.includes('consumer')) {
            this.template(
                'src/main/java/package/service/kafka/consumer/StringConsumer.java.ejs',
                `${javaDir}service/kafka/consumer/StringConsumer.java`
            );

            // TODO: Next step with a given entity
            // this.template(
            //     'src/main/java/package/service/kafka/consumer/EntityConsumer.java.ejs',
            //     `${javaDir}service/kafka/consumer/${this.entityClass}Consumer.java`
            // );
        }

        if (this.props.components.includes('producer')) {
            this.template(
                'src/main/java/package/service/kafka/producer/EntityProducer.java.ejs',
                `${javaDir}service/kafka/producer/${this.entityClass}Producer.java`
            );
        }

        // FIXME: This is the template to obtain after using utilYaml below

        // kafka:
        //     '[bootstrap.servers]': localhost:9092
        //     consumer:
        //         string:
        //             name: topic-string
        //             enabled: true
        //             '[key.deserializer]': org.apache.kafka.common.serialization.StringDeserializer
        //             '[value.deserializer]': org.apache.kafka.common.serialization.StringDeserializer
        //             '[group.id]': generated-project-for-tests
        //                 '[auto.offset.reset]': earliest
        //     producer:
        //         string:
        //             name: topic-string
        //             enabled: true
        //             '[key.serializer]': org.apache.kafka.common.serialization.StringSerializer
        //             '[value.serializer]': org.apache.kafka.common.serialization.StringSerializer

        const yamlPropertiesToDelete = {};
        utilYaml.deletePropertyInArray(yamlPropertiesToDelete, 'kafka.bootstrap.servers', this);
        utilYaml.deletePropertyInArray(yamlPropertiesToDelete, 'kafka.consumer', this);
        utilYaml.deletePropertyInArray(yamlPropertiesToDelete, 'kafka.producer', this);
        utilYaml.updateYamlProperties(`${resourceDir}config/application.yml`, yamlPropertiesToDelete, this);
        utilYaml.addYamlPropertyAtBeginin(`${resourceDir}config/application.yml`, "kafka.'[bootstrap.servers]'", 'localhost:9092', this);
        utilYaml.addYamlPropertyAtBeginin(`${resourceDir}config/application.yml`, 'kafka.consumer.string.name', 'topic-string', this);
        utilYaml.addYamlPropertyAtBeginin(`${resourceDir}config/application.yml`, 'kafka.consumer.string.enabled', 'true', this);
        utilYaml.addYamlPropertyAtBeginin(
            `${resourceDir}config/application.yml`,
            "kafka.consumer.string.'[key.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(
            `${resourceDir}config/application.yml`,
            "kafka.consumer.string.'[value.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(
            `${resourceDir}config/application.yml`,
            "kafka.consumer.string.'[auto.offset.reset]'",
            'earliest',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(`${resourceDir}config/application.yml`, 'kafka.producer.string.name', 'topic-string', this);
        utilYaml.addYamlPropertyAtBeginin(`${resourceDir}config/application.yml`, 'kafka.producer.string.enabled', 'true', this);
        utilYaml.addYamlPropertyAtBeginin(
            `${resourceDir}config/application.yml`,
            "kafka.consumer.string.'[key.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(
            `${resourceDir}config/application.yml`,
            "kafka.consumer.string.'[value.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
        utilYaml.updateYamlProperties(`${testResourceDir}config/application.yml`, yamlPropertiesToDelete, this);
        utilYaml.addYamlPropertyAtBeginin(
            `${testResourceDir}config/application.yml`,
            "kafka.'[bootstrap.servers]'",
            'localhost:9092',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(`${testResourceDir}config/application.yml`, 'kafka.consumer.string.name', 'topic-string', this);
        utilYaml.addYamlPropertyAtBeginin(`${testResourceDir}config/application.yml`, 'kafka.consumer.string.enabled', 'false', this);
        utilYaml.addYamlPropertyAtBeginin(
            `${testResourceDir}config/application.yml`,
            "kafka.consumer.string.'[key.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(
            `${testResourceDir}config/application.yml`,
            "kafka.consumer.string.'[value.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(
            `${testResourceDir}config/application.yml`,
            "kafka.consumer.string.'[auto.offset.reset]'",
            'earliest',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(`${testResourceDir}config/application.yml`, 'kafka.producer.string.name', 'topic-string', this);
        utilYaml.addYamlPropertyAtBeginin(`${testResourceDir}config/application.yml`, 'kafka.producer.string.enabled', 'false', this);
        utilYaml.addYamlPropertyAtBeginin(
            `${testResourceDir}config/application.yml`,
            "kafka.consumer.string.'[key.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
        utilYaml.addYamlPropertyAtBeginin(
            `${testResourceDir}config/application.yml`,
            "kafka.consumer.string.'[value.deserializer]'",
            'org.apache.kafka.common.serialization.StringDeserializer',
            this
        );
    }

    install() {
        const logMsg = `To install your dependencies manually, run: ${chalk.yellow.bold(`${this.clientPackageManager} install`)}`;

        const injectDependenciesAndConstants = err => {
            if (err) {
                this.warning('Install of dependencies failed!');
                this.log(logMsg);
            }
        };
        const installConfig = {
            bower: false,
            npm: this.clientPackageManager !== 'yarn',
            yarn: this.clientPackageManager === 'yarn',
            callback: injectDependenciesAndConstants
        };
        if (this.options['skip-install']) {
            this.log(logMsg);
        } else {
            this.installDependencies(installConfig);
        }
    }

    end() {
        this.log('End of kafka generator');
    }
};
