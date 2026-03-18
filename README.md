# AeroBook Flight Management System API

A comprehensive backend service for AeroBook Flight Management System, supporting aircraft scheduling, flight logs, and member billing for a flying club.

## Project Structure

```
aerobook-api/
├── src/                          # Application source code
│   ├── app.js                   # Express app setup, CORS config, and route mounting
│   ├── index.js                 # App module re-export (used by root index.js)
│   ├── config/
│   │   └── database.js          # PostgreSQL connection pool (supports DATABASE_URL and individual params)
│   ├── controllers/             # Business logic controllers
│   │   ├── aircraftController.js
│   │   ├── authController.js
│   │   ├── billingController.js
│   │   ├── flightLogsController.js
│   │   ├── memberController.js
│   │   ├── reservationsController.js
│   │   └── utilityController.js
│   ├── middleware/
│   │   └── auth.js              # JWT authentication and role authorization middleware
│   ├── routes/                  # Route definitions with RBAC enforcement
│   │   ├── aircraftRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── flightLogsRoutes.js
│   │   ├── memberRoutes.js
│   │   ├── reservationsRoutes.js
│   │   ├── userRoutes.js
│   │   └── utilityRoutes.js
│   ├── services/                # Utility services
│   │   └── emailService.js      # Email service for welcome emails
│   └── utils/                   # Utility functions (for future use)
├── db/
│   ├── schema.sql               # Complete database schema with indexes and triggers
│   └── sample-data.sql          # Sample data for testing
├── test/                        # Comprehensive test suite
│   ├── emailService.test.js     # Email service tests (12 tests)
│   ├── auth.test.js             # Authentication tests (29 tests)
│   ├── aircraft.test.js         # Aircraft endpoint tests (6 tests)
│   ├── app.test.js              # API smoke tests (2 tests)
│   ├── billing.test.js          # Billing endpoint tests (15 tests)
│   ├── flightlogs.test.js       # Flight logs tests (8 tests)
│   ├── members.test.js          # Members endpoint tests (5 tests)
│   ├── reservations.test.js     # Reservations endpoint tests (8 tests)
│   ├── roles.test.js            # Role-based access control tests (21 tests)
│   ├── utility.test.js          # Utility endpoint tests (12 tests)
├── index.js                     # Application entry point (HTTP/HTTPS server)
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## Features

- **Member Management**: CRUD operations for club members with role-based access
- **Aircraft Fleet Management**: Track aircraft details, availability, tach hours, and hourly rates
- **Reservation System**: Schedule aircraft with built-in conflict detection
- **Flight Logging**: Record actual flight times, calculate tach hours, auto-update aircraft tach
- **Automated Billing**: Generate billing records based on tach hours and hourly rates
- **Availability Checking**: Query aircraft availability for specific time ranges
- **JWT Authentication**: Secure endpoints with token-based authentication
- **Role-Based Access Control (RBAC)**: Three user roles (Admin, Operator, Member) with enforced permissions
- **HTTPS Support**: Optional SSL/TLS encryption with configurable certificates
- **Protected Endpoints**: All API endpoints require authentication and role authorization
- **Welcome Email Service**: Automated welcome emails with password reset links for new members
- **Password Reset Flow**: Complete token-based password reset via email links
- **User Profile Management**: Update profile information, change password with verification
- **Comprehensive Testing**: 126 unit tests across 10 test suites plus 29 live server integration tests
- **Clean Architecture**: Modular design with separation of concerns

## Architecture

The project follows a clean, modular architecture with proper separation of concerns:

### Controller-Route Pattern
- **Controllers** contain business logic and database operations
- **Routes** define endpoint paths, mount controller functions, and enforce RBAC via `protect` and `authorize` middleware
- **Middleware** handles JWT authentication (`protect`) and role-based authorization (`authorize`)

### CORS Configuration
`app.js` supports configurable allowed origins via the `ALLOWED_ORIGINS` environment variable. It supports exact matches and wildcard patterns (e.g., `*.vercel.app`). Defaults to `http://localhost:5173`, `http://localhost:4200`, and `https://aerobook.app`.

