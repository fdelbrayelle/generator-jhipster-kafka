/* eslint-disable no-unused-expressions */
const assert = require('yeoman-assert');
const constants = require('generator-jhipster/generators/generator-constants');
const expect = require('chai').expect;
const fse = require('fs-extra');
const helpers = require('yeoman-test');
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

        it('generates default files', () => {
            const expectedFiles = [
                `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/config/KafkaProperties.java`,
                `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/GenericConsumer.java`,
                `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/consumer/FooConsumer.java`,
                `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/deserializer/FooDeserializer.java`,
                `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/producer/FooProducer.java`,
                `${constants.SERVER_MAIN_SRC_DIR}com/mycompany/myapp/service/kafka/serializer/FooSerializer.java`
            ];
            assert.file(expectedFiles);
        });

        it('updates application.yml files', () => {
            assert.fileContent(`${constants.SERVER_MAIN_RES_DIR}config/application.yml`, /foo:/);
            assert.fileContent(`${constants.SERVER_TEST_RES_DIR}config/application.yml`, /foo:/);
        });
    });
});
