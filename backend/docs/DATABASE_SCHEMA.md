# Kayak Admin - Database Schema Documentation

## MySQL Database Schema

### Database: `kayak_admin`

#### Tables Overview
- `admins` - Administrator accounts
- `users` - Regular user accounts  
- `flights` - Flight listings
- `hotels` - Hotel listings
- `cars` - Car rental listings
- `billing` - Transaction records

---

### 1. Admins Table
**Purpose:** Store admin user authentication and profile data

| Field | Type | Key | Default | Description |
|-------|------|-----|---------|-------------|
| admin_id | varchar(11) | PRI | - | SSN format admin ID |
| first_name | varchar(100) | - | - | Admin first name |
| last_name | varchar(100) | - | - | Admin last name |
| email | varchar(255) | UNI | - | Unique email |
| password | varchar(255) | - | - | Hashed password |
| phone_number | varchar(20) | - | NULL | Contact number |
| address | varchar(255) | - | NULL | Street address |
| city | varchar(100) | - | NULL | City |
| state | varchar(2) | - | NULL | State abbreviation |
| zip_code | varchar(10) | - | NULL | ZIP code |
| role | varchar(50) | - | admin | Role name |
| access_level | enum | MUL | admin | super_admin/admin/manager |
| created_at | timestamp | - | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | - | CURRENT_TIMESTAMP | Last update |
| last_login | timestamp | - | NULL | Last login time |
| is_active | tinyint(1) | - | 1 | Active status |

**Indexes:**
- PRIMARY KEY: `admin_id`
- UNIQUE KEY: `email`
- INDEX: `access_level`

---

### 2. Users Table
**Purpose:** Store regular user accounts

| Field | Type | Key | Default | Description |
|-------|------|-----|---------|-------------|
| user_id | varchar(11) | PRI | - | SSN format user ID |
| first_name | varchar(100) | - | - | User first name |
| last_name | varchar(100) | - | - | User last name |
| email | varchar(255) | UNI | - | Unique email |
| phone_number | varchar(20) | - | NULL | Contact number |
| address | varchar(255) | - | NULL | Street address |
| city | varchar(100) | MUL | NULL | City |
| state | varchar(2) | - | NULL | State abbreviation |
| zip_code | varchar(10) | - | NULL | ZIP code |
| created_at | timestamp | - | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | - | CURRENT_TIMESTAMP | Last update |
| is_active | tinyint(1) | - | 1 | Active status |

**Indexes:**
- PRIMARY KEY: `user_id`
- UNIQUE KEY: `email`
- INDEX: `city, state`

---

### 3. Flights Table
**Purpose:** Store flight listings

| Field | Type | Key | Default | Description |
|-------|------|-----|---------|-------------|
| flight_id | varchar(20) | PRI | - | Flight identifier |
| airline_name | varchar(100) | - | - | Airline name |
| departure_airport | varchar(10) | MUL | - | IATA code |
| arrival_airport | varchar(10) | - | - | IATA code |
| departure_datetime | datetime | MUL | - | Departure time |
| arrival_datetime | datetime | - | - | Arrival time |
| duration | int | - | - | Minutes |
| flight_class | enum | - | - | Economy/Business/First |
| ticket_price | decimal(10,2) | - | - | Price |
| total_seats | int | - | - | Total capacity |
| available_seats | int | - | - | Available seats |
| rating | decimal(3,2) | - | 0.00 | Rating |
| created_at | timestamp | - | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | - | CURRENT_TIMESTAMP | Last update |

**Indexes:**
- PRIMARY KEY: `flight_id`
- INDEX: `departure_airport, arrival_airport`
- INDEX: `departure_datetime`

---

### 4. Hotels Table
**Purpose:** Store hotel listings

| Field | Type | Key | Default | Description |
|-------|------|-----|---------|-------------|
| hotel_id | varchar(20) | PRI | - | Hotel identifier |
| hotel_name | varchar(200) | - | - | Hotel name |
| address | varchar(255) | - | - | Street address |
| city | varchar(100) | MUL | - | City |
| state | varchar(2) | - | - | State |
| zip_code | varchar(10) | - | - | ZIP code |
| star_rating | int | MUL | NULL | 1-5 stars |
| total_rooms | int | - | - | Total rooms |
| available_rooms | int | - | - | Available rooms |
| room_type | varchar(50) | - | NULL | Room type |
| price_per_night | decimal(10,2) | - | - | Nightly rate |
| amenities | json | - | NULL | Amenities array |
| rating | decimal(3,2) | - | 0.00 | Rating |
| created_at | timestamp | - | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | - | CURRENT_TIMESTAMP | Last update |

**Indexes:**
- PRIMARY KEY: `hotel_id`
- INDEX: `city, state`
- INDEX: `star_rating`

---

### 5. Cars Table
**Purpose:** Store car rental listings