### File Organization
- `index.js` - HTTP/HTTPS server entry point; reads SSL certs if configured
- `app.js` - Express app setup: CORS, middleware, and route mounting
- 7 controller files - Each handling a specific business domain
- 7 route files - Endpoint definitions with `asyncHandler` wrapper and role guards
- `src/services/emailService.js` - Email service for welcome emails and notifications
- Centralized error handling and database configuration

### Benefits
- **Maintainable**: Each domain has its own controller/route files
- **Testable**: Clean separation allows for easier unit testing
- **Scalable**: Easy to add new endpoints following the established pattern
- **Secure**: Every endpoint requires JWT authentication; routes enforce role requirements

## Database Schema

### Tables

1. **members** - Club member information, authentication, and roles (`admin` | `operator` | `member`)
2. **aircraft** - Fleet aircraft details, tach hours, and availability
3. **reservations** - Scheduled bookings with conflict detection; statuses: `scheduled`, `in_progress`, `completed`, `cancelled`
4. **flight_logs** - Actual flight records; `tach_hours` is a computed column (`tach_end - tach_start`)
5. **billing_records** - Generated billing per flight log based on tach hours × hourly rate

### Indexes
Optimized query indexes on foreign keys, time ranges, reservation status, and billing payment status.

### Triggers
All tables have an `update_updated_at_column` trigger that automatically updates `updated_at` on row changes.

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create PostgreSQL database:
```bash
createdb flying_club
```

3. Run the schema setup:
```bash
psql -d flying_club -f db/schema.sql
```

4. (Optional) Load sample data:
```bash
psql -d flying_club -f db/sample-data.sql
```

5. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT_SECRET
```

Required variables:
```env
# Database (local dev – use individual params OR provide DATABASE_URL for Railway/production)
DB_USER=postgres
DB_HOST=localhost
DB_NAME=flying_club
DB_PASSWORD=password
DB_PORT=5432

# Or for production (Railway):
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Auth
JWT_SECRET=your_jwt_secret_here

# Email/SMTP Configuration (for welcome emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@aerobook.app
SMTP_SECURE=false

# Optional: Separate secret for password reset tokens
# RESET_TOKEN_SECRET=your_reset_token_secret_here

# Optional: App URL for email links (for frontend app redirects)
# APP_URL=https://aerobook.app

# CORS – comma-separated list; supports wildcard patterns like *.vercel.app
# ALLOWED_ORIGINS=http://localhost:5173,https://aerobook.app

# Optional SSL (omit to run plain HTTP)
# SSL_KEY_PATH=/path/to/privkey.pem
# SSL_CERT_PATH=/path/to/fullchain.pem
```

6. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The API will be available at `http://localhost:3000` (or `https://localhost:3000` if SSL is configured).

## Role-Based Access Control (RBAC)

