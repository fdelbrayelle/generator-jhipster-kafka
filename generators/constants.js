/**
 * Copyright 2013-2020 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const JHIPSTER_CONFIG_DIR = '.jhipster';
const MODULES_HOOK_FILE = `${JHIPSTER_CONFIG_DIR}/modules/jhi-hooks.json`;
const MODULE_NAME = 'generator-jhipster-kafka';
const BIGBANG_MODE = 'bigbang';
const INCREMENTAL_MODE = 'incremental';
const CONSUMER_COMPONENT = 'consumer';
const PRODUCER_COMPONENT = 'producer';
const NO_ENTITY = 'no_entity';
const EARLIEST_OFFSET = 'earliest';
const LATEST_OFFSET = 'latest';
const NONE_OFFSET = 'none';
const DEFAULT_POLLING_TIMEOUT = '10000';
const JSON_EXTENSION = '.json';
const EMPTY_STRING = '';
const DEFAULT_TOPIC = 'default_topic';
const CUSTOM_TOPIC = 'custom_topic';
const DEFAULT_BOOTSTRAP_SERVERS = 'localhost:9092';
// Related to: https://github.com/apache/kafka/commit/ad3dfc6ab25c3f80d2425e24e72ae732b850dc60
const TOPIC_NAME_MAX_SIZE = 249;

const constants = {
    JHIPSTER_CONFIG_DIR,
    MODULES_HOOK_FILE,
    MODULE_NAME,
    BIGBANG_MODE,
    INCREMENTAL_MODE,
    CONSUMER_COMPONENT,
    PRODUCER_COMPONENT,
    NO_ENTITY,
    EARLIEST_OFFSET,
    LATEST_OFFSET,
    NONE_OFFSET,
    DEFAULT_POLLING_TIMEOUT,
    JSON_EXTENSION,
    EMPTY_STRING,
    DEFAULT_TOPIC,
    CUSTOM_TOPIC,
    TOPIC_NAME_MAX_SIZE,
    DEFAULT_BOOTSTRAP_SERVERS
};

module.exports = constants;
