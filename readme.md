# Railway Ticket Reservation API

A RESTful API for managing railway ticket reservations, built with Node.js, Express, and PostgreSQL using Sequelize ORM. The API supports booking tickets, cancelling tickets, and retrieving booked and available tickets. It also provides Swagger API documentation.

---

## Technologies Used

- **Node.js** with **Express** for backend server
- **PostgreSQL** as the database
- **Sequelize** ORM for database operations
- **dotenv** for environment variable management
- **Swagger (swagger-jsdoc & swagger-ui-express)** for API documentation
- **Nodemon** for development auto-reloading

---

## How to Run the Project

### Running with Docker

1. Make sure you have [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your system.

2. Create a `.env` file in the project root with your database credentials, for example:

   ```env
   DB_USER=myuser
   DB_PASSWORD=mypassword
   DB_NAME=mydb
   PORT=4000
   ```

3. Build and start the containers:

   ```bash
   docker-compose up --build
   ```

4. The backend server will be accessible at:

   ```
   http://localhost:4000/api/v1/tickets
   ```

5. To stop the containers, run:

   ```bash
   docker-compose down
   ```

---

### Running Locally (Without Docker)

1. Make sure PostgreSQL is installed and running on your machine.

2. Create a `.env` file in the project root and add your database configuration:

   ```env
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   PORT=4000
   DATABASE_URL=postgres://your_db_user:your_db_password@localhost:5432/your_db_name
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the backend server in development mode:

   ```bash
   npm run dev
   ```

5. Access the API at:

   ```
   http://localhost:4000/api/v1/tickets
   ```

---

### Swagger Documentation

Once the server is running, visit the API docs at:

## API Endpoints

Base URL: `/api/v1/tickets`

| Method | Endpoint            | Description                      |
| ------ | ------------------- | -------------------------------- |
| POST   | `/book`             | Book a new ticket                |
| POST   | `/cancel/:ticketId` | Cancel a booked ticket by ID     |
| GET    | `/booked`           | Get all booked tickets           |
| GET    | `/available`        | Get summary of available tickets |

---

### Example: Booking a Ticket

**Request:**

```http
POST /api/v1/tickets/book
Content-Type: application/json

{
  "passengers": [
    {
      "name": "John Doe",
      "age": 30,
      "gender": "male"
    },
    {
      "name": "Jane Smith",
      "age": 25,
      "gender": "female"
    }
  ]
}
```
