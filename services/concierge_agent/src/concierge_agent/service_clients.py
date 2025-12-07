from aiokafka import AIOKafkaProducer
import asyncio
import json
import os


class KafkaClient:
    def __init__(self, bootstrap_servers=None):
        self.bootstrap_servers = bootstrap_servers or os.getenv('KAFKA_BOOTSTRAP', 'localhost:29092')
        self._producer = None

    async def start(self):
        self._producer = AIOKafkaProducer(bootstrap_servers=self.bootstrap_servers)
        await self._producer.start()

    async def stop(self):
        if self._producer:
            await self._producer.stop()

    async def produce_event(self, topic: str, key: str, value: dict):
        if not self._producer:
            await self.start()
        await self._producer.send_and_wait(topic, json.dumps(value).encode('utf-8'), key=key.encode('utf-8'))
