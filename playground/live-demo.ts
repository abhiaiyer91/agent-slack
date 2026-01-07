#!/usr/bin/env node
/**
 * Live Agent Demo
 *
 * Demonstrates agents collaborating on a real task.
 * Can run with simulated responses or real LLM (if API key provided).
 */

import {
  AgentWorkspace,
  PollManager,
  VoteRequirement,
  DecisionTraceStore,
  DecisionType,
  AuditLog,
  AuditEventType,
  createCorrelationId,
} from '../src/index.js';

// Colors for terminal output
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(agent: string, message: string, color = c.reset): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  const emoji = getAgentEmoji(agent);
  console.log(`${c.dim}${time}${c.reset} ${emoji} ${color}${c.bold}${agent}${c.reset}: ${message}`);
}

function getAgentEmoji(agent: string): string {
  const emojis: Record<string, string> = {
    'project-lead': '👔',
    'code-reviewer': '👨‍💻',
    'security-analyst': '🔒',
    'qa-engineer': '🧪',
    'devops': '🔧',
    'system': '🤖',
  };
  return emojis[agent] ?? '🤖';
}

function section(title: string): void {
  console.log(`\n${c.cyan}${'─'.repeat(60)}${c.reset}`);
  console.log(`${c.cyan}${c.bold}  ${title}${c.reset}`);
  console.log(`${c.cyan}${'─'.repeat(60)}${c.reset}\n`);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulates an agent "thinking" and responding.
 */
async function agentThinks(
  agent: string,
  task: string,
  thinkingTime: number = 1000
): Promise<string> {
  process.stdout.write(`${c.dim}   ${agent} is thinking...${c.reset}`);
  
  await sleep(thinkingTime);
  
  // Clear the "thinking" line
  process.stdout.write('\r' + ' '.repeat(50) + '\r');
  
  return task;
}

async function runDemo(): Promise<void> {
  console.clear();
  console.log(`
${c.cyan}╔═══════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ${c.bold}🚀 Agent Slack: Live Collaboration Demo${c.reset}${c.cyan}                       ║
║                                                                   ║
║   Watch AI agents collaborate on a deployment decision            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝${c.reset}
`);

  await sleep(1500);

  // ==================== Setup ====================
  section('1️⃣  Setting Up Workspace');

  const workspace = new AgentWorkspace('acme-platform');
  const pollManager = new PollManager();
  const decisions = new DecisionTraceStore();
  const auditLog = new AuditLog(workspace.id);

  console.log(`${c.green}✓${c.reset} Created workspace: ${c.bold}acme-platform${c.reset}`);
  await sleep(300);

  // Create deployment channel
  const deployChannel = workspace.createChannel('deployments', {
    purpose: 'Production deployment coordination',
  });
  console.log(`${c.green}✓${c.reset} Created channel: ${c.bold}#deployments${c.reset}`);
  await sleep(300);

  // Register agents
  const agents = [
    { id: 'project-lead', name: 'project-lead', desc: 'Coordinates team decisions' },
    { id: 'code-reviewer', name: 'code-reviewer', desc: 'Reviews code quality' },
    { id: 'security-analyst', name: 'security-analyst', desc: 'Analyzes security' },
    { id: 'qa-engineer', name: 'qa-engineer', desc: 'Ensures quality' },
    { id: 'devops', name: 'devops', desc: 'Handles deployment' },
  ];

  for (const agent of agents) {
    workspace.registerAgent({
      id: agent.id,
      name: agent.name,
      description: agent.desc,
      capabilities: [agent.desc.toLowerCase()],
    });
    workspace.joinChannel(agent.id, deployChannel.id);
    workspace.setPresence(agent.id, 'online');
    console.log(`${c.green}✓${c.reset} Agent online: ${getAgentEmoji(agent.id)} ${c.bold}${agent.name}${c.reset}`);
    await sleep(200);
  }

  await sleep(1000);

  // ==================== Deployment Request ====================
  section('2️⃣  Deployment Request');

  const correlationId = createCorrelationId();

  log('project-lead', 'Team, we need to decide on deploying v3.0.0 to production today.', c.cyan);
  await sleep(1500);

  workspace.postMessage('project-lead', deployChannel.id, 
    'Key changes in v3.0.0:\n• New authentication system\n• Performance improvements\n• Bug fixes for payment flow'
  );
  log('project-lead', 'Key changes: auth system, perf improvements, payment bug fixes', c.cyan);
  await sleep(1000);

  log('project-lead', '@code-reviewer @security-analyst @qa-engineer - please review and provide your assessments.', c.cyan);
  await sleep(1500);

  // ==================== Agent Reviews ====================
  section('3️⃣  Agent Reviews');

  // Code Reviewer
  await agentThinks('code-reviewer', 'Analyzing code quality...', 1200);
  
  const codeReviewMsg = workspace.postMessage('code-reviewer', deployChannel.id,
    '✅ Code Review Complete:\n• Clean code structure\n• 94% test coverage\n• All CI checks passing\n• Minor: 2 TODO comments to address'
  );
  log('code-reviewer', '✅ Code review passed - clean structure, 94% coverage', c.blue);
  
  workspace.addReaction(codeReviewMsg.id, 'white_check_mark', 'code-reviewer');
  
  decisions.log({
    agentId: 'code-reviewer',
    decisionType: DecisionType.APPROVAL,
    decision: 'Approve v3.0.0 code quality',
    reasoning: 'Code structure is clean, test coverage at 94%, all CI checks passing.',
    confidence: 0.92,
    inputs: { coverage: 94, ciStatus: 'passing', todoCount: 2 },
    channelId: deployChannel.id,
    tags: ['deployment', 'v3.0.0'],
  });

  await sleep(1500);

  // Security Analyst
  await agentThinks('security-analyst', 'Running security scan...', 1500);
  
  const securityMsg = workspace.postMessage('security-analyst', deployChannel.id,
    '🔒 Security Review Complete:\n• No critical vulnerabilities\n• Auth implementation follows OWASP guidelines\n• Dependencies up to date\n• ⚠️ Recommendation: Add rate limiting to new endpoints'
  );
  log('security-analyst', '🔒 Security review passed - no critical issues, auth follows OWASP', c.red);
  
  workspace.addReaction(securityMsg.id, 'white_check_mark', 'security-analyst');
  workspace.addReaction(securityMsg.id, 'warning', 'security-analyst'); // For the recommendation
  
  decisions.log({
    agentId: 'security-analyst',
    decisionType: DecisionType.APPROVAL,
    decision: 'Approve v3.0.0 security',
    reasoning: 'No critical vulnerabilities. Auth follows OWASP. Recommend rate limiting as enhancement.',
    confidence: 0.88,
    inputs: { criticalVulns: 0, owaspCompliant: true, recommendation: 'rate_limiting' },
    channelId: deployChannel.id,
    tags: ['deployment', 'v3.0.0', 'security'],
  });

  await sleep(1500);

  // QA Engineer
  await agentThinks('qa-engineer', 'Validating test results...', 1300);
  
  const qaMsg = workspace.postMessage('qa-engineer', deployChannel.id,
    '🧪 QA Validation Complete:\n• Unit tests: 847/847 passing\n• Integration tests: 156/156 passing\n• E2E tests: 89/89 passing\n• Performance: Response times within SLA'
  );
  log('qa-engineer', '🧪 All tests passing - 847 unit, 156 integration, 89 e2e', c.green);
  
  workspace.addReaction(qaMsg.id, 'white_check_mark', 'qa-engineer');
  
  decisions.log({
    agentId: 'qa-engineer',
    decisionType: DecisionType.APPROVAL,
    decision: 'Approve v3.0.0 quality',
    reasoning: 'All test suites passing. Performance within SLA.',
    confidence: 0.95,
    inputs: { unitTests: 847, integrationTests: 156, e2eTests: 89, perfStatus: 'ok' },
    channelId: deployChannel.id,
    tags: ['deployment', 'v3.0.0', 'qa'],
  });

  await sleep(1500);

  // ==================== Voting ====================
  section('4️⃣  Deployment Vote');

  log('project-lead', 'Creating deployment approval poll...', c.cyan);
  await sleep(800);

  const poll = pollManager.create({
    question: 'Approve deployment of v3.0.0 to production?',
    options: ['✅ Approve', '❌ Reject', '⏸️ Defer'],
    eligibleVoters: ['code-reviewer', 'security-analyst', 'qa-engineer', 'devops'],
    requirement: VoteRequirement.MAJORITY,
    channelId: deployChannel.id,
  });

  console.log(`\n${c.yellow}📊 Poll: "${poll.question}"${c.reset}`);
  console.log(`${c.dim}   Options: ${poll.options.join(' | ')}${c.reset}`);
  console.log(`${c.dim}   Voters: ${poll.eligibleVoters?.join(', ')}${c.reset}\n`);

  await sleep(1000);

  // Agents vote
  const votes = [
    { agent: 'code-reviewer', vote: '✅ Approve', reasoning: 'Code quality is excellent' },
    { agent: 'security-analyst', vote: '✅ Approve', reasoning: 'Security posture is strong' },
    { agent: 'qa-engineer', vote: '✅ Approve', reasoning: 'All quality gates passed' },
    { agent: 'devops', vote: '✅ Approve', reasoning: 'Infrastructure is ready' },
  ];

  for (const v of votes) {
    await sleep(800);
    poll.vote(v.agent, v.vote, { reasoning: v.reasoning, confidence: 0.9 });
    console.log(`   ${getAgentEmoji(v.agent)} ${c.bold}${v.agent}${c.reset} voted: ${c.green}${v.vote}${c.reset}`);
    
    auditLog.log({
      eventType: AuditEventType.POLL_VOTED,
      actorId: v.agent,
      actorType: 'agent',
      description: `Voted "${v.vote}" on deployment poll`,
      correlationId,
    });
  }

  await sleep(1000);

  const result = poll.getResult();
  console.log(`\n${c.green}${c.bold}📋 Poll Result: ${result.winner}${c.reset}`);
  console.log(`${c.dim}   Votes: ${JSON.stringify(result.votes)}${c.reset}`);

  // ==================== Deployment ====================
  section('5️⃣  Deployment Execution');

  log('project-lead', `Deployment approved! @devops please proceed with deployment.`, c.cyan);
  await sleep(1000);

  log('devops', 'Starting deployment pipeline...', c.yellow);
  await sleep(800);

  const steps = [
    'Running pre-deployment checks...',
    'Creating database backup...',
    'Deploying to staging...',
    'Running smoke tests...',
    'Promoting to production...',
    'Verifying health checks...',
  ];

  for (const step of steps) {
    await sleep(600);
    console.log(`   ${c.dim}⏳ ${step}${c.reset}`);
  }

  await sleep(800);
  console.log(`   ${c.green}✅ Deployment complete!${c.reset}`);

  workspace.postMessage('devops', deployChannel.id,
    '🚀 v3.0.0 successfully deployed to production!\n\n• All health checks passing\n• No errors in logs\n• Rollback plan ready if needed'
  );
  log('devops', '🚀 v3.0.0 successfully deployed to production!', c.yellow);

  await sleep(1000);

  // ==================== Summary ====================
  section('6️⃣  Collaboration Summary');

  // Decision chain
  console.log(`${c.bold}Decision Chain:${c.reset}`);
  const allDecisions = decisions.search({ limit: 10 });
  for (const d of allDecisions) {
    console.log(`   ${getAgentEmoji(d.agentId)} ${d.agentId}: ${d.decision} (${(d.confidence * 100).toFixed(0)}% confidence)`);
  }

  console.log();

  // Audit trail
  console.log(`${c.bold}Audit Trail:${c.reset}`);
  const auditEntries = auditLog.query({ limit: 5 });
  for (const entry of auditEntries) {
    console.log(`   📜 ${entry.actorId}: ${entry.description}`);
  }

  console.log();

  // Stats
  const stats = auditLog.getStats();
  console.log(`${c.bold}Statistics:${c.reset}`);
  console.log(`   Total events: ${stats.total}`);
  console.log(`   Decisions made: ${allDecisions.length}`);
  console.log(`   Poll participation: ${poll.voterCount}/${poll.eligibleVoters?.length ?? 0} agents`);

  console.log(`\n${c.green}${c.bold}✅ Demo Complete!${c.reset}\n`);
  console.log(`${c.dim}This demo showed agents collaborating on a deployment decision through:`);
  console.log(`• Structured reviews and recommendations`);
  console.log(`• Democratic voting with reasoning`);
  console.log(`• Decision tracing for accountability`);
  console.log(`• Audit logging for compliance${c.reset}\n`);
}

runDemo().catch(console.error);
