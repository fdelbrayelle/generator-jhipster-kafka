/* eslint-disable no-unused-expressions */
const assert = require('yeoman-assert');
const constants = require('generator-jhipster/generators/generator-constants');
const expect = require('chai').expect;
const fse = require('fs-extra');
const helpers = require('yeoman-test');
const jsYaml = require('js-yaml');
const path = require('path');
const _ = require('lodash');

describe('JHipster generator kafka', () => {
    describe('with no message broker', () => {
        it('throws an error', done => {
            helpers
                .run(path.join(__dirname, '../generators/app'))
                .inTmpDir(dir => {
                    fse.copySync(path.join(__dirname, '../test/templates/no-message-broker'), dir);
                })
                .on('error', error => {
                    expect(error.message === 'You need to use Kafka as message broker!').to.be.true;
                })
                .on('end', () => {
                    expect(true).to.be.false;
                });
            done();
        });
    });

    describe('with the big bang mode only', () => {
        describe('with a consumer and a producer for a single entity', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: 'bigbang',
                        components: ['consumer', 'producer'],
                        entities: ['Foo']
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity('Foo');
        });

        describe('with a given polling timeout', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: 'bigbang',
                        components: ['consumer', 'producer'],
                        entities: ['Foo'],
                        pollingTimeout: 20000
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity('Foo');

            it('updates application.yml kafka.polling.timeout property', () => {
                assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
                assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
            });
        });

        describe('with a given auto offset reset policy', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: 'bigbang',
                        components: ['consumer', 'producer'],
                        entities: ['Foo'],
                        autoOffsetResetPolicy: 'latest'
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity('Foo');

            it('updates application.yml kafka.auto.offset.reset property', () => {
                assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
            });
        });
    });

    describe('with the incremental mode only', () => {
        describe('with only a producer for a single entity', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: 'incremental',
                        currentEntity: ['Foo'],
                        currentEntityComponents: ['producer'],
                        continueAddingEntitiesComponents: false
                    })
                    .on('end', done);
            });

            it('should generate default and producer files only', () => {
                const expectedFiles = [
                    `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                    `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/FooProducer.java`,
                    `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/FooSerializer.java`
                ];
                const notExpectedFiles = [
                    `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
                    `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/FooConsumer.java`,
                    `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/FooDeserializer.java`
                ];
                assert.file(expectedFiles);
                assert.noFile(notExpectedFiles);
            });

            it('should update application.yml', () => {
                assert.fileContent(
                    `${constants.SERVER_MAIN_RES_DIR}config/application.yml`,
                    /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                );

                assert.fileContent(
                    `${constants.SERVER_TEST_RES_DIR}config/application.yml`,
                    /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                );

                const { applicationYml, testApplicationYml } = loadApplicationYaml();

                assertMinimalProducerProperties(applicationYml, testApplicationYml, 'Foo');

                const entityYmlConsumerBlock = applicationYml.kafka.consumer;
                assert.strictEqual(entityYmlConsumerBlock, undefined);
                const entityTestYmlConsumerBlock = testApplicationYml.kafka.consumer;
                assert.strictEqual(entityTestYmlConsumerBlock, undefined);
            });
        });

        describe('with only a consumer for a single entity', () => {
            describe('without offset and polling timeout', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                        })
                        .withPrompts({
                            generationType: 'incremental',
                            currentEntity: ['Foo'],
                            currentEntityComponents: ['consumer'],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate default and consumer files only', () => {
                    const expectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/FooConsumer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/FooDeserializer.java`
                    ];
                    assert.file(expectedFiles);
                    const notExpectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/FooProducer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/FooSerializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it('should update application.yml', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assert.fileContent(
                        `${constants.SERVER_MAIN_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );
                    assert.fileContent(
                        `${constants.SERVER_TEST_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );
                    assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                    assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 10000/);

                    assertMinimalConsumerProperties(applicationYml, testApplicationYml, 'Foo');

                    const entityYmlProducerBlock = applicationYml.kafka.producer;
                    assert.strictEqual(entityYmlProducerBlock, undefined);
                    const entityTestYmlProducerBlock = testApplicationYml.kafka.producer;
                    assert.strictEqual(entityTestYmlProducerBlock, undefined);
                });

                it('should set the autoRestOffsetPolicy default value for consumer', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    const entityYmlConsumerBlock = applicationYml.kafka.consumer.foo;
                    const entityTestYmlConsumerBlock = testApplicationYml.kafka.consumer.foo;
                    assert.textEqual(entityYmlConsumerBlock['[auto.offset.reset]'], 'earliest');
                    assert.textEqual(entityTestYmlConsumerBlock['[auto.offset.reset]'], 'earliest');
                });
            });

            describe('with a given offset and polling timeout', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                        })
                        .withPrompts({
                            generationType: 'incremental',
                            currentEntity: ['Foo'],
                            currentEntityComponents: ['consumer'],
                            pollingTimeout: 20000,
                            autoOffsetResetPolicy: 'latest',
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });
                it('should generate default and consumer files only', () => {
                    const expectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/FooConsumer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/FooDeserializer.java`
                    ];
                    assert.file(expectedFiles);
                    const notExpectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/FooProducer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/FooSerializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it('should update application.yml', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assert.fileContent(
                        `${constants.SERVER_MAIN_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );
                    assert.fileContent(
                        `${constants.SERVER_TEST_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );

                    assertMinimalConsumerProperties(applicationYml, testApplicationYml, 'Foo');

                    const entityYmlProducerBlock = applicationYml.kafka.producer;
                    assert.strictEqual(entityYmlProducerBlock, undefined);
                    const entityTestYmlProducerBlock = testApplicationYml.kafka.producer;
                    assert.strictEqual(entityTestYmlProducerBlock, undefined);
                });

                it('should update polling timeout property', () => {
                    assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
                    assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
                });

                it('should set the autoRestOffsetPolicy for consumer', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    const entityYmlConsumerBlock = applicationYml.kafka.consumer.foo;
                    const entityTestYmlConsumerBlock = testApplicationYml.kafka.consumer.foo;
                    assert.textEqual(entityYmlConsumerBlock['[auto.offset.reset]'], 'latest');
                    assert.textEqual(entityTestYmlConsumerBlock['[auto.offset.reset]'], 'latest');
                });
            });
        });

        describe('with a consumer and a producer for a single entity', () => {
            describe('without offset and polling timeout', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                        })
                        .withPrompts({
                            generationType: 'incremental',
                            currentEntity: ['Foo'],
                            currentEntityComponents: ['consumer', 'producer'],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });
                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity('Foo');
                it('should have the timeout and offsetPolicy', () => {
                    assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                    assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                });

                it('should updates application.yml kafka.auto.offset.reset property with default value', () => {
                    assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: earliest/);
                    assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: earliest/);
                });
            });
            describe('with a given offset and polling timeout', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                        })
                        .withPrompts({
                            generationType: 'incremental',
                            currentEntity: ['Foo'],
                            currentEntityComponents: ['consumer', 'producer'],
                            pollingTimeout: 500,
                            autoOffsetResetPolicy: 'latest',
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });
                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity('Foo');
                it('should have the timeout and offsetPolicy', () => {
                    assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 500/);
                    assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 500/);
                });

                it('should update application.yml kafka.auto.offset.reset property', () => {
                    assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                    assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                });
            });
        });

        describe('with a previous generation done', () => {
            describe('asking for a new entity consumer', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: 'incremental',
                            currentEntity: ['AwesomeEntity'],
                            currentEntityComponents: ['consumer'],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });
                it('should generate consumer file', () => {
                    const expectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/AwesomeEntityConsumer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/AwesomeEntityDeserializer.java`
                    ];
                    assert.file(expectedFiles);
                    const notExpectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/AwesomeEntityProducer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/AwesomeEntitySerializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it('should add consumer for AwesomeEntity', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertMinimalConsumerProperties(applicationYml, testApplicationYml, 'Foo');
                    assertMinimalConsumerProperties(applicationYml, testApplicationYml, 'AwesomeEntity');
                    assertMinimalProducerProperties(applicationYml, testApplicationYml, 'Foo');
                });
            });
            describe('asking for a new entity producer', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: 'incremental',
                            currentEntity: ['AwesomeEntity'],
                            currentEntityComponents: ['producer'],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });
                it('should generate producer file', () => {
                    const expectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/AwesomeEntityProducer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/AwesomeEntitySerializer.java`
                    ];
                    assert.file(expectedFiles);

                    const notExpectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/AwesomeEntityConsumer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/AwesomeEntityDeserializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it('should add producer property for AwesomeEntity', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertMinimalConsumerProperties(applicationYml, testApplicationYml, 'Foo');
                    assertMinimalProducerProperties(applicationYml, testApplicationYml, 'AwesomeEntity');
                    assertMinimalProducerProperties(applicationYml, testApplicationYml, 'Foo');
                });
            });
            describe('asking for a new entity producer and consumer', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: 'incremental',
                            currentEntity: ['AwesomeEntity'],
                            currentEntityComponents: ['producer', 'consumer'],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });
                it('should generate producer and consumer entity file', () => {
                    const expectedFiles = [
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/AwesomeEntityConsumer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/AwesomeEntityDeserializer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/AwesomeEntityProducer.java`,
                        `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/AwesomeEntitySerializer.java`
                    ];
                    assert.file(expectedFiles);
                });

                it('should add consumer for AwesomeEntity', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertMinimalConsumerProperties(applicationYml, testApplicationYml, 'Foo');
                    assertMinimalConsumerProperties(applicationYml, testApplicationYml, 'AwesomeEntity');
                    assertMinimalProducerProperties(applicationYml, testApplicationYml, 'Foo');
                    assertMinimalProducerProperties(applicationYml, testApplicationYml, 'AwesomeEntity');
                });
            });
        });
    });
});

function itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(entityName) {
    it('generates default files', () => {
        const expectedFiles = [
            `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
            `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
            `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${entityName}Consumer.java`,
            `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${entityName}Deserializer.java`,
            `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${entityName}Producer.java`,
            `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${entityName}Serializer.java`
        ];
        assert.file(expectedFiles);
    });

    it('updates application.yml kafka.bootstrap.servers, kafka.consumer and kafka.producer', () => {
        assert.fileContent(
            `${constants.SERVER_MAIN_RES_DIR}config/application.yml`,
            /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
        );

        assert.fileContent(
            `${constants.SERVER_TEST_RES_DIR}config/application.yml`,
            /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
        );

        const { applicationYml, testApplicationYml } = loadApplicationYaml();
        assertMinimalConsumerProperties(applicationYml, testApplicationYml, entityName);
        assertMinimalProducerProperties(applicationYml, testApplicationYml, entityName);
    });
}

function loadApplicationYaml() {
    const applicationYml = jsYaml.safeLoad(fse.readFileSync(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, 'utf8'));
    const testApplicationYml = jsYaml.safeLoad(fse.readFileSync(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, 'utf8'));
    return { applicationYml, testApplicationYml };
}

function assertMinimalProducerProperties(applicationYml, testApplicationYml, entityName) {
    const entityYmlProducerBlock = applicationYml.kafka.producer[`${_.camelCase(entityName)}`];
    const entityTestYmlProducerBlock = testApplicationYml.kafka.producer[`${_.camelCase(entityName)}`];
    assert.textEqual(entityYmlProducerBlock.name, `queuing.message_broker_with_entities.${_.snakeCase(entityName)}`);
    assert.textEqual(entityYmlProducerBlock.enabled.toString(), 'true');
    assert.textEqual(entityTestYmlProducerBlock.name, `queuing.message_broker_with_entities.${_.snakeCase(entityName)}`);
    assert.textEqual(entityTestYmlProducerBlock.enabled.toString(), 'false');
}

function assertMinimalConsumerProperties(applicationYml, testApplicationYml, entityName) {
    const entityYmlConsumerBlock = applicationYml.kafka.consumer[`${_.camelCase(entityName)}`];
    const entityTestYmlConsumerBlock = testApplicationYml.kafka.consumer[`${_.camelCase(entityName)}`];
    assert.textEqual(entityYmlConsumerBlock.name, `queuing.message_broker_with_entities.${_.snakeCase(entityName)}`);
    assert.textEqual(entityYmlConsumerBlock.enabled.toString(), 'true');
    assert.textEqual(entityTestYmlConsumerBlock.name, `queuing.message_broker_with_entities.${_.snakeCase(entityName)}`);
    assert.textEqual(entityTestYmlConsumerBlock.enabled.toString(), 'false');
}
