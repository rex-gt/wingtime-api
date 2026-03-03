# Flying Club Scheduling System API

A comprehensive backend service for managing aircraft scheduling, flight logs, and member billing for a flying club.

## Project Structure

```
flying-club-api/
├── src/                          # Application source code
│   ├── app.js                   # Express app setup and main endpoint definitions
│   ├── index.js                 # Application entry point
│   ├── config/
│   │   └── database.js          # PostgreSQL connection pool configuration
│   ├── controllers/
│   │   ├── aircraftController.js
│   │   ├── authController.js
│   │   ├── memberController.js
│   │   └── reservationsController.js
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── aircraftRoutes.js
│   │   ├── memberRoutes.js
│   │   ├── reservationsRoutes.js
│   │   └── userRoutes.js
│   └── utils/                   # Utility functions (for future use)
├── db/
│   ├── schema.sql               # Complete database schema
│   └── sample-data.sql          # Sample data for testing
├── test/                        # Comprehensive test suite
│   ├── aircraft.test.js         # Aircraft endpoint tests (6 tests)
│   ├── app.test.js              # API smoke tests (4 tests)
│   ├── auth.test.js             # Authentication tests (4 tests)
│   ├── auth-curl-example.sh     # Example curl commands for auth
│   ├── billing.test.js          # Billing endpoint tests (15 tests)
│   ├── flightlogs.test.js       # Flight logs tests (8 tests)
│   ├── members.test.js          # Members endpoint tests (5 tests)
│   ├── reservations.test.js     # Reservations endpoint tests (6 tests)
│   └── utility.test.js          # Utility endpoint tests (12 tests)
├── index.js                     # Application entry point
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
- **Comprehensive Testing**: 60 tests across 8 test suites with 100% endpoint coverage

## Database Schema

### Tables

1. **members** - Club member information and authentication
2. **aircraft** - Fleet aircraft details and current tach hours
3. **reservations** - Scheduled aircraft bookings with conflict detection
4. **flight_logs** - Actual flight records with tach hours
5. **billing_records** - Generated billing based on usage

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

6. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The API will be available at `http://localhost:3000`

## Testing

### Test Coverage

The project includes comprehensive test coverage with **60 tests** across **8 test suites**, covering **100% of all endpoints**:

| Test Suite | Tests | Coverage |
|-----------|-------|----------|
| aircraft.test.js | 6 | Aircraft CRUD, Availability |
| app.test.js | 4 | API Smoke Tests |
| auth.test.js | 4 | Registration, Login, Profile |
| billing.test.js | 15 | Billing CRUD, Generation, Summary |
| flightlogs.test.js | 8 | Flight Logs CRUD, Filtering |
| members.test.js | 5 | Members CRUD |
| reservations.test.js | 6 | Reservations CRUD, Conflict Detection |
| utility.test.js | 12 | Aircraft Availability Utility |
| **TOTAL** | **60** | **31 Endpoints** |

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

PASS test/billing.test.js
PASS test/auth.test.js
PASS test/utility.test.js
PASS test/reservations.test.js
PASS test/flightlogs.test.js
PASS test/aircraft.test.js
PASS test/members.test.js
PASS test/app.test.js

Test Suites: 8 passed, 8 total
Tests:       60 passed, 60 total
Snapshots:   0 total
Time:        0.689 s
```

## API Endpoints

### Members

#### GET /api/members
Get all members
```bash
curl http://localhost:3000/api/members
```

#### GET /api/members/:id
Get specific member
```bash
curl http://localhost:3000/api/members/1
```

#### POST /api/members
Create new member
```bash
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "member_number": "M001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "555-0100"
  }'
```

#### PUT /api/members/:id
Update member
```bash
curl -X PUT http://localhost:3000/api/members/1 \
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
Delete member
```bash
curl -X DELETE http://localhost:3000/api/members/1
```

### Aircraft

#### GET /api/aircraft
Get all aircraft
```bash
curl http://localhost:3000/api/aircraft
```

#### GET /api/aircraft/:id
Get specific aircraft
```bash
curl http://localhost:3000/api/aircraft/1
```

#### POST /api/aircraft
Create new aircraft
```bash
curl -X POST http://localhost:3000/api/aircraft \
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
Update aircraft
```bash
curl -X PUT http://localhost:3000/api/aircraft/1 \
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
Delete aircraft
```bash
curl -X DELETE http://localhost:3000/api/aircraft/1
```

#### GET /api/aircraft/availability
Check aircraft availability for a time range
```bash
curl "http://localhost:3000/api/aircraft/availability?start_time=2024-03-15T09:00:00Z&end_time=2024-03-15T12:00:00Z"
```

### Reservations

