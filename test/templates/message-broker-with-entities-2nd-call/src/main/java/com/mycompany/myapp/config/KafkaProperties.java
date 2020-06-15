package com.mycompany.myapp.config;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "kafka")
public class KafkaProperties {

    @Value("${kafka.bootstrap.servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${kafka.polling.timeout:10000}")
    private Integer pollingTimeout;

    private Map<String, Map<String, Object>> consumer = new HashMap<>();

    private Map<String, Map<String, Object>> producer = new HashMap<>();

    @PostConstruct
    public void init() {

        for (String consumerKey : consumer.keySet()) {
            final Map<String, Object> properties = consumer.get(consumerKey);
            if (!properties.containsKey(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG)) {
                properties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
            }
        }

        for (String consumerKey : producer.keySet()) {
            final Map<String, Object> properties = producer.get(consumerKey);
            if (!properties.containsKey(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG)) {
                properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
            }
        }
    }

    public Map<String, Map<String, Object>> getConsumer() {
        return this.consumer;
    }

    public void setConsumer(Map<String, Map<String, Object>> consumer) {
        this.consumer = consumer;
    }

    public Map<String, Map<String, Object>> getProducer() {
        return this.producer;
    }

    public void setProducer(Map<String, Map<String, Object>> producer) {
        this.producer = producer;
    }

    public Integer getPollingTimeout() {
        return pollingTimeout;
    }

    public void setPollingTimeout(Integer pollingTimeout) {
        this.pollingTimeout = pollingTimeout;
    }
}
