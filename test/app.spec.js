/* eslint-disable no-unused-expressions */
const assert = require('yeoman-assert');
const constants = require('generator-jhipster/generators/generator-constants');
const expect = require('chai').expect;
const fse = require('fs-extra');
const helpers = require('yeoman-test');
const jsYaml = require('js-yaml');
const path = require('path');

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

    describe('with a consumer and a producer for a single entity', () => {
        before(done => {
            helpers
                .run(path.join(__dirname, '../generators/app'))
                .inTmpDir(dir => {
                    fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities'), dir);
                })
                .withPrompts({
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
                    fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities'), dir);
                })
                .withPrompts({
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
                    fse.copySync(path.join(__dirname, '../test/templates/message-broker-with-entities'), dir);
                })
                .withPrompts({
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

        const applicationYml = jsYaml.safeLoad(fse.readFileSync(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, 'utf8'));
        const testApplicationYml = jsYaml.safeLoad(fse.readFileSync(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, 'utf8'));

        const entityYmlConsumerBlock = applicationYml.kafka.consumer[`${entityName.toLowerCase()}`];
        const entityTestYmlConsumerBlock = testApplicationYml.kafka.consumer[`${entityName.toLowerCase()}`];
        assert.textEqual(entityYmlConsumerBlock.name, `queuing.message_broker_with_entities.${entityName.toLowerCase()}`);
        assert.textEqual(entityYmlConsumerBlock.enabled.toString(), 'true');
        assert.textEqual(entityTestYmlConsumerBlock.name, `queuing.message_broker_with_entities.${entityName.toLowerCase()}`);
        assert.textEqual(entityTestYmlConsumerBlock.enabled.toString(), 'false');

        const entityYmlProducerBlock = applicationYml.kafka.producer[`${entityName.toLowerCase()}`];
        const entityTestYmlProducerBlock = testApplicationYml.kafka.producer[`${entityName.toLowerCase()}`];
        assert.textEqual(entityYmlProducerBlock.name, `queuing.message_broker_with_entities.${entityName.toLowerCase()}`);
        assert.textEqual(entityYmlProducerBlock.enabled.toString(), 'true');
        assert.textEqual(entityTestYmlProducerBlock.name, `queuing.message_broker_with_entities.${entityName.toLowerCase()}`);
        assert.textEqual(entityTestYmlProducerBlock.enabled.toString(), 'false');
    });
}
