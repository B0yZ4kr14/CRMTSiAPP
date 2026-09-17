export interface User {
  id: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  status: string;
  channel: string;
  assignedUserId: string;
  queueId: string;
  priority: string;
  lastMessageAt: Date;
  lastInboundAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: string;
  body: string;
  providerMessageId: string;
  deliveryStatus: string;
  createdAt: Date;
}

export interface Channel {
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  config: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelCredential {
  id: string;
  channelId: string;
  secretId: string;
  validationState: string;
  validatedAt: Date;
  lastError: string;
  updatedAt: Date;
}

export interface Secret {
  id: string;
  purpose: string;
  activeVersionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecretVersion {
  id: string;
  secretId: string;
  ciphertext: string;
  keyVersion: number;
  createdAt: Date;
  retiredAt: Date;
}

export interface WebhookEvent {
  id: string;
  channelId: string;
  providerEventId: string;
  eventType: string;
  signatureValid: boolean;
  payload: any;
  status: string;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  lockedAt: Date;
  lockedBy: string;
  leaseToken: string;
  receivedAt: Date;
  processedAt: Date;\n  processingError: string;
  updatedAt: Date;
}
