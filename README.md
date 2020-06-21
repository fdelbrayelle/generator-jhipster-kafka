<div align="center">
    <a href="https://www.jhipster.tech/" target="_blank" rel="noopener noreferrer"><img height=123px src="images/jhipster-logo.png" /></a>
    <a href="https://kafka.apache.org/" target="_blank" rel="noopener noreferrer"><img src="images/kafka-logo.png" /></a>
</div>

# Kafka for JHipster

[![NPM version][npm-image]][npm-url] [![Build Status][github-actions-image]][github-actions-url] [![Dependency Status][daviddm-image]][daviddm-url]

> A JHipster module that generates Apache Kafka consumers and producers and more!

## 🚦 Done !

- [x] Basic [Consumer/Producer API use](#consumer-api-and-producer-api)
- [x] Several [prompt options](#prompt-options-tree) (`polling.timeout`, `auto.offset.reset.policy`)
- [x] [AKHQ (KafkaHQ)](#akhq) support
- [x] Topic management

## 🛠 To do or doing...

You can have more details about work in progress in [issues](https://github.com/fdelbrayelle/generator-jhipster-kafka/issues):

- [ ] Producer API (ordered messages, high throughput...)
- [ ] Deserialization alternatives (JacksonSerde) as a prompt option
- [ ] Security (SSL protocol as a prompt option, safe mode...)
- [ ] JHipster entity sub-generator hook
- [ ] JHipster microservices applications support
- [ ] Schema Registry and Avro support
- [ ] Kafka Connect support
- [ ] Kafka Streams support

# Introduction

This is a [JHipster](https://www.jhipster.tech/) module, that is meant to be used in a JHipster application. You can use it to generate Apache Kafka consumers and producers in a JHipster backend (Spring Boot / Java only supported at the moment). It uses Apache Kafka client as a base.

![Kafka module for JHipster in action!](images/yo-jhipster-kafka.png 'Kafka module for JHipster in action!')

# Prerequisites

As this is a [JHipster](https://www.jhipster.tech/) module, we expect you have JHipster and its related tools already installed:

- [Installing JHipster](https://www.jhipster.tech/installation/)

Or just run:

```bash
npm i -g generator-jhipster
```

# Installation

## With NPM

To install this module and Yeoman (`yo`):

```bash
npm install -g generator-jhipster-kafka yo
```

To update this module:

```bash
npm update -g generator-jhipster-kafka
```

## With Yarn

To install this module and Yeoman (`yo`):

```bash
yarn global add generator-jhipster-kafka yo
```

To update this module:

```bash
yarn global upgrade generator-jhipster-kafka
```

# Usage

This describes how to use basically this module with a JHipster generated project.

## Link local projects

If you want to use local versions of JHipster and the Kafka module:

1. Go to your `generator-jhipster` project folder and run `npm link`
2. Go to your `generator-jhipster-kafka` project folder and run `npm link`
3. In your project generated with JHipster run `npm link generator-jhipster generator-jhipster-kafka`

⚠️ If you delete `generator-jhipster` or `generator-jhipster-kafka` folder, you will have to repeat the previous steps.

## Basic usage

**Important :** The following steps and use cases are to be done **on a single generated JHipster monolithic application**.

📅 In a near future it will be achievable between two or more monolithic applications or in microservices.

1. Ensure you have a JHipster version > 6.0.0 with: `jhipster --version`
2. Create a JHipster project in a new folder: `mkdir myproject && cd myproject && jhipster` (you can also create a backend project only with `jhipster --skip-client`)
3. Choose `Asynchronous messages using Apache Kafka` in server side options when answering the following question : "Which other technologies would you like to use?"
4. In the same folder, then run `yo jhipster-kafka` and then follow the use case you need
5. After the generation have been done, run Kafka with: `docker-compose -f src/main/docker/kafka.yml up -d`
6. Run your application with: `./mvnw`

The different [use cases](USE_CASES.md) are listed on another page.

## Prompt options tree

Do your own configuration step-by-step!

The **END** represents the end of the prompts below, when files are written after confirmation (you can use the `--force` option with `yo jhipster-kafka` to overwrite all files).

<ul>
    <li>Do you want to clean up your current Kafka configuration? <strong>(default = N)</strong>
        <ul>
            <li><em>If "y" was typed:</em> all configurations and classes will be deleted and fully regenerated</li>
            <li><em>If "n" was typed:</em> the new configuration will be merged with the previous one</li>
        </ul>
    </li>
    <li>What is your bootstrap servers string connection (you can add several bootstrap servers by using a "," delimiter)? <strong>(default = localhost:9092)</strong>
    </li>
    <li>For which entity (class name)?
        <ul>
            <li>No entity (will be typed String) <strong>(default)</strong>
                <ul>
                    <li>How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?</li>
                </ul>
            </li>
            <li>Foo</li>
            <li>Bar</li>
            <li>...</li>
        </ul>
    </li>
    <li>Which components would you like to generate?
        <ul>
            <li>Consumer</li>
            <li>Producer</li>
        </ul>
    </li>
    <li>Which topic for (entity/prefix)?
        <ul>
            <li>Default topic name following this convention: message_type.application_type.entity_name <strong>(default)</strong></li>
            <li>Custom topic name
                <ul>
                    <li>What is the topic name for (entity/prefix)?</li>
                </ul>
            </li>
            <li>queuing.application_name.existing_topic_name</li>
            <li>...</li>
        </ul>
    </li>
    <li><em>If "Consumer" was selected:</em> What is the consumer polling timeout (in ms)? <strong>(default = 10000)</strong></li>
    <li><em>If "Consumer" was selected:</em> Define the auto offset reset policy (what to do when there is no initial offset in Kafka or if the current offset does not exist any more on the server)?
        <ul>
            <li>earliest (automatically reset the offset to the earliest offset) <strong>(default)</strong></li>
            <li>latest (automatically reset the offset to the latest offset)</li>
            <li>none (throw exception to the consumer if no previous offset is found for the consumer group)</li>
        </ul>
    </li>
    <li><em>If "Producer" was selected:</em> Do you want to send ordered messages for (entity/prefix) production? <strong>(default = Y)</strong></li>
    <li>Do you want to continue adding consumers or producers? <strong>(default = N)</strong></li>
    <li><em>If "N" was selected:</em> <strong>END</strong></li>
</ul>

</code>

## Skip prompts

You can use `yo jhipster-kafka --skip-prompts` to use the default prompts values to generate:

- a minimal `kafka` configuration in `application.yml` files with only a `bootstrap.servers`
- a `akhq.yml` docker-compose file to run AKHQ (see below)
- a `GenericConsumer.java` that you extend to create your own consumers

## Test consumers and producers

You can use your producer (`*Producer.java`) in other layers like resources or services by instancing it and using its `send` method (which is asynchronous).

By default a `*KafkaResource.java` is also generated with the producer. It has an endpoint to call the generated producer. Supposing you have generated consumers and producers for an existing `Foo` JHIpster entity (with a String field `foo`) and for no entity (`Bar` prefix), you can test it that way with `curl` and `jq`:

```
token=`curl -X POST localhost:8080/api/authenticate -d '{ "username": "admin", "password": "admin" }' -H "Content-Type: application/json"|jq -r '.id_token'`

# For a producer linked to an entity (Foo as JSON):
curl -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d '{ "foo": "foo" }' -X POST localhost:8080/api/foos/kafka

# For a producer not linked to an entity (String):
curl -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d 'bar' -X POST localhost:8080/api/bars/kafka
```

Generated consumers should not be explicitly used in other classes as each of them is running in a thread listening to the incoming messages. However, messages sent through the generated producer will be read if an associated consumer has been generated as well. You just have to read the logs of `./mvnw` locally.

## AKHQ

🚀 [AKHQ (previously known as KafkaHQ)](https://github.com/tchiotludo/akhq) can be used following those steps in the root directory:

1. Run `docker-compose -f src/main/docker/kafka.yml -f src/main/docker/akhq.yml up -d` to launch the ZooKeeper and Kafka services with AKHQ
1. Go to [http://localhost:11817](http://localhost:11817)
1. Start your application with `./mvnw` to manage your topics and more!

# How to contribute?

If you want to contribute to the module, please read the [CONTRIBUTING.md](CONTRIBUTING.md).

In addition, here are some things to know before to dive into:

- JavaScript ES6 is used for the generator and Java for the generated files
- The module is a Yeoman generator (the module is a sub-generator of JHipster which is itself a Yeoman-based generator)
- Module tests are done with [mocha](https://mochajs.org/), [yeoman-assert and yeoman-test](https://yeoman.io/authoring/testing.html). You can run them with `npm test`
- Format rules are defined in `.eslintrc` and `.prettierrc`
- `generators/app/index.js` is the main entrypoint, it uses `prompts.js` and `files.js`
- `generators/app/prompts.js` is used to manage prompts options
- `generators/app/files.js` is used to write files to the generated project
- `generators/app/templates` contains [ejs](https://ejs.co) templates (`.ejs`) used to generate files

# License

Apache-2.0 © [François Delbrayelle](https://fdelbrayelle.github.io/) (main contributor and stream leader) and [all contributors](https://github.com/fdelbrayelle/generator-jhipster-kafka/graphs/contributors), thank you!

[npm-image]: https://img.shields.io/npm/v/generator-jhipster-kafka.svg
[npm-url]: https://npmjs.org/package/generator-jhipster-kafka
[github-actions-image]: https://github.com/fdelbrayelle/generator-jhipster-kafka/workflows/Build/badge.svg
[github-actions-url]: https://github.com/fdelbrayelle/generator-jhipster-kafka/actions
[daviddm-image]: https://david-dm.org/fdelbrayelle/generator-jhipster-kafka.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/fdelbrayelle/generator-jhipster-kafka
