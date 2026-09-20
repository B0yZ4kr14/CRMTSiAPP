const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

const tenantMatrix = Object.freeze({
  tenants: [
    { id: TENANT_A, name: 'Tenant A', slug: 'tenant-a' },
    { id: TENANT_B, name: 'Tenant B', slug: 'tenant-b' },
  ],
  users: [
    { id: 'user-a', tenantId: TENANT_A, email: 'operator@example.test', role: 'admin' },
    { id: 'user-b', tenantId: TENANT_B, email: 'operator@example.test', role: 'admin' },
  ],
  contacts: [
    { id: 'contact-a', tenantId: TENANT_A, name: 'Cliente Colisão', phone: '+5511999999999', externalId: 'shared-external' },
    { id: 'contact-b', tenantId: TENANT_B, name: 'Cliente Colisão', phone: '+5511999999999', externalId: 'shared-external' },
  ],
  tags: [
    { id: 'tag-a', tenantId: TENANT_A, name: 'VIP' },
    { id: 'tag-b', tenantId: TENANT_B, name: 'VIP' },
  ],
  conversations: [
    { id: 'conversation-a', tenantId: TENANT_A, contactId: 'contact-a', providerId: 'shared-provider-id' },
    { id: 'conversation-b', tenantId: TENANT_B, contactId: 'contact-b', providerId: 'shared-provider-id' },
  ],
  knowledge: [
    { id: 'article-a', tenantId: TENANT_A, title: 'Política compartilhada', marker: 'tenant-a-only' },
    { id: 'article-b', tenantId: TENANT_B, title: 'Política compartilhada', marker: 'tenant-b-only' },
  ],
});

module.exports = { TENANT_A, TENANT_B, tenantMatrix };
