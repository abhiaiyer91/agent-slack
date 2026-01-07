/**
 * Code Review Example
 *
 * This example demonstrates how multiple agents can collaborate on a code review
 * using Agent Slack primitives. It shows:
 * - Agent registration and channel creation
 * - Posting messages and using threads
 * - @mentions to request specific agents
 * - Semantic reactions for acknowledgment
 * - Handoffs between agents
 */

import { 
  AgentWorkspace,
  Message,
  Artifact,
  SemanticReactions,
} from '../src/index.js';

async function runCodeReviewExample() {
  console.log('🚀 Starting Code Review Example\n');
  console.log('='.repeat(60) + '\n');

  // ==================== Setup Workspace ====================
  console.log('📦 Setting up workspace...\n');

  const workspace = new AgentWorkspace('acme-engineering', {
    description: 'ACME Corp Engineering Workspace',
  });

  // Create specialized channels
  const codeReviews = workspace.createChannel('code-reviews', {
    purpose: 'PR discussions and code review requests',
  });

  const securityAlerts = workspace.createChannel('security-alerts', {
    purpose: 'Security findings and vulnerability reports',
  });

  console.log(`✅ Created workspace: ${workspace}`);
  console.log(`✅ Created channel: ${codeReviews}`);
  console.log(`✅ Created channel: ${securityAlerts}`);
  console.log();

  // ==================== Register Agents ====================
  console.log('🤖 Registering agents...\n');

  const codeAgent = workspace.registerAgent({
    id: 'code-agent',
    name: 'code-agent',
    description: 'Reviews code for quality, best practices, and maintainability',
    avatarEmoji: '👨‍💻',
    capabilities: ['code_review', 'refactoring', 'testing'],
  });

  const securityAgent = workspace.registerAgent({
    id: 'security-agent',
    name: 'security-agent',
    description: 'Scans code for security vulnerabilities and compliance issues',
    avatarEmoji: '🔒',
    capabilities: ['security_scan', 'vulnerability_detection', 'compliance_check'],
  });

  const docsAgent = workspace.registerAgent({
    id: 'docs-agent',
    name: 'docs-agent',
    description: 'Reviews and improves documentation',
    avatarEmoji: '📚',
    capabilities: ['documentation', 'api_docs', 'readme'],
  });

  console.log(`✅ Registered: ${codeAgent.name} (${codeAgent.capabilities.join(', ')})`);
  console.log(`✅ Registered: ${securityAgent.name} (${securityAgent.capabilities.join(', ')})`);
  console.log(`✅ Registered: ${docsAgent.name} (${docsAgent.capabilities.join(', ')})`);
  console.log();

  // Set agents as online
  workspace.setPresence(codeAgent.id, 'online', 'Ready to review code');
  workspace.setPresence(securityAgent.id, 'online', 'Monitoring for security issues');
  workspace.setPresence(docsAgent.id, 'online', 'Available for docs review');

  // All agents join the code-reviews channel
  workspace.joinChannel(codeAgent.id, codeReviews.id);
  workspace.joinChannel(securityAgent.id, codeReviews.id);
  workspace.joinChannel(docsAgent.id, codeReviews.id);

  // ==================== Simulate Code Review Flow ====================
  console.log('📝 Starting code review flow...\n');
  console.log('-'.repeat(60) + '\n');

  // 1. Code agent posts a PR for review
  const prMessage = workspace.postMessage(
    codeAgent.id,
    codeReviews.id,
    `📋 **New PR Ready for Review**

**PR #1234**: Add user authentication system

**Changes**: +342 lines / -28 lines

**Key changes**:
- JWT token implementation with refresh tokens
- Password hashing with bcrypt (cost factor 12)
- Session management with Redis
- Rate limiting on auth endpoints

**Files changed**:
- \`src/auth/jwt.ts\` - JWT token handling
- \`src/auth/password.ts\` - Password hashing
- \`src/middleware/auth.ts\` - Auth middleware
- \`src/routes/auth.ts\` - Auth routes

@security-agent please review the authentication implementation for security concerns.
@docs-agent we'll need API documentation updates.

React with 👀 to acknowledge.`
  );

  console.log(`[${codeAgent.name}] Posted PR review request`);
  console.log(`   Message ID: ${prMessage.id}`);
  console.log();

  // 2. Security agent acknowledges and starts review
  workspace.addReaction(prMessage.id, 'eyes', securityAgent.id);
  console.log(`[${securityAgent.name}] Reacted with 👀 (looking at it)`);

  // Security agent sets themselves as busy
  workspace.setPresence(securityAgent.id, 'busy', 'Reviewing PR #1234');

  // 3. Security agent replies in thread with findings
  const securityReply = workspace.replyInThread(
    securityAgent.id,
    prMessage.id,
    `🔒 **Security Review Started**

Reviewing authentication implementation...

**Initial Findings**:

✅ **Good practices observed**:
- bcrypt cost factor 12 is appropriate
- JWT tokens have reasonable expiration (15min access, 7d refresh)
- Passwords are properly salted

⚠️ **Recommendations**:
- Consider adding \`secure\` and \`httpOnly\` flags to cookies
- JWT secret should use \`crypto.randomBytes(64)\` not a string literal
- Add CSRF protection for session endpoints

🚨 **Critical Issues**:
1. **Line 45 in jwt.ts**: JWT secret is hardcoded - must use environment variable
2. **Line 78 in auth.ts**: Missing rate limiting on /refresh endpoint
3. **Line 112 in password.ts**: Password validation allows < 8 characters

I'll create a detailed security report as an artifact.`
  );

  console.log(`[${securityAgent.name}] Posted security findings in thread`);

  // 4. Create and attach a security report artifact
  const securityReport = Artifact.fromReport(
    'Security Review: PR #1234',
    {
      'Executive Summary': 'The authentication implementation follows many best practices but has 3 critical issues that must be addressed before merging.',
      'Critical Issues': `
1. **Hardcoded JWT Secret** (jwt.ts:45)
   - Risk: HIGH
   - Impact: Token forgery possible
   - Fix: Use \`process.env.JWT_SECRET\`

2. **Missing Rate Limit** (auth.ts:78)
   - Risk: HIGH  
   - Impact: Token refresh abuse
   - Fix: Apply rate limiter middleware

3. **Weak Password Policy** (password.ts:112)
   - Risk: MEDIUM
   - Impact: Brute-force vulnerability
   - Fix: Enforce 12+ characters, complexity rules`,
      'Recommendations': 'After addressing critical issues, this PR is ready to merge. Consider adding 2FA support in a follow-up PR.',
    },
    { createdBy: securityAgent.id }
  );

  workspace.artifacts.store(securityReport);
  console.log(`[${securityAgent.name}] Created artifact: ${securityReport}`);

  // 5. Security agent marks with warning reaction
  workspace.addReaction(prMessage.id, 'warning', securityAgent.id);
  console.log(`[${securityAgent.name}] Reacted with ⚠️ (needs attention)`);
  console.log();

  // 6. Docs agent acknowledges
  workspace.addReaction(prMessage.id, 'eyes', docsAgent.id);
  console.log(`[${docsAgent.name}] Reacted with 👀 (looking at it)`);

  // Docs agent responds
  workspace.replyInThread(
    docsAgent.id,
    prMessage.id,
    `📚 **Documentation Review**

I'll prepare the API documentation for the new auth endpoints:
- \`POST /auth/login\`
- \`POST /auth/register\`
- \`POST /auth/refresh\`
- \`POST /auth/logout\`

@code-agent I'll need the final OpenAPI spec once security issues are addressed.`
  );
  console.log(`[${docsAgent.name}] Posted docs review response`);
  console.log();

  // 7. Code agent acknowledges the feedback
  workspace.addReaction(securityReply.id, 'thumbsup', codeAgent.id);
  console.log(`[${codeAgent.name}] Reacted to security findings with 👍`);

  const codeAgentResponse = workspace.replyInThread(
    codeAgent.id,
    prMessage.id,
    `Thanks @security-agent for the thorough review! 

I'll address the critical issues now:
- ✅ Moving JWT secret to environment variable
- ✅ Adding rate limiting to /refresh
- ✅ Updating password policy to 12+ chars

Will push a fix commit shortly.`
  );
  console.log(`[${codeAgent.name}] Acknowledged and committed to fixes`);

  // 8. After fixes, security agent approves
  workspace.addReaction(prMessage.id, 'white_check_mark', securityAgent.id);
  console.log(`[${securityAgent.name}] Reacted with ✅ (approved)`);

  workspace.replyInThread(
    securityAgent.id,
    prMessage.id,
    `✅ **Security Review Complete**

All critical issues have been addressed. PR is approved from a security perspective.

Final checklist:
- [x] JWT secret from environment
- [x] Rate limiting on all auth endpoints
- [x] Strong password policy enforced
- [x] Security headers configured

LGTM! 🚀`
  );
  console.log(`[${securityAgent.name}] Approved the PR`);

  // ==================== Summary ====================
  console.log();
  console.log('='.repeat(60));
  console.log('\n📊 Code Review Summary\n');

  // Get the thread
  const thread = workspace.threads.getThread(prMessage.id);
  if (thread) {
    console.log(`Thread participants: ${thread.participantIds.join(', ')}`);
    console.log(`Total replies: ${thread.replyCount}`);
  }

  // Get reactions on the main message
  const reactions = workspace.reactions.getReactions(prMessage.id);
  console.log(`Reactions on PR message: ${reactions.toString()}`);

  // List all messages in channel
  const allMessages = workspace.getMessages(codeReviews.id);
  console.log(`Total messages in #code-reviews: ${allMessages.length}`);

  // Show presence status
  console.log('\nAgent Status:');
  for (const agent of workspace.listAgents()) {
    const presence = workspace.presence.get(agent.id);
    console.log(`  ${presence}`);
  }

  console.log('\n✅ Code review example completed!');
}

// Run the example
runCodeReviewExample().catch(console.error);
