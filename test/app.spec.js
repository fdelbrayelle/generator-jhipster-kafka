/* eslint-disable no-unused-expressions */
const _ = require('lodash');
const assert = require('yeoman-assert');
const expect = require('chai').expect;
const fse = require('fs-extra');
const helpers = require('yeoman-test');
const jhipsterConstants = require('generator-jhipster/generators/generator-constants');
const jsYaml = require('js-yaml');
const path = require('path');

const constants = require('../generators/constants');

const FOO_ENTITY = 'Foo';
const AWESOME_ENTITY = 'AwesomeEntity';
const COMPONENT_PREFIX = 'ComponentsWithoutEntity';
const COMPONENTS_CHOSEN = Object.freeze({ all: 1, consumer: 2, producer: 3 });
const CUSTOM_TOPIC_NAME = 'custom_topic_name';
const EXISTING_TOPIC_NAME = 'queuing.message_broker_with_entities.foo';

describe('JHipster generator kafka', () => {
    describe('with no message broker', () => {
        it('should throw an error', done => {
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

    describe('with --force --skip-prompts options', () => {
        before(done => {
            helpers
                .run(path.join(__dirname, '../generators/app'))
                .inTmpDir(dir => {
                    fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                })
                // RunContext from run-context.js (yeoman-test) have 'force' option by default
                .withOptions({ skipPrompts: true })
                .on('end', done);
        });

        it('should generate generic consumer and akhq.yml', () => {
            const expectedFiles = [
                `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/GenericConsumer.java`,
                `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/DeserializationError.java`,
                `${jhipsterConstants.MAIN_DIR}docker/akhq.yml`
            ];

            assert.file(expectedFiles);
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
        });
    });

    describe('with the big bang mode', () => {
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
            itShouldTypeClassesWithClass(COMPONENT_PREFIX, 'String', COMPONENTS_CHOSEN.all);
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
            itShouldTypeClassesWithClass(COMPONENT_PREFIX, 'String', COMPONENTS_CHOSEN.all);
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

            it('should update application.yml kafka.polling.timeout property', () => {
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

            it('should update application.yml kafka.auto.offset.reset property', () => {
                assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
                assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
            });
        });

        describe('with a consumer and a producer for a single entity with a default topic name', () => {
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
                        topic: constants.DEFAULT_TOPIC
                    })
                    .on('end', done);
            });

            it('should put a default topic name in application.yml', () => {
                const { applicationYml, testApplicationYml } = loadApplicationYaml();
                assertTopicName(applicationYml, testApplicationYml, FOO_ENTITY, constants.DEFAULT_TOPIC, null);
            });
        });

        describe('with a consumer and a producer for a single entity with a custom topic name', () => {
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
                        topic: constants.CUSTOM_TOPIC,
                        topicName: CUSTOM_TOPIC_NAME
                    })
                    .on('end', done);
            });

            it('should put a custom topic name in application.yml', () => {
                const { applicationYml, testApplicationYml } = loadApplicationYaml();
                assertTopicName(applicationYml, testApplicationYml, FOO_ENTITY, constants.CUSTOM_TOPIC, CUSTOM_TOPIC_NAME);
            });
        });
    });

    describe('with the incremental mode', () => {
        describe('with only a producer for a single entity', () => {
            before(done => {
                helpers
                    .run(path.join(__dirname, '../generators/app'))
                    .inTmpDir(dir => {
                        fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                    })
                    .withPrompts({
                        generationType: constants.INCREMENTAL_MODE,
                        currentEntity: FOO_ENTITY,
                        currentEntityComponents: [constants.PRODUCER_COMPONENT],
                        continueAddingEntitiesComponents: false
                    })
                    .on('end', done);
            });

            it('should generate default and producer files only', () => {
                const expectedFiles = [
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${FOO_ENTITY}Producer.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${FOO_ENTITY}Serializer.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${FOO_ENTITY}KafkaResource.java`
                ];

                const notExpectedFiles = [
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/GenericConsumer.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${FOO_ENTITY}Consumer.java`,
                    `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${FOO_ENTITY}Deserializer.java`
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
                            currentEntity: FOO_ENTITY,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate default and consumer files only', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/GenericConsumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${FOO_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${FOO_ENTITY}Deserializer.java`
                    ];
                    assert.file(expectedFiles);
                });

                it('should not generate producer and serializer', () => {
                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${FOO_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${FOO_ENTITY}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${FOO_ENTITY}KafkaResource.java`
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
                            currentEntity: FOO_ENTITY,
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
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/GenericConsumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${FOO_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${FOO_ENTITY}Deserializer.java`
                    ];
                    assert.file(expectedFiles);
                });

                it('should not generate producer and serializer', () => {
                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${FOO_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${FOO_ENTITY}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${FOO_ENTITY}KafkaResource.java`
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

                it('should set the auto reset offset policy for consumer', () => {
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
                            currentEntity: FOO_ENTITY,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);

                itShouldUpdatesPropertiesWithDefaultValue();
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
                            currentEntity: FOO_ENTITY,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            pollingTimeout: 500,
                            autoOffsetResetPolicy: constants.LATEST_OFFSET,
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(FOO_ENTITY);

                itShouldUpdatesPropertiesWithGivenValue();
            });

            describe('with a default topic name', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: FOO_ENTITY,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            topic: constants.DEFAULT_TOPIC,
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should put a default topic name in application.yml', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertTopicName(applicationYml, testApplicationYml, FOO_ENTITY, constants.DEFAULT_TOPIC, null);
                });
            });

            describe('with a custom topic name', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-1st-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: FOO_ENTITY,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT, constants.PRODUCER_COMPONENT],
                            topic: constants.CUSTOM_TOPIC,
                            topicName: CUSTOM_TOPIC_NAME,
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should put a custom topic name in application.yml', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertTopicName(applicationYml, testApplicationYml, FOO_ENTITY, constants.CUSTOM_TOPIC, CUSTOM_TOPIC_NAME);
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
                itShouldUpdatesPropertiesWithDefaultValue();
                itShouldTypeClassesWithClass(COMPONENT_PREFIX, 'String', COMPONENTS_CHOSEN.all);
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

                itShouldUpdatesPropertiesWithGivenValue();
            });
        });

        describe('with an existing previous generation', () => {
            describe('with only a consumer for a single entity', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: AWESOME_ENTITY,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate consumer and deserializer', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${AWESOME_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${AWESOME_ENTITY}Deserializer.java`
                    ];
                    assert.file(expectedFiles);
                });

                it('should not generate producer and serializer', () => {
                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${AWESOME_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${AWESOME_ENTITY}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${FOO_ENTITY}KafkaResource.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it(`should add consumer configuration for ${AWESOME_ENTITY}`, () => {
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

            describe('with only a producer for a single entity', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: AWESOME_ENTITY,
                            currentEntityComponents: [constants.PRODUCER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate producer and serializer', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${AWESOME_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${AWESOME_ENTITY}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${AWESOME_ENTITY}KafkaResource.java`
                    ];
                    assert.file(expectedFiles);
                });

                it('should not generate consumer and deserializer', () => {
                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${AWESOME_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${AWESOME_ENTITY}Deserializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it(`should add producer configuration for ${AWESOME_ENTITY}`, () => {
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

            describe('with a consumer and a producer for a single entity', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: AWESOME_ENTITY,
                            currentEntityComponents: [constants.PRODUCER_COMPONENT, constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate consumer, deserializer, producer and serializer', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${AWESOME_ENTITY}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${AWESOME_ENTITY}Deserializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${AWESOME_ENTITY}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${AWESOME_ENTITY}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${AWESOME_ENTITY}KafkaResource.java`
                    ];

                    assert.file(expectedFiles);
                });

                it(`should add consumer configuration for ${AWESOME_ENTITY}`, () => {
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

            describe('with a consumer and a producer for a single entity (using an existing topic name)', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: AWESOME_ENTITY,
                            currentEntityComponents: [constants.PRODUCER_COMPONENT, constants.CONSUMER_COMPONENT],
                            topic: EXISTING_TOPIC_NAME,
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should put an existing topic name in application.yml', () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();
                    assertTopicName(applicationYml, testApplicationYml, AWESOME_ENTITY, null, EXISTING_TOPIC_NAME);
                });
            });

            describe('with only a consumer without entity', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: constants.NO_ENTITY,
                            currentPrefix: COMPONENT_PREFIX,
                            currentEntityComponents: [constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate consumer and deserializer', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${COMPONENT_PREFIX}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${COMPONENT_PREFIX}Deserializer.java`
                    ];
                    assert.file(expectedFiles);
                });

                it('should not generate producer and serializer', () => {
                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${COMPONENT_PREFIX}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${COMPONENT_PREFIX}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${COMPONENT_PREFIX}KafkaResource.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it(`should add consumer configuration for ${COMPONENT_PREFIX}`, () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, COMPONENT_PREFIX, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.PRODUCER_COMPONENT);
                });

                itShouldTypeClassesWithClass(COMPONENT_PREFIX, 'String', COMPONENTS_CHOSEN.consumer);
            });

            describe('with only a producer without entity', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: constants.NO_ENTITY,
                            currentPrefix: COMPONENT_PREFIX,
                            currentEntityComponents: [constants.PRODUCER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate producer and serializer', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${COMPONENT_PREFIX}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${COMPONENT_PREFIX}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${COMPONENT_PREFIX}KafkaResource.java`
                    ];
                    assert.file(expectedFiles);
                });

                it('should not generate consumer and deserializer', () => {
                    const notExpectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${COMPONENT_PREFIX}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${COMPONENT_PREFIX}Deserializer.java`
                    ];
                    assert.noFile(notExpectedFiles);
                });

                it(`should add producer configuration for ${COMPONENT_PREFIX}`, () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, COMPONENT_PREFIX, constants.PRODUCER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.PRODUCER_COMPONENT);
                });

                itShouldTypeClassesWithClass(COMPONENT_PREFIX, 'String', COMPONENTS_CHOSEN.producer);
            });

            describe('with a producer and consumer without entity', () => {
                before(done => {
                    helpers
                        .run(path.join(__dirname, '../generators/app'))
                        .inTmpDir(dir => {
                            fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities-2nd-call'), dir);
                        })
                        .withPrompts({
                            generationType: constants.INCREMENTAL_MODE,
                            currentEntity: constants.NO_ENTITY,
                            currentPrefix: COMPONENT_PREFIX,
                            currentEntityComponents: [constants.PRODUCER_COMPONENT, constants.CONSUMER_COMPONENT],
                            continueAddingEntitiesComponents: false
                        })
                        .on('end', done);
                });

                it('should generate producer and consumer files', () => {
                    const expectedFiles = [
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${COMPONENT_PREFIX}Consumer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${COMPONENT_PREFIX}Deserializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${COMPONENT_PREFIX}Producer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${COMPONENT_PREFIX}Serializer.java`,
                        `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${COMPONENT_PREFIX}KafkaResource.java`
                    ];

                    assert.file(expectedFiles);
                });

                it(`should add consumer configuration for ${COMPONENT_PREFIX}`, () => {
                    const { applicationYml, testApplicationYml } = loadApplicationYaml();

                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, COMPONENT_PREFIX, constants.CONSUMER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, FOO_ENTITY, constants.PRODUCER_COMPONENT);
                    assertMinimalProperties(applicationYml, testApplicationYml, COMPONENT_PREFIX, constants.PRODUCER_COMPONENT);
                });

                itShouldTypeClassesWithClass(COMPONENT_PREFIX, 'String', COMPONENTS_CHOSEN.all);
            });
        });
    });
});