All endpoints require a valid JWT (`Authorization: Bearer <token>`). Role requirements per endpoint:

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/api/users/login` | POST | Public |
| `/api/users/reset-password` | POST | Public |
| `/api/users/profile` | GET / PUT | Any authenticated |
| `/api/members` | GET | admin, operator |
| `/api/members/:id` | GET | Any authenticated |
| `/api/members` | POST | admin |
| `/api/members/:id` | PUT | Any authenticated (own record) |
| `/api/members/:id` | DELETE | admin |
| `/api/aircraft` | GET / GET /:id / availability | Any authenticated |
| `/api/aircraft` | POST / PUT | admin, operator |
| `/api/aircraft/:id` | DELETE | admin |
| `/api/reservations` | All | Any authenticated |
| `/api/flight-logs` | All | Any authenticated |
| `/api/billing` | All | Any authenticated |

## Email Service

The API includes an automated email service that sends welcome emails to newly created members. This feature helps with member onboarding and provides a secure password setup link.

### Welcome Email Flow

1. **Member Creation**: When a new member is created by an admin
2. **Email Generation**: A welcome email is automatically generated with:
   - Personalized greeting with the member's name
   - Secure password setup link with JWT token
   - 24-hour token expiration notice
   - Security disclaimer for account protection
3. **Email Delivery**: The email is sent asynchronously (fire-and-forget), so registration completes immediately
4. **Password Reset Link**: The email contains a unique token-based link for the member to set/reset their password

### SMTP Configuration

To enable the email service, configure the following environment variables:

```env
# SMTP Server (Gmail, Office 365, custom server, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Sender configuration
SMTP_FROM=noreply@aerobook.app
SMTP_SECURE=false  # Set to 'true' for port 465 (implicit TLS)

# Optional: Use a different secret for password reset tokens
# If not set, JWT_SECRET is used
RESET_TOKEN_SECRET=your_reset_token_secret_here

# Optional: App URL for email links (for frontend app redirects)
APP_URL=https://aerobook.app
```

### Gmail Configuration (Recommended)

To use Gmail with this API:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the generated 16-character password as `SMTP_PASS`
4. Set `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=587`

### Email Service Details

- **Location**: `src/services/emailService.js`
- **Exported Function**: `sendWelcomeEmail(user)`
- **Token Expiration**: 24 hours
- **Error Handling**: Email failures are logged but don't prevent user registration (non-blocking)

### Testing Email Service

The email service includes comprehensive test coverage (12 tests):

```bash
npm test -- emailService.test.js
```

Tests cover:
- Email structure and recipient validation
- Personalized greetings
- Password reset link generation
- JWT token payload and configuration
- SMTP transporter configuration
- Multiple SMTP backends (Gmail, custom servers, etc.)
- Environment variable overrides
- Error handling for failed email sends

## Testing

### Test Coverage

The project includes comprehensive test coverage with **126 unit tests** across **10 test suites**, covering **100% of all endpoints**:

| Test Suite | Tests | Coverage |
|-----------|-------|----------|
| emailService.test.js | 12 | Email service, SMTP config, token generation |
| auth.test.js | 29 | Registration, Login, Profile, Updates, Password change, Password reset, Welcome email |
| aircraft.test.js | 6 | Aircraft CRUD, Availability |
| app.test.js | 2 | API Smoke Tests |
| billing.test.js | 15 | Billing CRUD, Generation, Summary |
| flightlogs.test.js | 8 | Flight Logs CRUD, Filtering |
| members.test.js | 5 | Members CRUD |
| reservations.test.js | 8 | Reservations CRUD, Conflict Detection |
| roles.test.js | 21 | Role-Based Access Control (admin/operator/member) |
| utility.test.js | 12 | Aircraft Availability Utility |
| **TOTAL** | **126** | **35 Endpoints + Email Service** |

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test auth.test.js
npm test billing.test.js
npm test flightlogs.test.js

# Run tests in watch mode
npm test -- --watch

# Run with coverage report
npm test -- --coverage
```

### Test Architecture

- Tests use Jest as the testing framework
- Database layer is mocked using jest.mock() - **no real database required**
- JWT tokens are mocked for authentication testing
- All tests run sequentially with `--runInBand` flag
- Tests follow the Arrange-Act-Assert pattern

### Example Test Run

```bash
$ npm test

PASS test/emailService.test.js
PASS test/billing.test.js
PASS test/auth.test.js
PASS test/roles.test.js
PASS test/utility.test.js
PASS test/reservations.test.js
PASS test/flightlogs.test.js
PASS test/aircraft.test.js
PASS test/members.test.js
PASS test/app.test.js

Test Suites: 10 passed, 10 total
Tests:       126 passed, 126 total
Snapshots:   0 total
Time:        1.2 s
```

