const crypto = require('crypto');
const { auditInsert } = require('./authorization');
const { appendEvent } = require('./modules/realtime/event-store');

function createTenantInboxStore(pool) {
  return {
    async createManualConversation({ tenantId, actorUserId, name, phone = null }) {
      const id = crypto.randomUUID();
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(
          `insert into conversations(id,tenant_id,contact_name,contact_phone,status,channel,last_message_at)
           values($1,$2,$3,$4,'open','manual',now())`,
          [id, tenantId, name, phone],
        );
        await auditInsert(client, { tenantId, actorUserId, action: 'conversation.created', resourceType: 'conversation', resourceId: id, metadata: { source: 'manual' } });
        await client.query('commit');
        return { id, tenantId };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async listConversations({ tenantId }) {
      const { rows } = await pool.query(
        `select id,contact_name,contact_phone,status,channel,last_message_at,created_at,updated_at
         from conversations where tenant_id=$1
         order by last_message_at desc nulls last,created_at desc`,
        [tenantId],
      );
      return rows;
    },

    async loadConversation({ tenantId, id }) {
      const { rows } = await pool.query(
        `select id,contact_name,contact_phone,status,channel,last_message_at,created_at,updated_at
         from conversations where tenant_id=$1 and id=$2`,
        [tenantId, id],
      );
      return rows[0] || null;
    },

    async updateStatus({ tenantId, actorUserId, id, status }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await client.query(
          'update conversations set status=$1,updated_at=now() where tenant_id=$2 and id=$3 returning id',
          [status, tenantId, id],
        );
        if (!result.rowCount) {
          await client.query('rollback');
          return false;
        }
        await auditInsert(client, { tenantId, actorUserId, action: 'conversation.status_changed', resourceType: 'conversation', resourceId: id, metadata: { status } });
        await appendEvent(client, {
          id: crypto.randomUUID(), tenantId, eventType: 'inbox.conversation.updated',
          aggregateType: 'conversation', aggregateId: id, aggregateVersion: Date.now(),
          payload: { eventId: crypto.randomUUID(), conversationId: id, status },
          audience: { capabilities: ['conversation:read'] },
        });
        await client.query('commit');
        return true;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },

    async assign({ tenantId, actorUserId, id, queueId = null, assignedUserId = null }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await client.query(
          'update conversations set queue_id=$1,assigned_user_id=$2,updated_at=now() where tenant_id=$3 and id=$4 returning id',
          [queueId, assignedUserId, tenantId, id],
        );
        if (!result.rowCount) {
          await client.query('rollback');
          return false;
        }
        await client.query(
          'insert into conversation_assignments(id,conversation_id,assigned_user_id,assigned_by,queue_id,reason) values($1,$2,$3,$4,$5,$6)',
          [crypto.randomUUID(), id, assignedUserId, actorUserId, queueId, 'manual'],
        );
        await auditInsert(client, { tenantId, actorUserId, action: 'conversation.assigned', resourceType: 'conversation', resourceId: id, metadata: { queueId, assignedUserId } });
        await appendEvent(client, {
          id: crypto.randomUUID(), tenantId, eventType: 'inbox.assignment.changed',
          aggregateType: 'conversation', aggregateId: id, aggregateVersion: Date.now(),
          payload: { eventId: crypto.randomUUID(), conversationId: id, queueId, assignedUserId },
          audience: { capabilities: ['conversation:read'] },
        });
        await client.query('commit');
        return true;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createTenantInboxStore };