function itGeneratesBasicConfigurationWithConsumerProducerWithAnEntity(entityName) {
    it(`should generate default files for ${entityName}`, () => {
        const expectedFiles = [
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
            `${jhipsterConstants.SERVER_TEST_SRC_DIR}com/mycompany/myapp/KafkaArchTest.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/GenericConsumer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${entityName}Consumer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${entityName}Deserializer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${entityName}Producer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${entityName}Serializer.java`,
            `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/web/rest/kafka/${entityName}KafkaResource.java`,
            `${jhipsterConstants.MAIN_DIR}docker/akhq.yml`
        ];
        assert.file(expectedFiles);
    });

    it(`should update application.yml kafka.bootstrap.servers, kafka.consumer and kafka.producer for ${entityName}`, () => {
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

function itShouldUpdatesPropertiesWithGivenValue() {
    it('should update application.yml polling.timeout with given value', () => {
        assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 500/);
        assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 500/);
    });

    it('should update application.yml kafka.auto.offset.reset with given value', () => {
        assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
        assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: latest/);
    });
}

function itShouldUpdatesPropertiesWithDefaultValue() {
    it('should update application.yml polling.timeout with default value', () => {
        assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
        assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /polling.timeout: 10000/);
    });

    it('should update application.yml kafka.auto.offset.reset with default value', () => {
        assert.fileContent(`${jhipsterConstants.SERVER_MAIN_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: earliest/);
        assert.fileContent(`${jhipsterConstants.SERVER_TEST_RES_DIR}config/application.yml`, /'\[auto.offset.reset\].: earliest/);
    });
}

function itShouldTypeClassesWithClass(prefix, clazz, chosenComponents) {
    it('should type classes with String', () => {
        if (chosenComponents === COMPONENTS_CHOSEN.all || chosenComponents === COMPONENTS_CHOSEN.consumer) {
            assert.fileContent(
                `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/${prefix}Consumer.java`,
                new RegExp(`GenericConsumer<${clazz}>`, 'g')
            );
            assert.fileContent(
                `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/${prefix}Deserializer.java`,
                new RegExp(`Deserializer<Either<DeserializationError, ${clazz}>>`, 'g')
            );
        }

        if (chosenComponents === COMPONENTS_CHOSEN.all || chosenComponents === COMPONENTS_CHOSEN.producer) {
            assert.fileContent(
                `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/${prefix}Producer.java`,
                new RegExp(`private final KafkaProducer<String, ${clazz}> kafkaProducer;`, 'g')
            );
            assert.fileContent(
                `${jhipsterConstants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/${prefix}Serializer.java`,
                new RegExp(`Serializer<${clazz}>`, 'g')
            );
        }
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

    assert.textEqual(entityYmlBlock.enabled.toString(), 'true');
    assert.textEqual(entityTestYmlBlock.enabled.toString(), 'false');

    assertTopicName(applicationYml, testApplicationYml, entityName, constants.DEFAULT_TOPIC, null);
}

function assertTopicName(applicationYml, testApplicationYml, entityName, topicChoice, topicName) {
    let expectedTopicName = `queuing.message_broker_with_entities.${_.snakeCase(entityName)}`;

    if (topicChoice !== constants.DEFAULT_TOPIC) {
        expectedTopicName = topicName;
    }

    Object.keys(applicationYml.kafka.topic).forEach(key => {
        if (key === _.camelCase(entityName)) {
            assert.textEqual(applicationYml.kafka.topic[key], expectedTopicName);
        }
    });
    Object.keys(testApplicationYml.kafka.topic).forEach(key => {
        if (key === _.camelCase(entityName)) {
            assert.textEqual(testApplicationYml.kafka.topic[key], expectedTopicName);
        }
    });
}

function assertThatKafkaPropertiesAreOrdered(applicationYml) {
    const applicationYmlKeys = Object.keys(applicationYml.kafka);

    assert.ok(applicationYmlKeys.indexOf('bootstrap.servers') < applicationYmlKeys.indexOf('polling.timeout'));
    assert.ok(applicationYmlKeys.indexOf('polling.timeout') < applicationYmlKeys.indexOf('consumer'));
    assert.ok(applicationYmlKeys.indexOf('consumer') < applicationYmlKeys.indexOf('producer'));
}
