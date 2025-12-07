# Web, User & Item Tracking System

## Overview

The Kayak Travel Platform implements comprehensive tracking to analyze user behavior, optimize user experience, and provide actionable business insights.

## Tracking Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRACKING ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │   Browser    │                                               │
│  │  (Frontend)  │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         │ Events: clicks, page views, searches                   │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Tracking   │───▶│    Kafka     │───▶│   Consumer   │       │
│  │     API      │    │    Topic     │    │   Service    │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
│                                                  │                │
│                            ┌─────────────────────┤                │
│                            │                     │                │
│                            ▼                     ▼                │
│                     ┌──────────────┐    ┌──────────────┐         │
│                     │    MySQL     │    │   MongoDB    │         │
│                     │ (Click Data) │    │ (Analytics)  │         │
│                     └──────────────┘    └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Types of Tracking

### 1. Click Tracking

Captures all user interactions with UI elements.

**Data Captured:**
```javascript
{
  userId: "USR-001",
  sessionId: "sess_abc123",
  eventTime: "2024-12-01T10:30:00Z",
  eventName: "button_click",
  pageId: "flight_search",
  buttonId: "search_submit",
  objectId: "search_form",
  pageNav: "/home > /flights > /search"
}
```

**MySQL Schema:**
```sql
CREATE TABLE click_tracker (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  event_time DATETIME,
  event_name VARCHAR(255),
  page_id VARCHAR(255),
  button_id VARCHAR(255),
  object_id VARCHAR(255),
  page_nav TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user (user_id),
  INDEX idx_session (session_id),
  INDEX idx_time (event_time),
  INDEX idx_page (page_id)
);
```

### 2. Page View Tracking

Tracks user navigation patterns across the platform.

**Data Captured:**
```javascript
{
  sessionId: "sess_abc123",
  userId: "USR-001",
  pageUrl: "/flights/search",
  pageTitle: "Flight Search",
  referrer: "/home",
  enteredAt: "2024-12-01T10:30:00Z",
  exitedAt: "2024-12-01T10:35:00Z",
  duration: 300, // seconds
  device: {
    type: "desktop",
    browser: "Chrome",
    os: "MacOS",
    screenSize: "1920x1080"
  }
}
```

### 3. Search History Tracking

Records all user search queries for analysis.

**Data Captured:**
```javascript
{
  userId: "USR-001",
  searchType: "FLIGHT",
  sourceCity: "San Francisco",
  destinationCity: "New York",
  startDate: "2024-12-15",
  endDate: "2024-12-20",
  passengers: 2,
  searchParams: {
    class: "Economy",
    directOnly: true,
    priceRange: [100, 500]
  },
  resultsCount: 45,
  selectedResult: "FL-12345"
}
```

### 4. Booking Funnel Tracking

Monitors user progress through the booking process.

**Funnel Stages:**
```
1. Search Initiated  → 100% (10,000 users)
2. Results Viewed    →  85% (8,500 users)
3. Item Selected     →  45% (4,500 users)
4. Checkout Started  →  25% (2,500 users)
5. Payment Initiated →  20% (2,000 users)
6. Booking Complete  →  15% (1,500 users)
```

## Why This Tracking is Effective

### 1. **Granular User Behavior Analysis**

| Metric | Business Value |
|--------|----------------|
| Click patterns | Identify confusing UI elements |
| Page duration | Measure engagement |
| Navigation paths | Optimize user flow |
| Drop-off points | Reduce cart abandonment |

### 2. **Real-time Analytics**

- Track trending destinations
- Monitor search patterns
- Identify peak usage times
- Detect anomalies quickly

### 3. **Personalization Opportunities**

Based on tracking data:
- Recommend frequently searched routes
- Show personalized deals
- Pre-fill search forms
- Suggest relevant add-ons

### 4. **Performance Optimization**

- Identify slow pages
- Track error rates
- Monitor API response times
- Optimize popular features

## Analytics Queries

### Top 10 Most Clicked Pages
```sql
SELECT 
  page_id,
  COUNT(*) as click_count
FROM click_tracker
WHERE event_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY page_id
ORDER BY click_count DESC
LIMIT 10;
```

