package com.mycompany.myapp.service.kafka.serde;

import org.apache.kafka.common.serialization.Deserializer;
import org.apache.kafka.common.serialization.Serde;
import org.apache.kafka.common.serialization.Serializer;

import java.util.Map;

import com.mycompany.myapp.service.kafka.serde.FooSerializer;
import com.mycompany.myapp.service.kafka.serde.FooDeserializer;

public class FooSerde<Foo> implements Serde<Foo> {
    private final Serializer serializer = new FooSerializer();
    private final Deserializer deserializer = new FooDeserializer();

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        this.serializer.configure(configs, isKey);
        this.deserializer.configure(configs, isKey);
    }

    @Override
    public void close() {
        this.serializer.close();
        this.deserializer.close();
    }

    @Override
    public Serializer<Foo> serializer() {
        return serializer;
    }

    @Override
    public Deserializer<Foo> deserializer() {
        return deserializer;
    }
}
