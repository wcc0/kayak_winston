FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
ENV KAFKA_BOOTSTRAP=kafka-service:9092
ENV INPUT_MODE=scheduled
EXPOSE 8003
CMD ["python", "-m", "uvicorn", "src.deals_agent.api:app", "--host", "0.0.0.0", "--port", "8003"]
