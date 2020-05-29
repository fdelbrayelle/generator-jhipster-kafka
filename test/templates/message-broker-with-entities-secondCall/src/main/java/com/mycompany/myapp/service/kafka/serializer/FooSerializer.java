package com.mycompany.myapp.service.kafka.serializer;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.util.StdDateFormat;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import org.apache.kafka.common.serialization.Serializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.mycompany.myapp.domain.Foo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class FooSerializer implements Serializer<Foo> {

    private final Logger log = LoggerFactory.getLogger(FooSerializer.class);

    private String encoding = "UTF8";

    private ObjectMapper objectMapper;

    public FooSerializer() {
        this.objectMapper =
            new ObjectMapper()
                .registerModule(new ParameterNamesModule())
                .registerModule(new Jdk8Module())
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE)
                .setSerializationInclusion(JsonInclude.Include.NON_EMPTY)
                .setDateFormat(new StdDateFormat());
    }

    @Override
    public byte[] serialize(final String topicName, final Foo foo) {
        final ByteArrayOutputStream os = new ByteArrayOutputStream();
        try {
            objectMapper.writeValue(os, foo);
        } catch (final IOException e) {
            log.error("Cannot write value from " + topicName + " topic", e);
        }
        return os.toByteArray();
    }
}
