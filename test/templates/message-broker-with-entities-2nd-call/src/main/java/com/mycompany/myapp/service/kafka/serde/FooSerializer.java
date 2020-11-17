package com.mycompany.myapp.service.kafka.serde;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.util.StdDateFormat;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import org.apache.kafka.common.errors.SerializationException;
import org.apache.kafka.common.serialization.Serializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.mycompany.myapp.domain.Foo;

public class FooSerializer implements Serializer<Foo> {

    private final Logger log = LoggerFactory.getLogger(FooSerializer.class);

    private final ObjectMapper objectMapper;

    public FooSerializer() {
        this.objectMapper =
            new ObjectMapper()
                .registerModule(new ParameterNamesModule())
                .registerModule(new Jdk8Module())
                .registerModule(new JavaTimeModule())
                .setDateFormat(new StdDateFormat());
    }

    @Override
    public byte[] serialize(final String topicName, final Foo foo) {
        if (foo == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsBytes(foo);
        } catch (final JsonProcessingException e) {
            throw new SerializationException(e.getMessage(), e);
        }
    }
}
