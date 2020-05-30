package com.mycompany.myapp.service.kafka.producer;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.annotation.PostConstruct;

import com.mycompany.myapp.config.KafkaProperties;
import com.mycompany.myapp.domain.Foo;

@Service
public class FooProducer {

    private final Logger log = LoggerFactory.getLogger(FooProducer.class);

    private final KafkaProducer<String, Foo> kafkaProducer;

    private String topicName;

    public FooProducer(@Value("${kafka.producer.foo.name}") final String topicName, final KafkaProperties kafkaProperties) {
        this.topicName = topicName;
        this.kafkaProducer = new KafkaProducer<>(kafkaProperties.getProducer().get("foo"));
    }

    @PostConstruct
    public void init() {
        Runtime.getRuntime().addShutdownHook(new Thread(this::shutdown));
    }

    public void send(final Foo message) {
        final ProducerRecord<String, Foo> record = new ProducerRecord<>(topicName, message);
        try {
            kafkaProducer.send(record);
        } catch (final Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    public void shutdown() {
        log.info("Shutdown Kafka producer");
        kafkaProducer.close();
    }
}
