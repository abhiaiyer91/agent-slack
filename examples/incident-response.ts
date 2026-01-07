/**
 * Incident Response Example
 *
 * This example demonstrates how agents can coordinate during an incident:
 * - Urgent alerts and notifications
 * - Agent handoffs
 * - Task creation and assignment
 * - Status updates and tracking
 */

import {
  AgentWorkspace,
  Artifact,
  WorkflowBuilder,
} from '../src/index.js';

async function runIncidentExample() {
  console.log('🚨 Starting Incident Response Example\n');
  console.log('='.repeat(60) + '\n');

  // ==================== Setup ====================
  const workspace = new AgentWorkspace('acme-ops', {
    description: 'ACME Operations & Incident Response',
  });

  // Create channels
  const incidents = workspace.createChannel('incidents', {
    purpose: 'Active incident tracking and response',
  });

  const alerts = workspace.createChannel('alerts', {
    purpose: 'Automated monitoring alerts',
  });

  // Register agents
  const monitorAgent = workspace.registerAgent({
    id: 'monitor-agent',
    name: 'monitor-agent',
    description: 'Monitors systems and detects anomalies',
    capabilities: ['monitoring', 'alerting', 'anomaly_detection'],
  });

  const triageAgent = workspace.registerAgent({
    id: 'triage-agent', 
    name: 'triage-agent',
    description: 'Triages incidents and assigns severity',
    capabilities: ['triage', 'severity_assessment', 'routing'],
  });

  const dbAgent = workspace.registerAgent({
    id: 'db-agent',
    name: 'db-agent',
    description: 'Database operations and troubleshooting',
    capabilities: ['database', 'query_optimization', 'backup_restore'],
  });

  const oncallAgent = workspace.registerAgent({
    id: 'oncall-agent',
    name: 'oncall-agent',
    description: 'On-call coordinator for escalations',
    capabilities: ['escalation', 'communication', 'incident_command'],
  });

  // All agents join incident channels
  [monitorAgent, triageAgent, dbAgent, oncallAgent].forEach((agent) => {
    workspace.joinChannel(agent.id, incidents.id);
    workspace.joinChannel(agent.id, alerts.id);
    workspace.setPresence(agent.id, 'online');
  });

  console.log('✅ Workspace and agents configured\n');
  console.log('-'.repeat(60) + '\n');

  // ==================== Incident Simulation ====================

  // 1. Monitor agent detects an issue
  const alertMessage = workspace.postMessage(
    monitorAgent.id,
    alerts.id,
    `🚨 **ALERT: Database Connection Pool Exhausted**

**Service**: api-production
**Metric**: db_connection_pool_available
**Current**: 0/100 connections
**Threshold**: < 10 connections
**Duration**: 5 minutes

**Impact**: API requests failing with connection timeout errors

**Related Metrics**:
- Request latency: 12,500ms (normal: 50ms)
- Error rate: 34% (normal: 0.1%)
- Active connections: 100/100

@triage-agent Please assess severity and coordinate response.`
  );

  console.log(`[${monitorAgent.name}] Posted critical alert`);

  // 2. Triage agent acknowledges and escalates
  workspace.addReaction(alertMessage.id, 'eyes', triageAgent.id);
  workspace.setPresence(triageAgent.id, 'busy', 'Triaging INC-2024-0142');

  const triageResponse = workspace.postMessage(
    triageAgent.id,
    incidents.id,
    `🔴 **INCIDENT DECLARED: INC-2024-0142**

**Severity**: SEV-1 (Critical)
**Status**: Investigating
**Commander**: @oncall-agent
**Started**: ${new Date().toISOString()}

**Summary**: Database connection pool exhaustion causing API failures

**Customer Impact**:
- 34% of API requests failing
- Affected services: user-api, payment-api, inventory-api
- Estimated affected users: ~50,000

**Initial Assessment**:
- Root cause: Likely connection leak or spike in traffic
- Database server load: Normal
- No recent deployments in last 24h

**Immediate Actions Needed**:
1. @db-agent: Investigate active connections and find leaking queries
2. @oncall-agent: Prepare customer communication
3. Consider: Emergency pod restart to clear connections

React with your role:
- 👀 Investigating
- 🔧 Taking action
- 📢 Communicating`
  );

  console.log(`[${triageAgent.name}] Declared incident and assigned roles`);

  // 3. Agents acknowledge their assignments
  workspace.addReaction(triageResponse.id, 'eyes', dbAgent.id);
  workspace.addReaction(triageResponse.id, 'eyes', oncallAgent.id);
  console.log(`[${dbAgent.name}] Acknowledged investigation role`);
  console.log(`[${oncallAgent.name}] Acknowledged commander role`);

  // 4. DB agent investigates and reports
  workspace.setPresence(dbAgent.id, 'busy', 'Investigating INC-2024-0142');
  
  const dbInvestigation = workspace.replyInThread(
    dbAgent.id,
    triageResponse.id,
    `🔍 **Database Investigation Update**

**Active Connection Analysis**:
\`\`\`
SELECT client_addr, state, query, query_start
FROM pg_stat_activity WHERE state != 'idle';
\`\`\`

**Findings**:
- 87 connections stuck in "idle in transaction" state
- All from pod \`api-prod-7b8c9-xk2q\`
- Query pattern: SELECT from \`user_sessions\` table
- Connections started: 47 minutes ago

**Root Cause Identified**:
Commit \`a3f7c2d\` (deployed 2h ago) introduced a connection leak:
- Missing connection.release() in error handler
- Affects: \`src/middleware/session.ts:142\`

**Recommended Fix**:
1. Hot-patch: Restart affected pod to clear stuck connections
2. Deploy fix: PR #4521 with proper connection handling

@oncall-agent Recommend immediate pod restart while fix is prepared.`
  );

  console.log(`[${dbAgent.name}] Found root cause`);

  // Create investigation artifact
  const investigationLog = Artifact.fromLog(
    `[2024-01-15 14:32:15] Starting connection pool investigation
[2024-01-15 14:32:18] Querying pg_stat_activity
[2024-01-15 14:32:19] Found 87 idle-in-transaction connections
[2024-01-15 14:32:25] Tracing connections to pod api-prod-7b8c9-xk2q
[2024-01-15 14:33:01] Identified leak in session.ts:142
[2024-01-15 14:33:15] Root cause: Missing connection.release() in catch block
[2024-01-15 14:33:20] Investigation complete`,
    { title: 'INC-2024-0142 Investigation Log', createdBy: dbAgent.id }
  );
  workspace.artifacts.store(investigationLog);

  // 5. On-call commander coordinates response
  workspace.addReaction(dbInvestigation.id, 'thumbsup', oncallAgent.id);

  workspace.replyInThread(
    oncallAgent.id,
    triageResponse.id,
    `📢 **Incident Update - Taking Action**

**Status**: Mitigating

**Actions in progress**:
1. ✅ Root cause identified by @db-agent
2. 🔄 Restarting pod \`api-prod-7b8c9-xk2q\`
3. 🔄 Emergency PR #4522 opened with fix
4. ✅ Customer status page updated

**Timeline**:
- 14:27 - Alert triggered
- 14:32 - Incident declared
- 14:38 - Root cause identified
- 14:40 - Mitigation started (current)

**ETA to Resolution**: 10 minutes

@here Pod restart initiated, monitoring for recovery.`
  );

  console.log(`[${oncallAgent.name}] Coordinating mitigation`);

  // 6. Resolution
  setTimeout(() => {}, 100); // Simulate time passing

  workspace.replyInThread(
    oncallAgent.id,
    triageResponse.id,
    `✅ **INCIDENT RESOLVED: INC-2024-0142**

**Resolution Time**: 18 minutes
**Customer Impact Duration**: 23 minutes

**Resolution Actions**:
1. Pod restart cleared stuck connections
2. Connection pool recovered to 95/100 available
3. Error rate returned to normal (0.1%)
4. Emergency fix deployed (PR #4522)

**Post-Incident Actions**:
- [ ] Schedule post-mortem (within 48h)
- [ ] Add connection leak detection alert
- [ ] Review error handling patterns in codebase
- [ ] Update runbook with this scenario

**Lessons Learned**:
- Need better connection tracking in staging tests
- Consider connection timeout as safety net

React ✅ to confirm you've seen the resolution.`
  );

  workspace.addReaction(triageResponse.id, 'white_check_mark', oncallAgent.id);
  workspace.addReaction(triageResponse.id, 'tada', dbAgent.id);

  console.log(`[${oncallAgent.name}] Incident resolved!`);

  // ==================== Summary ====================
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Incident Summary\n');

  const thread = workspace.threads.getThread(triageResponse.id);
  if (thread) {
    console.log(`Incident thread participants: ${thread.participantIds.join(', ')}`);
    console.log(`Thread updates: ${thread.replyCount}`);
  }

  console.log(`\nArtifacts created: ${workspace.artifacts.listAll().length}`);
  for (const artifact of workspace.artifacts.listAll()) {
    console.log(`  - ${artifact}`);
  }

  console.log('\n✅ Incident response example completed!');
}

runIncidentExample().catch(console.error);
