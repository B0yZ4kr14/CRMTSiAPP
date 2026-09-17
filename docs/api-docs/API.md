# API Documentation

## Overview
This document contains the API documentation for CRMTSiAPP.

## Authentication
API calls require authentication via JWT tokens.

## Endpoints

### Conversations
- GET /api/conversations - Get all conversations
- POST /api/conversations - Create a new conversation
- GET /api/conversations/{id} - Get conversation by ID
- PUT /api/conversations/{id} - Update conversation
- DELETE /api/conversations/{id} - Delete conversation

### Contacts
- GET /api/contacts - Get all contacts
- POST /api/contacts - Create a new contact
- GET /api/contacts/{id} - Get contact by ID
- PUT /api/contacts/{id} - Update contact
- DELETE /api/contacts/{id} - Delete contact

### Channels
- GET /api/channels - Get all channels
- POST /api/channels - Create a new channel
- GET /api/channels/{id} - Get channel by ID
- PUT /api/channels/{id} - Update channel
- DELETE /api/channels/{id} - Delete channel

### Messages
- GET /api/messages - Get all messages
- POST /api/messages - Create a new message
- GET /api/messages/{id} - Get message by ID
- PUT /api/messages/{id} - Update message
- DELETE /api/messages/{id} - Delete message
