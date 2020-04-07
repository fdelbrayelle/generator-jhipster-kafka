# generator-jhipster-kafka

[![NPM version][npm-image]][npm-url] [![Build Status][github-actions-image]][github-actions-url] [![Dependency Status][daviddm-image]][daviddm-url]

> JHipster module, A JHipster module to generate Apache Kafka consumers and producers.

# Introduction

This is a [JHipster](https://www.jhipster.tech/) module, that is meant to be used in a JHipster application.

# Prerequisites

As this is a [JHipster](https://www.jhipster.tech/) module, we expect you have JHipster and its related tools already installed:

- [Installing JHipster](https://www.jhipster.tech/installation/)

# Installation

## With NPM

To install this module:

```bash
npm install -g generator-jhipster-kafka
```

To update this module:

```bash
npm update -g generator-jhipster-kafka
```

## With Yarn

To install this module:

```bash
yarn global add generator-jhipster-kafka
```

To update this module:

```bash
yarn global upgrade generator-jhipster-kafka
```

# Usage

This describes how to use basically this module with a JHipster generated project:

1. Create a JHipster project in a new folder: `mkdir myproject && jhipster`
2. Choose `Asynchronous messages using Apache Kafka` in server side options when answering the following question : "Which other technologies would you like to use?"
3. Go to the `generator-jhipster-kafka` project folder and run `npm link`
4. Go back to your JHipster project and run `npm link generator-jhipster-kafka`
5. In the same folder, then run `yo jhipster-kafka`
6. You can choose to add a consumer and/or a producer for an entity (at the moment it only generates a basic `StringConsumer`)

# License

Apache-2.0 © [François Delbrayelle](https://fdelbrayelle.github.io/)

[npm-image]: https://img.shields.io/npm/v/generator-jhipster-kafka.svg
[npm-url]: https://npmjs.org/package/generator-jhipster-kafka
[github-actions-image]: https://github.com/fdelbrayelle/generator-jhipster-kafka/workflows/Build/badge.svg
[github-actions-url]: https://github.com/fdelbrayelle/generator-jhipster-kafka/actions
[daviddm-image]: https://david-dm.org/fdelbrayelle/generator-jhipster-kafka.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/fdelbrayelle/generator-jhipster-kafka
