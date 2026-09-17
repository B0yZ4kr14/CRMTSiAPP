# CRMTSiAPP - Professional WhatsApp CRM System

## Overview
CRMTSiAPP is a professional WhatsApp CRM system designed for PMEs and customer service teams. It provides comprehensive conversation management, contact relationship tracking, and business process automation while maintaining the highest standards for security, compliance, and user experience.

## Key Features

### Core Functionality
- **Inbox Management**: Real-time conversation inbox with search and filtering
- **Contact 360°**: Complete contact history and relationship management
- **Channel Management**: WhatsApp integration, webhook processing, health monitoring
- **Business Operations**: Team management, queue management, SLA management
- **Security & Compliance**: RBAC, CSRF protection, rate limiting, GDPR compliance

### Technical Architecture
- **Frontend**: Next.js with TypeScript
- **Backend**: NestJS
- **Database**: PostgreSQL (pure local)
- **Cache**: Redis
- **Message Queue**: Redis/Kafka
- **Storage**: S3-compatible

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Installation
```bash
# Clone repository
git clone <repository-url>
cd crmtsiapp

# Install dependencies
npm install

# Environment setup
cp .env.example .env

# Database setup
npm run db:migrate

# Start development server
npm run dev
```

## Project Structure

```
src/
  /components     # React components
  /domain         # Domain models and services
  /infrastructure # Infrastructure configuration
  /presentation   # Presentation layer
  /types          # TypeScript definitions
  /utils          # Utility functions

/tests
  /integration     # Integration tests
  /unit           # Unit tests
  /e2e            # End-to-end tests

/docs           # Documentation
  /api-docs      # API documentation
  /architecture  # Architecture documentation
  /guides        # User guides

/scripts        # Deployment and setup scripts
```

## Development Commands

```bash
# Run tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Lint code
npm run lint

# Type checking
npm run type-check

# Database migration
npm run db:migrate
```

## Deployment

### Local Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Production
```bash
# Using systemd
systemctl enable crmtsiapp
systemctl start crmtsiapp

# Using docker-compose
docker-compose up -d
```

## Contributing

### Code Standards
- Follow ESLint rules
- Maintain TypeScript strict mode
- Write comprehensive tests
- Document changes
- Follow conventional commits

### Pull Request Process
1. Create a feature branch
2. Make your changes
3. Write tests
4. Commit and push
5. Create a pull request
6. Wait for review and approval

## Security

### Data Protection
- All sensitive data encrypted
- Role-based access control
- Comprehensive audit logging
- Regular security assessments

### Compliance
- GDPR compliant
- LGPD compliant
- SOC 2 Type II ready
- ISO 27001 aligned

## Performance

### Scalability
- Horizontal scaling support
- Load balancing
- Auto-scaling
- Database optimization

### Monitoring
- Application monitoring
- Performance metrics
- Error tracking
- Resource monitoring

## Acknowledgements

Thanks to the open source community and all contributors.