### Live Server Integration Tests

`test/smoke-test.sh` runs 29 end-to-end tests against a live running server, covering all endpoints:

```bash
# Against local server (default: https://localhost:3000)
bash test/smoke-test.sh

# Against a specific host
bash test/smoke-test.sh https://other-host:3000
```

The script logs in with a seeded admin account, exercises every endpoint (auth, members, aircraft, reservations, flight logs, billing), and cleans up all created records afterward.

> **Note**: Uses `curl -sk` to skip SSL certificate verification for self-signed certs. The server must be running before executing the script.

## API Endpoints

All protected endpoints require an `Authorization: Bearer <token>` header obtained from `/api/users/login`.

### Authentication

#### POST /api/users/login
Login and receive a JWT token
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

#### POST /api/users/reset-password
Reset password using token from welcome email
```bash
curl -X POST http://localhost:3000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "jwt-token-from-email-link",
    "password": "newpassword123"
  }'
```

**Request Body:**
- `token` (required): JWT token from the password reset link in welcome email
- `password` (required): New password to set

**Response (success):**
```json
{
  "message": "Password reset successfully"
}
```

**Error responses:**
- `400` - Token and password are required
- `400` - Invalid reset token
- `400` - Reset token has expired. Please request a new one.
- `404` - User not found

#### GET /api/users/profile
Get current user's profile
```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <token>"
```

#### PUT /api/users/profile
Update profile or change password
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "current_password": "oldpass",
    "new_password": "newpass"
  }'
```

**Query Parameters:**
- `first_name` (required): User's first name
- `last_name` (required): User's last name
- `email` (required): User's email address
- `phone` (optional): User's phone number
- `current_password` (conditional): Required when changing password
- `new_password` (optional): New password (requires current_password)

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "member_number": "M-001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "role": "member",
    "is_active": true,
    "created_at": "2024-03-01T10:00:00Z"
  }
}
```

### Members

#### GET /api/members
Get all members (admin, operator only)
```bash
curl http://localhost:3000/api/members \
  -H "Authorization: Bearer <token>"
```

#### GET /api/members/:id
Get specific member
```bash
curl http://localhost:3000/api/members/1 \
  -H "Authorization: Bearer <token>"
```

#### POST /api/members
Create new member (admin only)
```bash
curl -X POST http://localhost:3000/api/members \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "member_number": "M001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-0100",
    "password": "password123",
    "role": "member"
  }'
```

#### PUT /api/members/:id
Update member
```bash
curl -X PUT http://localhost:3000/api/members/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@example.com",
    "phone": "555-0100",
    "is_active": true
  }'
```

#### DELETE /api/members/:id
Delete member (admin only)
```bash
curl -X DELETE http://localhost:3000/api/members/1 \
  -H "Authorization: Bearer <token>"
```

### Aircraft

#### GET /api/aircraft
Get all aircraft
```bash
curl http://localhost:3000/api/aircraft \
  -H "Authorization: Bearer <token>"
```

#### GET /api/aircraft/:id
Get specific aircraft
```bash
curl http://localhost:3000/api/aircraft/1 \
  -H "Authorization: Bearer <token>"
```

#### POST /api/aircraft
Create new aircraft (admin, operator only)
```bash
curl -X POST http://localhost:3000/api/aircraft \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tail_number": "N12345",
    "make": "Cessna",
    "model": "172S",
    "year": 2018,
    "hourly_rate": 135.00,
    "current_tach_hours": 2450.5
  }'
```

#### PUT /api/aircraft/:id
Update aircraft (admin, operator only)
```bash
curl -X PUT http://localhost:3000/api/aircraft/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Cessna",
    "model": "172S",
    "year": 2018,
    "hourly_rate": 140.00,
    "current_tach_hours": 2455.3,
    "is_available": true
  }'
```