#### GET /api/reservations
Get all reservations (with optional filters)
```bash
# All reservations
curl http://localhost:3000/api/reservations

# Filter by member
curl "http://localhost:3000/api/reservations?member_id=1"

# Filter by aircraft
curl "http://localhost:3000/api/reservations?aircraft_id=2"

# Filter by status
curl "http://localhost:3000/api/reservations?status=scheduled"

# Filter by date range
curl "http://localhost:3000/api/reservations?start_date=2024-03-01&end_date=2024-03-31"
```

#### GET /api/reservations/:id
Get specific reservation
```bash
curl http://localhost:3000/api/reservations/1
```

#### POST /api/reservations
Create new reservation (includes conflict detection)
```bash
curl -X POST http://localhost:3000/api/reservations \
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
curl -X DELETE http://localhost:3000/api/reservations/1
```

### Flight Logs

#### GET /api/flight-logs
Get all flight logs (with optional filters)
```bash
# All flight logs
curl http://localhost:3000/api/flight-logs

# Filter by member
curl "http://localhost:3000/api/flight-logs?member_id=1"

# Filter by aircraft
curl "http://localhost:3000/api/flight-logs?aircraft_id=2"

# Filter by date range
curl "http://localhost:3000/api/flight-logs?start_date=2024-03-01&end_date=2024-03-31"
```

#### GET /api/flight-logs/:id
Get specific flight log
```bash
curl http://localhost:3000/api/flight-logs/1
```

#### POST /api/flight-logs
Create new flight log
```bash
curl -X POST http://localhost:3000/api/flight-logs \
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
curl -X DELETE http://localhost:3000/api/flight-logs/1
```

### Billing

#### GET /api/billing
Get all billing records (with optional filters)
```bash
# All billing records
curl http://localhost:3000/api/billing

# Filter by member
curl "http://localhost:3000/api/billing?member_id=1"

# Filter by payment status
curl "http://localhost:3000/api/billing?is_paid=false"

# Filter by date range
curl "http://localhost:3000/api/billing?start_date=2024-03-01&end_date=2024-03-31"
```

#### POST /api/billing/generate
Generate billing record from flight log
```bash
curl -X POST http://localhost:3000/api/billing/generate \
  -H "Content-Type: application/json" \
  -d '{
    "flight_log_id": 1
  }'
```

#### PUT /api/billing/:id/pay
Mark billing as paid
```bash
curl -X PUT http://localhost:3000/api/billing/1/pay
```

#### GET /api/billing/summary/:member_id
Get billing summary for a member
```bash
curl http://localhost:3000/api/billing/summary/1
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
curl -X DELETE http://localhost:3000/api/billing/1
```

## Workflow Example

### Complete Flight and Billing Workflow

1. **Create a reservation:**
```bash
curl -X POST http://localhost:3000/api/reservations \
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
  -H "Content-Type: application/json" \
  -d '{
    "flight_log_id": 1
  }'
# Returns: { "id": 1, "amount": 310.50, "is_paid": false, ... }
```

4. **Mark as paid when member pays:**
```bash
curl -X PUT http://localhost:3000/api/billing/1/pay
# Returns: { "id": 1, "is_paid": true, "payment_date": "2024-03-20", ... }
```

5. **Check member's billing summary:**
```bash
curl http://localhost:3000/api/billing/summary/1
# Returns total hours flown, amount owed, amount paid, etc.
```

## Authentication

This API uses JWT authentication for protected endpoints.

Environment variables (minimum):

- `JWT_SECRET` — secret used to sign tokens
- `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT` — Postgres connection

Auth endpoints:

- `POST /api/users/register` — register a new member. Required fields: `first_name`, `last_name`, `email`, `password`.
- `POST /api/users/login` — returns `{ token }` when successful.
- `GET /api/users/profile` — protected route; include header `Authorization: Bearer <token>`.

Quick curl example:

```bash
# Register
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Access protected profile (replace <token> with login token)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/users/profile
```

You can also run the provided script `test/auth-curl-example.sh` for testing auth endpoints.


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

- Advanced role-based authorization (RBAC) for different user types
- Email notifications for reservations, cancellations, and billing
- Maintenance tracking for aircraft with preventive maintenance scheduling
- Flight instructor scheduling and student progress tracking
- Weather integration for flight planning
- Mobile app integration (iOS/Android)
- Reporting and analytics dashboard
- Payment processing integration (Stripe, PayPal)
- SMS notifications for reservation reminders
- Aircraft courier log tracking
- Insurance document management
- Fuel tracking and cost analysis

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- New endpoints include corresponding test cases
- Code follows existing project structure and conventions

## Support

For issues, questions, or feature requests, please open an issue or contact the development team.

## License

MIT