| Field | Type | Key | Default | Description |
|-------|------|-----|---------|-------------|
| car_id | varchar(20) | PRI | - | Car identifier |
| car_type | varchar(50) | MUL | - | SUV/Sedan/etc |
| company_name | varchar(100) | MUL | - | Rental company |
| model | varchar(100) | - | - | Car model |
| year | int | - | - | Model year |
| transmission_type | enum | - | - | Automatic/Manual |
| seats | int | - | - | Seating capacity |
| daily_rental_price | decimal(10,2) | - | - | Daily rate |
| availability_status | enum | - | AVAILABLE | Status |
| rating | decimal(3,2) | - | 0.00 | Rating |
| created_at | timestamp | - | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | - | CURRENT_TIMESTAMP | Last update |

**Indexes:**
- PRIMARY KEY: `car_id`
- INDEX: `car_type`
- INDEX: `company_name`

---

### 6. Billing Table
**Purpose:** Store transaction records

| Field | Type | Key | Default | Description |
|-------|------|-----|---------|-------------|
| billing_id | varchar(50) | PRI | - | Transaction ID |
| user_id | varchar(11) | MUL | - | User reference |
| booking_type | enum | MUL | - | FLIGHT/HOTEL/CAR |
| booking_id | varchar(50) | - | - | Booking reference |
| transaction_date | datetime | MUL | - | Transaction time |
| total_amount | decimal(10,2) | - | - | Amount paid |
| payment_method | varchar(50) | - | NULL | Payment type |
| transaction_status | enum | MUL | PENDING | Status |
| invoice_details | json | - | NULL | Invoice data |
| created_at | timestamp | - | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | - | CURRENT_TIMESTAMP | Last update |

**Indexes:**
- PRIMARY KEY: `billing_id`
- INDEX: `user_id`
- INDEX: `booking_type, booking_id`
- INDEX: `transaction_date`
- INDEX: `transaction_status`

---

## MongoDB Database Schema

### Database: `kayak_admin`

#### Collections Overview
- `activitylogs` - Admin activity tracking
- `analytics` - User behavior analytics

---

### 1. ActivityLogs Collection
**Purpose:** Track all admin actions for audit trail
```javascript
{
  _id: ObjectId,
  admin_id: String (required, indexed),
  action: String (required, enum: [
    'LOGIN', 'LOGOUT', 'CREATE_LISTING', 'UPDATE_LISTING',
    'DELETE_LISTING', 'VIEW_USER', 'UPDATE_USER', 'DELETE_USER',
    'VIEW_BILLING', 'GENERATE_REPORT', 'SYSTEM_ERROR'
  ]),
  entity_type: String (enum: ['FLIGHT', 'HOTEL', 'CAR', 'USER', 'BILLING', 'SYSTEM']),
  entity_id: String,
  details: Mixed,
  ip_address: String,
  user_agent: String,
  status: String (enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS'),
  error_message: String,
  timestamp: Date (default: Date.now, indexed),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `admin_id` (ascending), `timestamp` (descending)
- `action` (ascending), `timestamp` (descending)
- `entity_type` (ascending), `entity_id` (ascending)

---

### 2. Analytics Collection
**Purpose:** Store user behavior and interaction data
```javascript
{
  _id: ObjectId,
  date: Date (required, indexed),
  type: String (required, indexed, enum: [
    'PAGE_VIEW', 'LISTING_CLICK', 'BOOKING', 'SEARCH', 'FILTER'
  ]),
  page_name: String,
  listing_type: String (enum: ['FLIGHT', 'HOTEL', 'CAR']),
  listing_id: String,
  user_id: String (indexed),
  session_id: String,
  metadata: Mixed,
  ip_address: String,
  user_agent: String,
  location: {
    city: String,
    state: String,
    country: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `date` (ascending), `type` (ascending)
- `listing_type` (ascending), `listing_id` (ascending), `date` (ascending)
- `user_id` (ascending), `date` (ascending)

---

## Database Design Rationale

### MySQL for Transactional Data
- **ACID compliance** for critical operations (billing, bookings)
- **Relational integrity** for users, listings, transactions
- **Complex queries** with JOINs for analytics
- **Indexing** for fast lookups and searches

### MongoDB for Logs and Analytics
- **Flexible schema** for varying log structures
- **High write performance** for activity logging
- **Document model** suitable for nested data (location, metadata)
- **Efficient aggregation** for analytics pipelines

### Redis for Caching
- **In-memory storage** for sub-millisecond response times
- **Cache frequently accessed data** (listings, user searches)
- **TTL support** for automatic cache invalidation
- **Reduced database load** by 60-80%

---

## Performance Optimizations

1. **Indexes on foreign keys** for fast JOINs
2. **Composite indexes** on search columns
3. **Timestamp indexes** for time-based queries
4. **JSON columns** for flexible data (amenities, invoice details)
5. **Enum types** for constrained values
6. **MongoDB compound indexes** for analytics queries
