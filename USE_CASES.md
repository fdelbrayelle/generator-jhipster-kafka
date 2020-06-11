# Use cases

## Consumer API and Producer API

The **topic naming convention** has been set to: `message_type.application_name.entity_name` (all in snake_case, it can be changed of course):

- message_type: queuing, logging, tracking, etl/db, streaming, push, user...
- application_name: the application base name
- entity_name: the entity name (or the prefix if no entity) which is consumed

### Big Bang Mode

The Big Bang Mode allows the user to rewrite from scratch all the Kafka configuration (Java files and `application.yml`) to generate new components.

### Incremental Mode

The Incremental Mode allows the user to write new Kafka configuration (new Java files and `application.yml` updates) to generate new components over previous configuration. In this mode prompt options are asked and there is a loop for these questions.

### Create a consumer linked to an entity

After following the first 3 steps of the [basic usage](README.md#basic-usage) above, choose a mode and follow the steps:

#### Big Bang Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Big Bang Mode (build a configuration from scratch)
4. "Which components would you like to generate?" - Consumer
5. "For which entity (class name)?" - Foo (the available entities are retrieved in the `.jhipster` folder as `.json`)
6. "What is the consumer polling timeout (in ms)?" - Your answer or '10000' by default (global for all consumers)
7. "Define the auto offset reset policy?" - Your answer or 'earliest' by default (global for all consumers)
8. "Which topic for Foo?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name for Foo?")
9. Loop on each entity with step 8
10. Overwrite all files in conflict
11. `FooConsumer` (consumes `Foo`) is available with a `FooDeserializer`

#### Incremental Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Incremental Mode (upgrade an existing configuration)
4. "For which entity (class name)?" - Foo (the available entities are retrieved in the `.jhipster` folder as `.json`)
5. "Which components would you like to generate?" - Consumer
6. "For which topic?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name?")
7. "What is the consumer polling timeout (in ms)?" - Your answer or '10000' by default (global for all consumers)
8. "Define the auto offset reset policy?" - Your answer or 'earliest' by default (global for all consumers)
9. "Do you want to continue adding consumers or producers?" - Your answer or 'N' par default
10. Overwrite all files in conflict
11. `FooConsumer` (consumes `Foo`) is available with a `FooDeserializer`

### Create a producer linked to an entity

After following the first 3 steps of the [basic usage](README.md#basic-usage) above, choose a mode and follow the steps:

#### Big Bang Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Big Bang Mode (build a configuration from scratch)
4. "Which components would you like to generate?" - Producer
5. "For which entity (class name)?" - Foo (the available entities are retrieved in the `.jhipster` folder as `.json`)
6. "Which topic for Foo?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name for Foo?")
7. Loop on each entity with step 6
8. Overwrite all files in conflict
9. `FooProducer` (produces `Foo`) is available with a `FooSerializer` and a `FooKafkaResource` to [help testing](README.md#test-consumers-and-producers)

#### Incremental Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Incremental Mode (upgrade an existing configuration)
4. "For which entity (class name)?" - Foo (the available entities are retrieved in the `.jhipster` folder as `.json`)
5. "Which components would you like to generate?" - Producer
6. "For which topic?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name?")
7. "Do you want to continue adding consumers or producers?" - Your answer or 'N' par default
8. Overwrite all files in conflict
9. `FooProducer` (produces `Foo`) is available with a `FooSerializer` and a `FooKafkaResource` to [help testing](README.md#test-consumers-and-producers)

### Create a consumer NOT linked to an entity

After following the first 3 steps of the [basic usage](README.md#basic-usage) above, choose a mode and follow the steps:

#### Big Bang Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Big Bang Mode (build a configuration from scratch)
4. "Which components would you like to generate?" - Consumer
5. "For which entity (class name)?" - No entity (will be typed String)
6. "How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?" - someEventType
7. "What is the consumer polling timeout (in ms)?" - Your answer or '10000' by default (global for all consumers)
8. "Define the auto offset reset policy?" - Your answer or 'earliest' by default (global for all consumers)
9. "Which topic for Foo?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name for Foo?")
10. Loop on each entity with step 9
11. Overwrite all files in conflict
12. `SomeEventTypeConsumer` (consumes `String`) is available with a `SomeEventTypeDeserializer`

#### Incremental Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Incremental Mode (upgrade an existing configuration)
4. "For which entity (class name)?" - No entity (will be typed String)
5. "How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?" - someEventType
6. "Which components would you like to generate?" - Consumer
7. "For which topic?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name?")
8. "What is the consumer polling timeout (in ms)?" - Your answer or '10000' by default (global for all consumers)
9. "Define the auto offset reset policy?" - Your answer or 'earliest' by default (global for all consumers)
10. "Do you want to continue adding consumers or producers?" - Your answer or 'N' par default
11. Overwrite all files in conflict
12. `SomeEventTypeConsumer` (consumes `String`) is available with a `SomeEventTypeDeserializer`

### Create a producer NOT linked to an entity

After following the first 3 steps of the [basic usage](README.md#basic-usage) above, choose a mode and follow the steps:

#### Big Bang Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Big Bang Mode (build a configuration from scratch)
4. "Which components would you like to generate?" - Producer
5. "For which entity (class name)?" - No entity (will be typed String)
6. "How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?" - someEventType
7. "Which topic for Foo?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name for Foo?")
8. Loop on each entity with step 7
9. Overwrite all files in conflict
10. `SomeEventTypeProducer` (produces `String`) is available with a `SomeEventTypeSerializer` and a `SomeEventTypeKafkaResource` to [help testing](README.md#test-consumers-and-producers)

#### Incremental Mode

1. Create a new entity if not already generated with: `jhipster entity Foo`
2. In the same folder, run `yo jhipster-kafka`
3. "Which type of generation do you want?" - Incremental Mode (upgrade an existing configuration)
4. "For which entity (class name)?" - No entity (will be typed String)
5. "How would you prefix your objects (no entity, for instance: [SomeEventType]Consumer|Producer...)?" - someEventType
6. "Which components would you like to generate?" - Producer
7. "For which topic?" - Any choice (choosing "Custom topic name" will add another question "What is the topic name?")
8. "Do you want to continue adding consumers or producers?" - Your answer or 'N' par default
9. Overwrite all files in conflict
10. `SomeEventTypeProducer` (produces `String`) is available with a `SomeEventTypeSerializer` and a `SomeEventTypeKafkaResource` to [help testing](README.md#test-consumers-and-producers)