#### DELETE /api/aircraft/:id
Delete aircraft (admin only)
```bash
curl -X DELETE http://localhost:3000/api/aircraft/1 \
  -H "Authorization: Bearer <token>"
```

#### GET /api/aircraft/availability
Check aircraft availability for a time range
```bash
curl "http://localhost:3000/api/aircraft/availability?start_time=2024-03-15T09:00:00Z&end_time=2024-03-15T12:00:00Z" \
  -H "Authorization: Bearer <token>"
```

### Reservations

#### GET /api/reservations
Get all reservations (with optional filters)
```bash
# All reservations
curl http://localhost:3000/api/reservations \
  -H "Authorization: Bearer <token>"

# Filter by member
curl "http://localhost:3000/api/reservations?member_id=1" \
  -H "Authorization: Bearer <token>"

# Filter by aircraft
curl "http://localhost:3000/api/reservations?aircraft_id=2" \
  -H "Authorization: Bearer <token>"

# Filter by status
curl "http://localhost:3000/api/reservations?status=scheduled" \
  -H "Authorization: Bearer <token>"

# Filter by date range
curl "http://localhost:3000/api/reservations?start_date=2024-03-01&end_date=2024-03-31" \
  -H "Authorization: Bearer <token>"
```

#### GET /api/reservations/:id
Get specific reservation
```bash
curl http://localhost:3000/api/reservations/1 \
  -H "Authorization: Bearer <token>"
```

#### POST /api/reservations
Create new reservation (includes conflict detection)
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": 1,
    "aircraft_id": 2,
    "start_time": "2024-03-15T09:00:00Z",
    "end_time": "2024-03-15T12:00:00Z",
    "notes": "Local flight practice"
  }'
```

#### PUT /api/reservations/:id
Update reservation
```bash
curl -X PUT http://localhost:3000/api/reservations/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2024-03-15T10:00:00Z",
    "end_time": "2024-03-15T13:00:00Z",
    "status": "completed",
    "notes": "Flight completed successfully"
  }'
```

#### DELETE /api/reservations/:id
Delete reservation
```bash
curl -X DELETE http://localhost:3000/api/reservations/1 \
  -H "Authorization: Bearer <token>"
```

### Flight Logs

#### GET /api/flight-logs
Get all flight logs (with optional filters)
```bash
# All flight logs
curl http://localhost:3000/api/flight-logs \
  -H "Authorization: Bearer <token>"

# Filter by member
curl "http://localhost:3000/api/flight-logs?member_id=1" \
  -H "Authorization: Bearer <token>"

# Filter by aircraft
curl "http://localhost:3000/api/flight-logs?aircraft_id=2" \
  -H "Authorization: Bearer <token>"

# Filter by date range
curl "http://localhost:3000/api/flight-logs?start_date=2024-03-01&end_date=2024-03-31" \
  -H "Authorization: Bearer <token>"
```

#### GET /api/flight-logs/:id
Get specific flight log
```bash
curl http://localhost:3000/api/flight-logs/1 \
  -H "Authorization: Bearer <token>"
```

#### POST /api/flight-logs
Create new flight log
```bash
curl -X POST http://localhost:3000/api/flight-logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reservation_id": 1,
    "member_id": 1,
    "aircraft_id": 2,
    "tach_start": 2450.5,
    "tach_end": 2452.8,
    "flight_date": "2024-03-15",
    "departure_time": "2024-03-15T09:15:00Z",
    "arrival_time": "2024-03-15T11:45:00Z"
  }'
```

#### PUT /api/flight-logs/:id
Update flight log
```bash
curl -X PUT http://localhost:3000/api/flight-logs/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tach_start": 2450.5,
    "tach_end": 2453.0,
    "flight_date": "2024-03-15",
    "departure_time": "2024-03-15T09:15:00Z",
    "arrival_time": "2024-03-15T12:00:00Z"
  }'
