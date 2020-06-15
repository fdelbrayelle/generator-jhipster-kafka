package com.mycompany.myapp.service.kafka.serde;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.util.StdDateFormat;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import io.vavr.control.Either;
import org.apache.kafka.common.serialization.Deserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

import com.mycompany.myapp.domain.Foo;

public class FooDeserializer implements Deserializer<Either<DeserializationError, Foo>> {

    private final Logger log = LoggerFactory.getLogger(FooDeserializer.class);

    private final ObjectMapper objectMapper;

    private String encoding = "UTF8";

    public FooDeserializer() {
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
    public Either<DeserializationError, Foo> deserialize(final String topicName, final byte[] data) {
        try {
            final Foo value = objectMapper.readValue(data, Foo.class);
            return Either.right(value);
        } catch (final IOException e) {
            return Either.left(new DeserializationError(data, e));
        }
    }
}
