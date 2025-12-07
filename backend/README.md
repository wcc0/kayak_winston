# Kayak Travel Platform

A comprehensive distributed travel booking platform with microservices architecture, featuring real-time analytics, Redis caching, and Kubernetes deployment support.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KAYAK TRAVEL PLATFORM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Frontend   │    │   Frontend   │    │   Mobile     │               │
│  │   (Admin)    │    │   (User)     │    │   App        │               │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│         │                   │                   │                        │
│         └───────────────────┼───────────────────┘                        │
│                             │                                            │
│                    ┌────────▼────────┐                                   │
│                    │  Load Balancer  │                                   │
│                    │    (Nginx)      │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│         ┌───────────────────┼───────────────────┐                        │
│         │                   │                   │                        │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐                  │
│  │   Admin     │    │   Billing   │    │   Search    │                  │
│  │   Service   │    │   Service   │    │   Service   │                  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                  │
│         │                   │                   │                        │
│         └───────────────────┼───────────────────┘                        │
│                             │                                            │
│                    ┌────────▼────────┐                                   │
│                    │     Kafka       │                                   │
│                    │  Message Queue  │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│         ┌───────────────────┼───────────────────┐                        │
│         │                   │                   │                        │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐                  │
│  │    MySQL    │    │   MongoDB   │    │    Redis    │                  │
│  │ (Relational)│    │ (Documents) │    │   (Cache)   │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Core Functionality
- **User Management**: CRUD operations for users with role-based access
- **Listings Management**: Add/manage flights, hotels, and car rentals
- **Billing System**: Transaction processing and payment tracking
- **Analytics Dashboard**: Real-time revenue and booking analytics
- **Activity Tracking**: User behavior and click tracking

### Technical Features
- **Distributed Services**: Microservices connected via Kafka
- **Dual Database**: MySQL for transactions, MongoDB for analytics
- **Redis Caching**: SQL query caching with 85%+ hit rate
- **Kubernetes Ready**: Full K8s manifests for production deployment
- **Docker Support**: Complete containerization with docker-compose

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0
- MongoDB 7.0
- Redis 7.0
- Kafka (optional for full distributed mode)

### Local Development

```bash
# Clone the repository
git clone <your-repo-url>
cd kayak

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Start infrastructure services
docker-compose up -d mysql mongodb redis kafka zookeeper

# Initialize database
npm run init-db

# Seed sample data
npm run seed

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Kubernetes Deployment

```bash
# Create namespace and deploy
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/

# Check status
kubectl get pods -n kayak-travel

# View services
kubectl get svc -n kayak-travel
```

## 📁 Project Structure

```
kayak/
├── src/
│   ├── config/          # Database & service configurations
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, caching, validation
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   └── server.js        # Application entry point
├── billing/             # Billing microservice
├── kubernetes/          # K8s deployment manifests
├── scripts/             # Utility scripts
├── tests/               # Test suites
├── docs/                # Documentation
└── docker-compose.yml   # Docker configuration
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5001 |
| `MYSQL_HOST` | MySQL host | localhost |
| `MYSQL_DATABASE` | Database name | kayak_db |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017 |
| `REDIS_HOST` | Redis host | localhost |
| `KAFKA_BROKERS` | Kafka broker addresses | localhost:9092 |
| `JWT_SECRET` | JWT signing key | (required) |

## 📊 Performance

### Redis Caching Results

| Metric | Value |
|--------|-------|
| Cache Hit Rate | 87.3% |
| Avg Response (Cache Hit) | 12ms |
| Avg Response (Cache Miss) | 145ms |
| Performance Improvement | 91.7% |

Run benchmarks:
```bash
npm run benchmark:redis
```

### Database Performance

| Query Type | MySQL | MongoDB | Best For |
|------------|-------|---------|----------|
| User Auth | 15ms | 45ms | MySQL |
| Analytics Aggregation | 450ms | 85ms | MongoDB |
| Transaction Insert | 12ms | 8ms | Similar |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm test -- --coverage
```

## 📚 API Documentation

### Authentication
```
POST /api/admin/auth/login     - Admin login
POST /api/admin/auth/register  - Register new admin
GET  /api/admin/auth/verify    - Verify token
```

### Users
```
GET    /api/admin/users        - List all users
GET    /api/admin/users/:id    - Get user details
PUT    /api/admin/users/:id    - Update user
DELETE /api/admin/users/:id    - Delete user
```

### Listings
```
POST /api/admin/listings/flight  - Add flight
POST /api/admin/listings/hotel   - Add hotel
POST /api/admin/listings/car     - Add car rental
GET  /api/admin/listings/search  - Search listings
```

### Billing
```
GET /api/admin/billing         - List billing records
GET /api/admin/billing/:id     - Get billing details
GET /api/admin/billing/stats   - Get billing statistics
```

### Analytics
```
GET /api/admin/analytics/revenue/top-properties   - Top properties by revenue
GET /api/admin/analytics/revenue/by-city          - City-wise revenue
GET /api/admin/analytics/providers/top-performers - Top providers
```

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Helmet.js for HTTP security headers
- Input validation with express-validator
- Rate limiting on auth endpoints
- Network policies in Kubernetes

## 📖 Documentation

- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Performance Analysis](docs/PERFORMANCE_ANALYSIS.md)
- [Data Architecture](docs/DATA_ARCHITECTURE.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for CMPE 273 - Enterprise Distributed Systems**
