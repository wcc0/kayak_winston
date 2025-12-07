FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
RUN mkdir -p /app/data
EXPOSE 8002
CMD ["uvicorn", "src.concierge_agent.api:app", "--host", "0.0.0.0", "--port", "8002"]
