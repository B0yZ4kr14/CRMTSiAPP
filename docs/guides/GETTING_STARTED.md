# Getting Started with CRMTSiAPP

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd crmtsiapp
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Set Up Environment Variables
Copy the environment file:
```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

### Step 4: Set Up Database
```bash
npm run db:migrate
```

### Step 5: Start the Application
```bash
npm run dev
```

## Basic Usage

### Creating a Conversation
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "contactName": "John Doe",
    "contactPhone": "+1234567890",
    "status": "open",
    "channel": "whatsapp"
  }'
```

### Sending a Message
```bash
curl -X POST http
```

### Getting Conversations
```bash
curl -X GET http://localhost:3000/api/conversations
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check your database configuration in `.env`
   - Ensure PostgreSQL is running
   - Verify database credentials

2. **Port Already in Use**
   - Change the port in `.env` file
   - Check if another application is using the port

3. **API Request Errors**
   - Check the API endpoint
   - Verify request format
   - Check for CORS issues

## Support

For support, please visit our documentation or contact our support team.
