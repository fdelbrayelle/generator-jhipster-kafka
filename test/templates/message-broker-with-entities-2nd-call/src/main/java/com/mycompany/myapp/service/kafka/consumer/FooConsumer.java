package com.mycompany.myapp.service.kafka.consumer;

import io.vavr.control.Either;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.core.task.SimpleAsyncTaskExecutor;
import org.springframework.stereotype.Service;
import com.mycompany.myapp.config.KafkaProperties;
import com.mycompany.myapp.domain.Foo;
import com.mycompany.myapp.service.kafka.GenericConsumer;
import com.mycompany.myapp.service.kafka.deserializer.DeserializationError;

@Service
public class FooConsumer extends GenericConsumer<Foo> {

    private final Logger log = LoggerFactory.getLogger(FooConsumer.class);

    public FooConsumer(@Value("${kafka.consumer.foo.name}") final String topicName, final KafkaProperties kafkaProperties) {
        super(topicName, kafkaProperties.getConsumer().get("foo"), kafkaProperties.getPollingTimeout());
    }

    @Override
    protected void handleMessage(final ConsumerRecord<String, Either<DeserializationError, Foo>> record) {
        final Either<DeserializationError, Foo> value = record.value();
        if (value.isLeft()) {
            log.error("Deserialization record failure: {}", value.getLeft());
        } else {
            log.info("Handling record: {}", value.get());
        }

        // TODO: Here is where you can handle your messages
    }

    @Bean
    public void executeKafkaFooRunner() {
        new SimpleAsyncTaskExecutor().execute(this);
    }
}