```

#### DELETE /api/flight-logs/:id
Delete flight log
```bash
curl -X DELETE http://localhost:3000/api/flight-logs/1 \
  -H "Authorization: Bearer <token>"
```

### Billing

#### GET /api/billing
Get all billing records (with optional filters)
```bash
# All billing records
curl http://localhost:3000/api/billing \
  -H "Authorization: Bearer <token>"

# Filter by member
curl "http://localhost:3000/api/billing?member_id=1" \
  -H "Authorization: Bearer <token>"

# Filter by payment status
curl "http://localhost:3000/api/billing?is_paid=false" \
  -H "Authorization: Bearer <token>"

# Filter by date range
curl "http://localhost:3000/api/billing?start_date=2024-03-01&end_date=2024-03-31" \
  -H "Authorization: Bearer <token>"
```

#### POST /api/billing/generate
Generate billing record from flight log
```bash
curl -X POST http://localhost:3000/api/billing/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "flight_log_id": 1
  }'
```

#### PUT /api/billing/:id/pay
Mark billing as paid
```bash
curl -X PUT http://localhost:3000/api/billing/1/pay \
  -H "Authorization: Bearer <token>"
```

#### GET /api/billing/summary/:member_id
Get billing summary for a member
```bash
curl http://localhost:3000/api/billing/summary/1 \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "total_flights": "12",
  "total_hours": "28.50",
  "total_amount": "3990.00",
  "paid_amount": "2800.00",
  "unpaid_amount": "1190.00"
}
```

#### DELETE /api/billing/:id
Delete billing record
```bash
curl -X DELETE http://localhost:3000/api/billing/1 \
  -H "Authorization: Bearer <token>"
```

## Workflow Example

### Complete Flight and Billing Workflow

1. **Create a reservation:**
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": 1,
    "aircraft_id": 1,
    "start_time": "2024-03-15T09:00:00Z",
    "end_time": "2024-03-15T12:00:00Z"
  }'
# Returns: { "id": 1, ... }
```

2. **After the flight, create a flight log:**
```bash
curl -X POST http://localhost:3000/api/flight-logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reservation_id": 1,
    "member_id": 1,
    "aircraft_id": 1,
    "tach_start": 2450.5,
    "tach_end": 2452.8,
    "flight_date": "2024-03-15",
    "departure_time": "2024-03-15T09:15:00Z",
    "arrival_time": "2024-03-15T11:45:00Z"
  }'
# Returns: { "id": 1, "tach_hours": 2.3, ... }
```

3. **Generate billing:**
```bash
curl -X POST http://localhost:3000/api/billing/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "flight_log_id": 1
  }'
# Returns: { "id": 1, "amount": 310.50, "is_paid": false, ... }
```

4. **Mark as paid when member pays:**
```bash
curl -X PUT http://localhost:3000/api/billing/1/pay \
  -H "Authorization: Bearer <token>"
# Returns: { "id": 1, "is_paid": true, "payment_date": "2024-03-20", ... }
```

5. **Check member's billing summary:**
```bash
curl http://localhost:3000/api/billing/summary/1 \
  -H "Authorization: Bearer <token>"
# Returns total hours flown, amount owed, amount paid, etc.
```

## Data Models

### Member
```json
{
  "id": 1,
  "member_number": "M001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "555-0100",
  "is_active": true,
  "created_at": "2024-03-01T10:00:00Z",
  "updated_at": "2024-03-01T10:00:00Z"
}
```

### Aircraft
```json
{
  "id": 1,
  "tail_number": "N12345",
  "make": "Cessna",
  "model": "172S",
  "year": 2018,
  "hourly_rate": 135.00,
  "current_tach_hours": 2450.5,
  "is_available": true,
  "created_at": "2024-03-01T10:00:00Z",
  "updated_at": "2024-03-15T14:30:00Z"
}
```

