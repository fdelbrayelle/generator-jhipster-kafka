package com.mycompany.myapp.service.kafka;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.errors.WakeupException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.time.Duration;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

public abstract class GenericConsumer<T> implements Runnable {


    private final Logger log = LoggerFactory.getLogger(GenericConsumer.class);

    private final AtomicBoolean closed = new AtomicBoolean(false);

    private final KafkaConsumer<String, T> consumer;
    private String topicName;
    private final int pollingTimeout;

    public GenericConsumer(final String topicName, final Map<String, Object> properties, final int pollingTimeout) {
        this.topicName = topicName;
        this.consumer = new KafkaConsumer<>(properties);
        this.pollingTimeout = pollingTimeout;
    }

    @PostConstruct
    public void init() {
        Runtime.getRuntime().addShutdownHook(new Thread(this::shutdown));
    }

    @PreDestroy
    public void destroy() {
        shutdown();
    }

    @Override
    public void run() {
        try {
            consumer.subscribe(Collections.singleton(topicName));
            while (!closed.get()) {
                final ConsumerRecords<String, T> records = consumer.poll(Duration.ofMillis(pollingTimeout));
                for (final ConsumerRecord<String, T> record : records) {
                    handleMessage(record);
                }
                consumer.commitSync();
            }
        } catch (final WakeupException e) {
            // Ignore exception if closing
            if (!closed.get()) throw e;
        } catch (final Exception e) {
            log.error("An error occurred while trying to poll records from topic!", e);
        } finally {
            consumer.close();
        }
    }

    // Shutdown hook which can be called from a separate thread
    public void shutdown() {
        closed.set(true);
        consumer.wakeup();
    }

    protected abstract void handleMessage(ConsumerRecord<String, T> record);
}
