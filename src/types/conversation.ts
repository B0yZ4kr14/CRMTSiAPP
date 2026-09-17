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
