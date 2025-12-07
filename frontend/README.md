# Kayak Admin Dashboard

Modern React-based admin dashboard for the Kayak Travel Platform with real-time analytics and comprehensive management features.

## 🚀 Features

### Core Functionality
- 🔐 **Authentication**: Secure JWT-based admin login/signup
- 📊 **Dashboard**: Real-time statistics with KPI cards
- ✈️ **Listings Management**: Add and manage flights, hotels, and car rentals
- 👥 **User Management**: View, edit, and manage platform users
- 💰 **Billing**: Transaction records with advanced search and filtering
- 📈 **Analytics**: Interactive charts and revenue reports

### Technical Features
- Responsive Material-UI design
- Protected routes with auth context
- Axios interceptors for token handling
- Real-time data with cache support
- Docker-ready for production deployment

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| Material-UI 7 | Component Library |
| React Router 7 | Client-side Routing |
| Axios | HTTP Client |
| Recharts | Data Visualization |
| date-fns | Date Formatting |
| JWT Decode | Token Handling |

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Layout.js        # App layout with sidebar
│   └── ProtectedRoute.js # Auth route wrapper
├── pages/               # Page components
│   ├── Dashboard.js     # Main dashboard
│   ├── Listings.js      # Manage listings
│   ├── Users.js         # User management
│   ├── Billing.js       # Billing records
│   ├── Analytics.js     # Charts & reports
│   ├── Login.js         # Login page
│   └── Signup.js        # Registration page
├── services/
│   └── api.js           # API service layer
├── context/
│   └── AuthContext.js   # Authentication state
├── App.js               # Root component
└── index.js             # Entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- Backend API running (see kayak backend)

### Installation

```bash
# Clone repository (if separate)
git clone <repo-url>
cd kayak-admin-frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Environment Configuration

The frontend connects to the backend API. Update `src/services/api.js` if needed:

```javascript
const API_BASE_URL = 'http://localhost:5001/api/admin';
```

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@kayak.com | Admin@123 |
| Admin | admin@kayak.com | Admin@123 |

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t kayak-admin-frontend .
```

### Run Container

```bash
docker run -p 3000:80 kayak-admin-frontend
```

### With Docker Compose

The frontend is included in the main `docker-compose.yml`:

```bash
cd ../kayak
docker-compose up -d admin-frontend
```

## 📱 Screenshots

### Dashboard
- Statistics cards showing total users, revenue, bookings
- Quick access to all management sections

### Listings Management
- Tabbed interface for Flights, Hotels, Cars
- Form-based entry with validation

### Analytics
- Interactive bar charts and pie charts
- Revenue breakdown by city and provider

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 📦 Build for Production

```bash
# Create production build
npm run build

# Build output in /build directory
```

## 🔗 API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Admin authentication |
| `/auth/verify` | GET | Token verification |
| `/users` | GET | List all users |
| `/billing` | GET | Billing records |
| `/billing/stats` | GET | Revenue statistics |
| `/analytics/*` | GET | Analytics data |
| `/listings/*` | POST | Add new listings |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

---

**Part of the Kayak Travel Platform - CMPE 273 Enterprise Distributed Systems**