### User Journey Analysis
```sql
SELECT 
  user_id,
  GROUP_CONCAT(page_id ORDER BY event_time) as journey
FROM click_tracker
WHERE session_id = ?
GROUP BY user_id;
```

### Hourly Traffic Distribution
```sql
SELECT 
  HOUR(event_time) as hour,
  COUNT(*) as events
FROM click_tracker
WHERE event_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY HOUR(event_time)
ORDER BY hour;
```

### Conversion by Source
```javascript
db.analytics.aggregate([
  { $match: { type: "booking", date: { $gte: thirtyDaysAgo } } },
  { $group: {
    _id: "$source",
    bookings: { $sum: 1 },
    revenue: { $sum: "$amount" }
  }},
  { $sort: { revenue: -1 } }
]);
```

## Dashboard Visualizations

### 1. Click Throughput (Bar Chart)
Shows clicks per page over time, helping identify:
- Most popular features
- Underutilized pages
- UI bottlenecks

### 2. Time Spent Per Page (Donut Chart)
Displays engagement distribution:
- High engagement pages (potential for upselling)
- Low engagement pages (need optimization)

### 3. Top 5 Charts
- **Top 5 Flights**: Most booked routes
- **Top 5 Hotels**: Most popular properties
- **Top 5 Cars**: Most rented vehicles

### 4. User Activity Histogram
Shows activity distribution by user:
- Power users (high activity)
- Casual users (occasional)
- At-risk users (declining activity)

### 5. Navigation Word Tree
Visualizes common user paths:
```
Home
├── Flights (45%)
│   ├── Search (90%)
│   │   └── Results (80%)
│   │       └── Booking (30%)
│   └── Deals (10%)
├── Hotels (35%)
│   └── Search (85%)
└── Cars (20%)
    └── Search (75%)
```

## Implementation Example

### Frontend Tracking Code
```javascript
// Track click event
const trackClick = async (clickInfo) => {
  const payload = {
    userId: currentUser?.id || 'anonymous',
    sessionId: getSessionId(),
    eventTime: new Date().toISOString(),
    eventName: 'click',
    pageId: window.location.pathname,
    buttonId: clickInfo.buttonId,
    objectId: clickInfo.objectId,
    pageNav: getNavigationHistory()
  };
  
  await api.post('/analytics/track', payload);
};

// Track page view
const trackPageView = () => {
  const payload = {
    sessionId: getSessionId(),
    userId: currentUser?.id,
    pageUrl: window.location.href,
    pageTitle: document.title,
    referrer: document.referrer,
    timestamp: new Date().toISOString()
  };
  
  api.post('/analytics/pageview', payload);
};
```

### Backend Processing
```javascript
// Kafka consumer for tracking events
consumer.on('message', async (message) => {
  const event = JSON.parse(message.value);
  
  if (event.type === 'click') {
    await mysql.execute(
      `INSERT INTO click_tracker 
       (user_id, session_id, event_time, event_name, page_id, button_id, object_id, page_nav)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [event.userId, event.sessionId, event.eventTime, 
       event.eventName, event.pageId, event.buttonId, 
       event.objectId, event.pageNav]
    );
  }
  
  // Also store in MongoDB for aggregation
  await mongodb.collection('events').insertOne(event);
});
```

## Privacy Considerations

1. **Anonymization**: User IDs can be anonymized for analytics
2. **Consent**: Tracking only with user consent
3. **Data Retention**: Auto-delete after 90 days
4. **No PII**: Don't track sensitive personal information
5. **Opt-out**: Users can opt out of tracking

## Metrics & KPIs

| KPI | Target | Current |
|-----|--------|---------|
| Conversion Rate | 15% | 12.5% |
| Avg Session Duration | 8 min | 6.5 min |
| Bounce Rate | < 40% | 38% |
| Pages per Session | 5+ | 4.2 |
| Cart Abandonment | < 70% | 68% |

---

*This tracking system enables data-driven decisions for improving user experience and business outcomes.*

