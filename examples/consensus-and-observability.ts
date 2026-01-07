/**
 * Consensus & Observability Example
 *
 * Demonstrates the expanded primitives:
 * - Polls for agent consensus
 * - Decision traces for debugging
 * - Channel summaries for context
 * - Audit logs for governance
 */

import {
  AgentWorkspace,
  Poll,
  PollManager,
  VoteRequirement,
  DecisionTraceStore,
  DecisionType,
  SummaryManager,
  AuditLog,
  AuditEventType,
  AuditSeverity,
  createCorrelationId,
  generateChannelSummary,
} from '../src/index.js';

async function runExample() {
  console.log('🚀 Consensus & Observability Example\n');
  console.log('='.repeat(60) + '\n');

  // ==================== Setup ====================
  const workspace = new AgentWorkspace('acme-platform');
  
  // Create managers for new primitives
  const pollManager = new PollManager();
  const decisionTraces = new DecisionTraceStore();
  const summaryManager = new SummaryManager();
  const auditLog = new AuditLog(workspace.id, { retentionDays: 90 });

  // Create channel
  const deployments = workspace.createChannel('deployments', {
    purpose: 'Production deployment coordination',
  });

  // Register agents
  const leadAgent = workspace.registerAgent({
    id: 'lead-agent',
    name: 'lead-agent',
    capabilities: ['coordination', 'approval'],
  });

  const securityAgent = workspace.registerAgent({
    id: 'security-agent',
    name: 'security-agent',
    capabilities: ['security_review'],
  });

  const qaAgent = workspace.registerAgent({
    id: 'qa-agent',
    name: 'qa-agent',
    capabilities: ['testing', 'quality'],
  });

  const opsAgent = workspace.registerAgent({
    id: 'ops-agent',
    name: 'ops-agent',
    capabilities: ['deployment', 'monitoring'],
  });

  // Join channel
  [leadAgent, securityAgent, qaAgent, opsAgent].forEach((agent) => {
    workspace.joinChannel(agent.id, deployments.id);
    workspace.setPresence(agent.id, 'online');
  });

  console.log('✅ Workspace configured with 4 agents\n');
  console.log('-'.repeat(60));

  // ==================== 1. POLLS FOR CONSENSUS ====================
  console.log('\n📊 POLLS FOR CONSENSUS\n');

  // Create a deployment poll
  const deployPoll = pollManager.create({
    question: 'Should we deploy v2.5.0 to production?',
    options: ['Yes, deploy now', 'No, needs more testing', 'Defer to next week'],
    eligibleVoters: [securityAgent.id, qaAgent.id, opsAgent.id],
    requirement: VoteRequirement.MAJORITY,
    channelId: deployments.id,
  });

  console.log(`Created poll: "${deployPoll.question}"`);
  console.log(`Options: ${deployPoll.options.join(', ')}`);
  console.log(`Requirement: ${deployPoll.requirement}\n`);

  // Agents vote with reasoning
  deployPoll.vote(securityAgent.id, 'Yes, deploy now', {
    reasoning: 'Security scan passed, no vulnerabilities found',
    confidence: 0.9,
  });
  console.log(`[security-agent] Voted: "Yes, deploy now" (confidence: 0.9)`);

  deployPoll.vote(qaAgent.id, 'Yes, deploy now', {
    reasoning: 'All test suites passing, 98% coverage',
    confidence: 0.85,
  });
  console.log(`[qa-agent] Voted: "Yes, deploy now" (confidence: 0.85)`);

  deployPoll.vote(opsAgent.id, 'Yes, deploy now', {
    reasoning: 'Infrastructure ready, rollback plan in place',
    confidence: 0.95,
  });
  console.log(`[ops-agent] Voted: "Yes, deploy now" (confidence: 0.95)\n`);

  const result = deployPoll.getResult();
  console.log(`📋 Poll Result:`);
  console.log(`   Winner: ${result.winner}`);
  console.log(`   Votes: ${JSON.stringify(result.votes)}`);
  console.log(`   Decided: ${result.isDecided ? '✅ Yes' : '⏳ Pending'}`);

  // ==================== 2. DECISION TRACES ====================
  console.log('\n' + '-'.repeat(60));
  console.log('\n🔍 DECISION TRACES\n');

  // Create correlation for this deployment
  const deploymentCorrelationId = createCorrelationId();

  // Security agent logs their review decision
  const securityDecision = decisionTraces.log({
    agentId: securityAgent.id,
    decisionType: DecisionType.APPROVAL,
    decision: 'Approve deployment v2.5.0',
    reasoning: `Security review completed:
    - No critical vulnerabilities (CVE scan clean)
    - Dependencies up to date
    - Auth flows validated
    - Rate limiting in place`,
    confidence: 0.9,
    inputs: {
      cveResults: { critical: 0, high: 0, medium: 2, low: 5 },
      dependencyAudit: 'passed',
      authTestResults: 'passed',
    },
    channelId: deployments.id,
    tags: ['deployment', 'security', 'v2.5.0'],
  });

  console.log(`[security-agent] Decision logged:`);
  console.log(`   Type: ${securityDecision.decisionType}`);
  console.log(`   Confidence: ${securityDecision.confidence} (${securityDecision.confidenceLevel})`);

  // QA agent logs their decision (linked to security decision)
  const qaDecision = decisionTraces.log({
    agentId: qaAgent.id,
    decisionType: DecisionType.APPROVAL,
    decision: 'Approve deployment v2.5.0',
    reasoning: `QA validation completed:
    - Unit tests: 1,247 passed, 0 failed
    - Integration tests: 89 passed, 0 failed
    - E2E tests: 45 passed, 0 failed
    - Performance benchmarks: within 5% of baseline`,
    confidence: 0.92,
    inputs: {
      unitTests: { passed: 1247, failed: 0 },
      integrationTests: { passed: 89, failed: 0 },
      e2eTests: { passed: 45, failed: 0 },
      coverage: 98.2,
    },
    parentDecisionId: securityDecision.id,
    tags: ['deployment', 'qa', 'v2.5.0'],
  });

  console.log(`\n[qa-agent] Decision logged (child of security review):`);
  console.log(`   Type: ${qaDecision.decisionType}`);
  console.log(`   Confidence: ${qaDecision.confidence} (${qaDecision.confidenceLevel})`);

  // Get the decision chain
  const chain = decisionTraces.getChain(qaDecision.id);
  console.log(`\n📈 Decision Chain (${chain.length} decisions):`);
  for (const trace of chain) {
    console.log(`   ${trace.agentId}: ${trace.decision}`);
  }

  // ==================== 3. AUDIT LOG ====================
  console.log('\n' + '-'.repeat(60));
  console.log('\n📜 AUDIT LOG\n');

  // Log the deployment workflow events
  auditLog.log({
    eventType: AuditEventType.POLL_CREATED,
    actorId: leadAgent.id,
    actorType: 'agent',
    description: 'Created deployment approval poll',
    targetType: 'poll',
    targetId: deployPoll.id,
    channelId: deployments.id,
    correlationId: deploymentCorrelationId,
    data: { question: deployPoll.question },
  });

  auditLog.log({
    eventType: AuditEventType.POLL_VOTED,
    actorId: securityAgent.id,
    actorType: 'agent',
    description: 'Voted in deployment poll',
    targetType: 'poll',
    targetId: deployPoll.id,
    channelId: deployments.id,
    correlationId: deploymentCorrelationId,
    data: { vote: 'Yes, deploy now' },
  });

  auditLog.log({
    eventType: AuditEventType.POLL_DECIDED,
    actorId: 'system',
    actorType: 'system',
    description: 'Deployment poll reached majority decision',
    severity: AuditSeverity.INFO,
    targetType: 'poll',
    targetId: deployPoll.id,
    channelId: deployments.id,
    correlationId: deploymentCorrelationId,
    data: { winner: result.winner, votes: result.votes },
  });

  auditLog.log({
    eventType: AuditEventType.DECISION_MADE,
    actorId: securityAgent.id,
    actorType: 'agent',
    description: 'Security review decision for v2.5.0',
    targetType: 'decision',
    targetId: securityDecision.id,
    channelId: deployments.id,
    correlationId: deploymentCorrelationId,
    data: { confidence: 0.9 },
  });

  console.log(`Logged ${auditLog.size} audit entries\n`);

  // Query correlated events
  const correlatedEvents = auditLog.getCorrelatedEvents(deploymentCorrelationId);
  console.log(`🔗 Correlated Events for Deployment:`);
  for (const event of correlatedEvents) {
    console.log(`   [${event.timestamp.toISOString().slice(11, 19)}] ${event.eventType}`);
    console.log(`      Actor: ${event.actorId}, ${event.description}`);
  }

  // Get stats
  const stats = auditLog.getStats();
  console.log(`\n📊 Audit Stats:`);
  console.log(`   Total entries: ${stats.total}`);
  console.log(`   Error rate: ${(stats.errorRate * 100).toFixed(1)}%`);

  // ==================== 4. CHANNEL SUMMARY ====================
  console.log('\n' + '-'.repeat(60));
  console.log('\n📝 CHANNEL SUMMARY\n');

  // Post some messages for the summary
  workspace.postMessage(leadAgent.id, deployments.id, 
    'Starting deployment review for v2.5.0. @security-agent @qa-agent @ops-agent please review.');
  
  workspace.postMessage(securityAgent.id, deployments.id,
    'Security scan complete. No critical vulnerabilities found. Ready to approve.');
  
  workspace.postMessage(qaAgent.id, deployments.id,
    'All tests passing. 98% coverage. We decided to proceed with deployment.');
  
  workspace.postMessage(opsAgent.id, deployments.id,
    'Infrastructure ready. Rollback plan documented. Good to go.');
  
  workspace.postMessage(leadAgent.id, deployments.id,
    'Great work everyone! Proceeding with deployment. Thanks!');

  // Generate summary
  const messages = workspace.getMessages(deployments.id);
  const summary = generateChannelSummary(
    workspace.getChannel('deployments')!,
    messages,
    { generatedBy: 'system' }
  );

  console.log(`Summary for #${summary.channelName}:`);
  console.log(`   Period: ${summary.period.durationMinutes} minutes`);
  console.log(`   Messages: ${summary.messageCount}`);
  console.log(`   Participants: ${summary.participantCount}`);
  console.log(`   Key topics: ${summary.keyTopics.join(', ')}`);
  console.log(`   Decisions: ${summary.decisions.length}`);
  console.log(`   Sentiment: ${summary.sentiment}`);
  console.log(`\n📄 Text Summary:`);
  console.log(`   "${summary.textSummary}"`);

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Example Complete!\n');
  console.log('Demonstrated:');
  console.log('  🗳️  Polls - Agent consensus on deployment decision');
  console.log('  🔍 Decision Traces - Linked reasoning chains');
  console.log('  📜 Audit Logs - Correlated event tracking');
  console.log('  📝 Channel Summaries - Automatic context extraction');
}

runExample().catch(console.error);
