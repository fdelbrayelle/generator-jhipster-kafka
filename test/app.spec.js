/* eslint-disable no-unused-expressions */
const assert = require('yeoman-assert');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const expect = require('chai').expect;
const fse = require('fs-extra');
const helpers = require('yeoman-test');
const jsYaml = require('js-yaml');
const path = require('path');
const _ = require('lodash');

const constants = require('../generators/constants');

const FOO_ENTITY = 'Foo';
const AWESOME_ENTITY = 'AwesomeEntity';
const COMPONENT_PREFIX = 'ComponentsWithoutEntity';

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
                        generationType: constants.BIGBANG_MODE,
                        components: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                        entities: [FOO_ENTITY]
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);
        });

        describe('with a consumer and a producer without entity', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: constants.BIGBANG_MODE,
                        components: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                        entities: [constants.NO_ENTITY],
                        componentPrefix: COMPONENT_PREFIX
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(COMPONENT_PREFIX);
        });

        describe('with a consumer and a producer without entity and for a single entity', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: constants.BIGBANG_MODE,
                        components: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                        entities: [constants.NO_ENTITY, FOO_ENTITY],
                        componentPrefix: COMPONENT_PREFIX
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(COMPONENT_PREFIX);
            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);
        });

        describe('with a given polling timeout', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: constants.BIGBANG_MODE,
                        components: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                        entities: [FOO_ENTITY],
                        pollingTimeout: 20000
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);

            it('updates application.yml kafka.polling.timeout property', () => {
                assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
                assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
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
                        generationType: constants.BIGBANG_MODE,
                        components: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                        entities: [FOO_ENTITY],
                        autoOffsetResetPolicy: constants.LATEST_OFFSET
                    })
                    .on('end', done);
            });

            itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);

            it('updates application.yml kafka.auto.offset.reset property', () => {
                assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
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
                        generationType: constants.INCREMENTAL_MODE,
                        currentEntity: [FOO_ENTITY],
                        currentEntityComponents: [constants.PRODUCER_COMPONENT],
                        continueAddingEntitiesComponents: false
                    })
                    .on('end', done);
            });

            it('should generate default and producer files only', () => {
                const expectedFiles = [
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/FooProducer.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/FooSerializer.java`
                ];

                const notExpectedFiles = [
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/FooConsumer.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/FooDeserializer.java`
                ];

                assert.file(expectedFiles);
                assert.noFile(notExpectedFiles);
            });

            it('should update application.yml', () => {
                assert.fileContent(
                    `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
                    /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                );

                assert.fileContent(
                    `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
                    /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                );

                const { applicationYml, testApplicationYml } = loadApplicationYaml();

                assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.PRODUCER_COMPONENT);

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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: [FOO_ENTITY],
                            currentEntityComponents: [constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate default and consumer files only', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/FooConsumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/FooDeserializer.java`
                    ];
                    assert.file(expectedFiles);

                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/FooProducer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/FooSerializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it('should update application.yml', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assert.fileContent(
                        `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );
                    assert.fileContent(
                        `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 10000/);

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);

                    const entityYmlProducerBlock = applicationYml.kafka.producer;
                    assert.strictEqual(entityYmlProducerBlock, undefined);

                    const entityTestYmlProducerBlock = testApplicationYml.kafka.producer;
                    assert.strictEqual(entityTestYmlProducerBlock, undefined);
                });

                it('should set the autoRestOffsetPolicy default value for consumer', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    const entityYmlConsumerBlock = applicationYml.kafka.consumer.foo;
                    const entityTestYmlConsumerBlock = testApplicationYml.kafka.consumer.foo;

                    assert.textEqual(entityYmlConsumerBlock['[auto.offset.reset]'], constants.EARLIEST_OFFSET);
                    assert.textEqual(entityTestYmlConsumerBlock['[auto.offset.reset]'], constants.EARLIEST_OFFSET);
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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: [FOO_ENTITY],
                            currentEntityComponents: [constants.CONSUMER_COMPONENT],
                            pollingTimeout: 20000,
                            autoOffsetResetPolicy: constants.LATEST_OFFSET,
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate default and consumer files only', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/FooConsumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/FooDeserializer.java`
                    ];
                    assert.file(expectedFiles);

                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/FooProducer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/FooSerializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it('should update application.yml', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assert.fileContent(
                        `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );
                    assert.fileContent(
                        `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
                        /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
                    );

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);

                    const entityYmlProducerBlock = applicationYml.kafka.producer;
                    assert.strictEqual(entityYmlProducerBlock, undefined);

                    const entityTestYmlProducerBlock = testApplicationYml.kafka.producer;
                    assert.strictEqual(entityTestYmlProducerBlock, undefined);
                });

                it('should update polling timeout property', () => {
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 20000/);
                });

                it('should set the autoRestOffsetPolicy for consumer', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    const entityYmlConsumerBlock = applicationYml.kafka.consumer.foo;
                    const entityTestYmlConsumerBlock = testApplicationYml.kafka.consumer.foo;

                    assert.textEqual(entityYmlConsumerBlock['[auto.offset.reset]'], constants.LATEST_OFFSET);
                    assert.textEqual(entityTestYmlConsumerBlock['[auto.offset.reset]'], constants.LATEST_OFFSET);
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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: [FOO_ENTITY],
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);

                it('should have the timeout and offsetPolicy', () => {
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                });

                it('should updates application.yml kafka.auto.offset.reset property with default value', () => {
                    assert.fileContent(
                        `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
                        /'\[auto.offset.reset\].: earliest/
                    );
                    assert.fileContent(
                        `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
                        /'\[auto.offset.reset\].: earliest/
                    );
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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: [FOO_ENTITY],
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            pollingTimeout: 500,
                            autoOffsetResetPolicy: constants.LATEST_OFFSET,
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);

                it('should have the timeout and offsetPolicy', () => {
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 500/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 500/);
                });

                it('should update application.yml kafka.auto.offset.reset property', () => {
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                });
            });
        });

        describe('with a consumer and a producer without entity', () => {
            describe('without offset and polling timeout', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: constants.NO_ENTITY,
                            currentPrefix: COMPONENT_PREFIX,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(COMPONENT_PREFIX);

                it('should have the timeout and offsetPolicy', () => {
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
                });

                it('should updates application.yml kafka.auto.offset.reset property with default value', () => {
                    assert.fileContent(
                        `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
                        /'\[auto.offset.reset\].: earliest/
                    );
                    assert.fileContent(
                        `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
                        /'\[auto.offset.reset\].: earliest/
                    );
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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: constants.NO_ENTITY,
                            currentPrefix: COMPONENT_PREFIX,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            pollingTimeout: 500,
                            autoOffsetResetPolicy: constants.LATEST_OFFSET,
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(COMPONENT_PREFIX);

                it('should have the timeout and offsetPolicy', () => {
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 500/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 500/);
                });

                it('should update application.yml kafka.auto.offset.reset property', () => {
                    assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                    assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: [AWESOME_ENTITY],
                            currentEntityComponents: [constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate consumer file', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${AWESOME_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${AWESOME_ENTITY}Deserializer.java`
                    ];
                    assert.file(expectedFiles);

                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${AWESOME_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${AWESOME_ENTITY}Serializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it(`should add consumer for ${AWESOME_ENTITY}`, () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, AWESOME_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.PRODUCER_COMPONENT);
                });

                it('should order properties to put root properties at top', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertThatKafkaPropertiesAreOrdered(applicationYml);
                    assertThatKafkaPropertiesAreOrdered(testApplicationYml);
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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: [AWESOME_ENTITY],
                            currentEntityComponents: [constants.PRODUCER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate producer file', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${AWESOME_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${AWESOME_ENTITY}Serializer.java`
                    ];
                    assert.file(expectedFiles);

                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${AWESOME_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${AWESOME_ENTITY}Deserializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it(`should add producer property for ${AWESOME_ENTITY}`, () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, AWESOME_ENTITY, constants.PRODUCER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.PRODUCER_COMPONENT);
                });

                it('should order properties to put root properties at top', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertThatKafkaPropertiesAreOrdered(applicationYml);
                    assertThatKafkaPropertiesAreOrdered(testApplicationYml);
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
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: [AWESOME_ENTITY],
                            currentEntityComponents: [constants.PRODUCER_COMPONENT, constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate producer and consumer entity file', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${AWESOME_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${AWESOME_ENTITY}Deserializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${AWESOME_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${AWESOME_ENTITY}Serializer.java`
                    ];

                    assert.file(expectedFiles);
                });

                it(`should add consumer for ${AWESOME_ENTITY}`, () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, AWESOME_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.PRODUCER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, AWESOME_ENTITY, constants.PRODUCER_COMPONENT);
                });
                it('should order properties to put root properties at top', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertThatKafkaPropertiesAreOrdered(applicationYml);
                    assertThatKafkaPropertiesAreOrdered(testApplicationYml);
                });
            });
        });
    });
});

function itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(entityName) {
    it(`generates default files for ${entityName}`, () => {
        const expectedFiles = [
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${entityName}Consumer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${entityName}Deserializer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${entityName}Producer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${entityName}Serializer.java`
        ];
        assert.file(expectedFiles);
    });

    it(`updates application.yml kafka.bootstrap.servers, kafka.consumer and kafka.producer for ${entityName}`, () => {
        assert.fileContent(
            `${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`,
            /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
        );

        assert.fileContent(
            `${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`,
            /bootstrap.servers: \${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}/
        );

        const { applicationYml, testApplicationYml } = loadApplicationYaml();
        assertMinimalProperties(applicationYml, testApplicationYml, entityName, constants.CONSUMER_COMPONENT);
        assertMinimalProperties(applicationYml, testApplicationYml, entityName, constants.PRODUCER_COMPONENT);
    });
}

function loadApplicationYaml() {
    const applicationYml = jsYaml.safeLoad(fse.readFileSync(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, 'utf8'));
    const testApplicationYml = jsYaml.safeLoad(fse.readFileSync(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, 'utf8'));
    return { applicationYml, testApplicationYml };
}

function assertMinimalProperties(applicationYml, testApplicationYml, entityName, componentType) {
    let entityYmlBlock = constants.EMPTY_STRING;
    let entityTestYmlBlock = constants.EMPTY_STRING;

    if (componentType === constants.CONSUMER_COMPONENT) {
        entityYmlBlock = applicationYml.kafka.consumer[`${_.camelCase(entityName)}`];
        entityTestYmlBlock = testApplicationYml.kafka.consumer[`${_.camelCase(entityName)}`];
    } else if (componentType === constants.PRODUCER_COMPONENT) {
        entityYmlBlock = applicationYml.kafka.producer[`${_.camelCase(entityName)}`];
        entityTestYmlBlock = testApplicationYml.kafka.producer[`${_.camelCase(entityName)}`];
    }

    assert.textEqual(entityYmlBlock.name, `queuing.message_broker_with_entities.${_.snakeCase(entityName)}`);
    assert.textEqual(entityYmlBlock.enabled.toString(), 'true');
    assert.textEqual(entityTestYmlBlock.name, `queuing.message_broker_with_entities.${_.snakeCase(entityName)}`);
    assert.textEqual(entityTestYmlBlock.enabled.toString(), 'false');
}

function assertThatKafkaPropertiesAreOrdered(applicationYml) {
    const applicationYmlKeys = Object.keys(applicationYml.kafka);

    assert.ok(applicationYmlKeys.indexOf('bootstrap.servers') < applicationYmlKeys.indexOf('polling.timeout'));
    assert.ok(applicationYmlKeys.indexOf('polling.timeout') < applicationYmlKeys.indexOf('consumer'));
    assert.ok(applicationYmlKeys.indexOf('consumer') < applicationYmlKeys.indexOf('producer'));
}