### Reservation
```json
{
  "id": 1,
  "member_id": 1,
  "aircraft_id": 1,
  "start_time": "2024-03-15T09:00:00Z",
  "end_time": "2024-03-15T12:00:00Z",
  "status": "scheduled",
  "notes": "Local flight practice",
  "created_at": "2024-03-10T10:00:00Z",
  "updated_at": "2024-03-10T10:00:00Z"
}
```

### Flight Log
```json
{
  "id": 1,
  "reservation_id": 1,
  "member_id": 1,
  "aircraft_id": 1,
  "tach_start": 2450.5,
  "tach_end": 2452.8,
  "tach_hours": 2.3,
  "flight_date": "2024-03-15",
  "departure_time": "2024-03-15T09:15:00Z",
  "arrival_time": "2024-03-15T11:45:00Z",
  "created_at": "2024-03-15T12:00:00Z",
  "updated_at": "2024-03-15T12:00:00Z"
}
```

### Billing Record
```json
{
  "id": 1,
  "member_id": 1,
  "flight_log_id": 1,
  "aircraft_id": 1,
  "tach_hours": 2.3,
  "hourly_rate": 135.00,
  "amount": 310.50,
  "billing_date": "2024-03-15",
  "is_paid": false,
  "payment_date": null,
  "created_at": "2024-03-15T12:05:00Z",
  "updated_at": "2024-03-15T12:05:00Z"
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict (e.g., scheduling conflict, duplicate billing)
- `500` - Internal Server Error

Error responses include a JSON body:
```json
{
  "error": "Error description",
  "message": "Additional details"
}
```

## Security

### HTTPS Support

The API supports optional HTTPS/TLS encryption. To enable HTTPS:

1. Generate SSL certificates:
```bash
# Using OpenSSL (for development only)
openssl req -new -newkey rsa:2048 -nodes \
  -keyout server.key -out server.csr
openssl x509 -req -days 365 -in server.csr \
  -signkey server.key -out server.crt
```

2. Add environment variables to `.env`:
```
SSL_KEY_PATH=/path/to/server.key
SSL_CERT_PATH=/path/to/server.crt
```

3. Start the server. It will automatically use HTTPS when SSL paths are configured:
```bash
npm start
# Output: Tower, we are clear for takeoff on HTTPS port 3000
```

Without SSL configuration, the server runs on HTTP:
```
npm start
# Output: Tower, we are clear for takeoff on port 3000
```

### Password Security

- Passwords are hashed using bcryptjs before storage
- Users must provide valid credentials to obtain JWT tokens
- All protected endpoints require valid JWT tokens

## Features & Business Logic

### Reservation Conflict Detection
When creating a reservation, the system automatically checks for scheduling conflicts with existing reservations for the same aircraft.

### Automatic Tach Hour Updates
When a flight log is created or updated with a `tach_end` value, the aircraft's `current_tach_hours` is automatically updated.

### Calculated Tach Hours
Flight logs use a generated column to automatically calculate `tach_hours` from `tach_end - tach_start`.

### Billing Generation
Billing records are generated from completed flight logs, automatically calculating the amount based on tach hours and the aircraft's hourly rate.

### Duplicate Billing Prevention
The system prevents creating duplicate billing records for the same flight log.

## Future Enhancements

- Payment processing integration (Stripe, PayPal)
- SMS notifications for reservation reminders
- Maintenance tracking for aircraft with preventive maintenance scheduling
- Flight instructor scheduling and student progress tracking
- Weather integration for flight planning
- Mobile app integration (iOS/Android)
- Reporting and analytics dashboard
- Aircraft courier log tracking
- Insurance document management
- Fuel tracking and cost analysis
- Forgot password flow (request reset via email for existing users)
- Notification preferences per user
- Bulk member import and management

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- New endpoints include corresponding test cases
- Code follows existing project structure and conventions

## Support

For issues, questions, or feature requests, please open an issue or contact the development team.

## License

MIT
