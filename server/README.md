
#  Breezo Backend API


This repository contains the backend system for **Breezo**, a decentralized IoT-based air quality monitoring platform where ESP32 devices send real-time environmental sensor data to a server. The backend processes, stores, and exposes this data for public visualization (maps) and user dashboards.

---

# 🚀 Base URL

```

[http://localhost:5000/api/v1](http://localhost:5000/api/v1)

```

---

# 🧠 System Architecture

```

ESP32 Device
↓
POST /node/ingest
↓
Express Backend (Validation + Processing)
↓
MongoDB
├── NodeLatest (real-time map data)
├── SensorHistory (analytics)
└── User (authentication + rewards)
↓
API Layer
├── /map/nodes (public map data)
└── /node/dashboard (user analytics)

```

---

# 🔐 Authentication Module

## 1. Register User

### Endpoint
```

POST /auth/signup

````

### Request Body
```json
{
  "fullName": "John Doe",
  "email": "john@test.com",
  "password": "12345678",
  "role": "User"
}
````

### Description

Creates a new user account and returns authentication token.

---

## 2. Login User

### Endpoint

```
POST /auth/login
```

### Request Body

```json
{
  "email": "john@test.com",
  "password": "12345678"
}
```

### Response

```json
{
  "success": true,
  "token": "jwt_token"
}
```

### Description

Authenticates user and returns JWT token for protected routes.

---

# 📡 IoT Node Module

## 3. Sensor Data Ingestion (ESP32)

### Endpoint

```
POST /node/ingest
```

### Who Uses This?

👉 ESP32 IoT devices

### Request Body

```json
{
  "nodeId": "node-001",
  "ownerEmail": "john@test.com",
  "temperature": 25,
  "humidity": 60,
  "pm25": 120,
  "pm10": 80,
  "aqi": 150,
  "aqiLevel": "Unhealthy",
  "location": {
    "lat": 27.7172,
    "lng": 85.3240
  }
}
```

### Backend Processing Flow

On every request:

1. Upsert latest node data in `NodeLatest`
2. Store historical data in `SensorHistory`
3. Increment reward (`+0.001`)
4. Maintain node ownership mapping

### Response

```json
{
  "success": true,
  "message": "Data ingested successfully"
}
```

---

## 4. Public Map Data (Leaflet / Mapbox)

### Endpoint

```
GET /map/nodes
```

### Who Uses This?

👉 Public frontend (no authentication required)

### Description

Returns all active nodes with latest sensor data for map visualization.

### Response

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "nodeId": "node-001",
      "lat": 27.7172,
      "lng": 85.3240,
      "aqi": 150,
      "aqiLevel": "Unhealthy",
      "temperature": 25,
      "pm25": 120,
      "pm10": 80,
      "reward": 4.12,
      "updatedAt": "2026-04-23T10:00:00Z"
    }
  ]
}
```

### Purpose

Provides real-time geospatial data for Leaflet/Mapbox visualization.

---

## 5. User Dashboard (Protected)

### Endpoint

```
GET /node/dashboard
```

### Headers

```
Authorization: Bearer <jwt_token>
```

### Who Uses This?

👉 Authenticated users only

### Description

Returns user-owned nodes and total rewards.

### Response

```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "nodeId": "node-001",
        "aqi": 150,
        "reward": 4.12
      }
    ],
    "totalReward": 12.45
  }
}
```

---

# 💰 Reward System

### Rule

Each valid sensor ingestion request:

```
reward += 0.001
```

### Stored In

* `NodeLatest.reward`

### Future Upgrade

* Aggregate into `User.totalEarnings`

---

# 📊 Data Models

## NodeLatest (Real-time State)

```
nodeId
ownerEmail
temperature
humidity
pm25
pm10
aqi
aqiLevel
location { lat, lng }
reward
updatedAt
```

## SensorHistory (Analytics)

```
nodeId
temperature
humidity
pm25
pm10
aqi
timestamp
```

## User

```
fullName
email
password
role
totalEarnings
```

---

# 🔄 System Workflow

## 1. ESP32 Device Flow

```
Sensor Data →
POST /node/ingest →
Backend Processing →
MongoDB Update →
Reward Increment
```

---

## 2. Public Map Flow

```
Frontend →
GET /map/nodes →
Receive NodeLatest Data →
Render on Leaflet/Mapbox
```

---

## 3. User Dashboard Flow

```
Login →
GET /node/dashboard →
Return Owned Nodes + Earnings
```

---

# 🗺️ Map System Rules

### AQI Color Mapping

* 🟢 0–50 → Good
* 🟡 51–100 → Moderate
* 🟠 101–150 → Unhealthy for sensitive groups
* 🔴 151–200 → Unhealthy
* 🟣 200+ → Hazardous

---

# ⚙️ Environment Variables

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

---

# 🚀 Run the Project

```bash
npm install
npm run dev
```

Server runs at:

```
http://localhost:5000
```

---

# 🎯 Project Goal

Breezo simulates a decentralized environmental monitoring network where:

* IoT devices stream real-time air quality data
* Data is stored and processed in real time
* Users visualize global pollution maps
* Contributors earn rewards per sensor update


