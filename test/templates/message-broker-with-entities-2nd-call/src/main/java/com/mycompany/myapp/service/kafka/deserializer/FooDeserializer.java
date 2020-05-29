package com.mycompany.myapp.service.kafka.deserializer;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.util.StdDateFormat;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import io.jsonwebtoken.io.SerializationException;
import org.apache.kafka.common.serialization.Deserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.mycompany.myapp.domain.Foo;

import java.io.IOException;
import java.io.UnsupportedEncodingException;

public class FooDeserializer implements Deserializer<Foo> {

    private final Logger log = LoggerFactory.getLogger(FooDeserializer.class);

    private String encoding = "UTF8";

    private ObjectMapper objectMapper;

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
    public Foo deserialize(final String topicName, final byte[] data) {
        Foo foo = null;
        try {
            final String dataString = data == null ? null : new String(data, this.encoding);
            foo = objectMapper.readValue(dataString, Foo.class);
        } catch (final UnsupportedEncodingException var4) {
            throw new SerializationException(
                "Error when deserializing byte[] to string due to unsupported encoding " + this.encoding
            );
        } catch (final IOException e) {
            log.error("Cannot read value from " + topicName + " topic", e);
        }
        return foo;
    }
}
