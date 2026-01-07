#!/usr/bin/env node
/**
 * Agent Slack with Real LLM-Powered Agents
 *
 * This example shows how to connect actual LLM-powered agents
 * to the Agent Slack workspace using Mastra.
 *
 * Prerequisites:
 *   export OPENAI_API_KEY=sk-...
 *   # or
 *   export ANTHROPIC_API_KEY=sk-...
 */

import { Agent, Mastra } from '@mastra/core';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  AgentWorkspace,
  createSlackTools,
  getSlackToolsArray,
} from '../src/index.js';

// Check for API keys
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

if (!hasOpenAI && !hasAnthropic) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔑 API Key Required                                         ║
║                                                               ║
║   This example requires an OpenAI or Anthropic API key.       ║
║                                                               ║
║   Set one of:                                                 ║
║     export OPENAI_API_KEY=sk-...                              ║
║     export ANTHROPIC_API_KEY=sk-...                           ║
║                                                               ║
║   Then run: npm run example:llm                               ║
║                                                               ║
║   For demo without API keys, run: npm run demo                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

const modelConfig = hasOpenAI
  ? { provider: 'OPEN_AI' as const, name: 'gpt-4o' }
  : { provider: 'ANTHROPIC' as const, name: 'claude-3-5-sonnet-20241022' };

console.log(`Using model: ${modelConfig.provider} / ${modelConfig.name}\n`);

async function main(): Promise<void> {
  // ==================== Setup ====================

  console.log('🚀 Setting up Agent Slack with LLM-powered agents...\n');

  // Create workspace
  const workspace = new AgentWorkspace('llm-demo', {
    description: 'Demonstration with real LLM agents',
  });

  // Create channels
  const general = workspace.createChannel('general', {
    purpose: 'General discussion',
  });

  const reviews = workspace.createChannel('code-reviews', {
    purpose: 'Code review discussions',
  });

  console.log('✅ Created workspace and channels\n');

  // Register workspace agents
  workspace.registerAgent({
    id: 'code-reviewer',
    name: 'code-reviewer',
    description: 'Reviews code for quality and best practices',
    capabilities: ['code_review', 'suggestions'],
  });

  workspace.registerAgent({
    id: 'security-analyst',
    name: 'security-analyst',
    description: 'Analyzes code for security issues',
    capabilities: ['security_review', 'vulnerability_detection'],
  });

  // Join channels
  workspace.joinChannel('code-reviewer', general.id);
  workspace.joinChannel('code-reviewer', reviews.id);
  workspace.joinChannel('security-analyst', general.id);
  workspace.joinChannel('security-analyst', reviews.id);

  // ==================== Create Mastra Agents ====================

  // Note: In Mastra, you'd typically configure agents like this
  // This is a simplified example showing the integration pattern

  const mastra = new Mastra({});

  // Create code reviewer agent with Slack tools
  const codeReviewerTools = getSlackToolsArray(workspace, 'code-reviewer');

  const codeReviewerAgent = new Agent({
    name: 'code-reviewer',
    instructions: `You are a code reviewer agent in a collaborative workspace.

Your responsibilities:
1. Review code for quality, maintainability, and best practices
2. Communicate findings through the Slack workspace
3. Use @mentions to notify other agents when needed
4. React to messages with semantic reactions (✅ for approval, ⚠️ for concerns)

Communication style:
- Be constructive and specific
- Provide code suggestions when relevant
- Explain the reasoning behind your feedback`,
    model: modelConfig,
    tools: Object.fromEntries(
      codeReviewerTools.map((tool, i) => [`tool_${i}`, tool])
    ) as Record<string, unknown>,
  });

  // Create security analyst agent
  const securityAnalystTools = getSlackToolsArray(workspace, 'security-analyst');

  const securityAnalystAgent = new Agent({
    name: 'security-analyst',
    instructions: `You are a security analyst agent in a collaborative workspace.

Your responsibilities:
1. Review code for security vulnerabilities (OWASP Top 10)
2. Check for authentication/authorization issues
3. Validate input handling and data protection
4. Communicate findings through the Slack workspace

Communication style:
- Prioritize findings by severity (critical, high, medium, low)
- Provide remediation suggestions
- Use 🚨 reactions for critical issues`,
    model: modelConfig,
    tools: Object.fromEntries(
      securityAnalystTools.map((tool, i) => [`tool_${i}`, tool])
    ) as Record<string, unknown>,
  });

  console.log('✅ Created LLM-powered agents\n');

  // ==================== Scenario ====================

  console.log('📝 Starting code review scenario...\n');

  // Post a code review request (simulating human)
  workspace.registerAgent({
    id: 'developer',
    name: 'developer',
    description: 'Human developer',
    capabilities: [],
  });
  workspace.joinChannel('developer', reviews.id);

  const prMessage = workspace.postMessage(
    'developer',
    reviews.id,
    `Hey team! I have a new PR ready for review.

**PR #1234: Add user authentication**

\`\`\`typescript
async function authenticateUser(username: string, password: string) {
  const user = await db.query("SELECT * FROM users WHERE username = '" + username + "'");
  if (user && user.password === password) {
    const token = jwt.sign({ userId: user.id }, "secret-key-123");
    return { token, user };
  }
  throw new Error("Invalid credentials");
}
\`\`\`

@code-reviewer @security-analyst - please review this authentication code.`
  );

  console.log(`📨 Posted PR review request to #code-reviews\n`);

  // Let the agents respond
  console.log('🤔 Waiting for agent responses...\n');

  try {
    // Trigger code reviewer
    const codeReviewerResponse = await codeReviewerAgent.generate(
      `You were mentioned in #code-reviews. A developer has posted a code review request for an authentication function.
      
Please:
1. Review the code for quality and best practices
2. Post your findings as a reply in the thread
3. Use appropriate reactions

The message content is:
${prMessage.content}`,
      { maxTokens: 1000 }
    );

    console.log('📝 Code Reviewer responded:\n');
    console.log(codeReviewerResponse.text?.slice(0, 500) || 'No response');
    console.log('\n');

    // Trigger security analyst
    const securityResponse = await securityAnalystAgent.generate(
      `You were mentioned in #code-reviews. A developer has posted code for security review.
      
Please:
1. Review the code for security vulnerabilities
2. Focus on SQL injection, authentication issues, and secrets
3. Post your findings as a reply in the thread
4. React with 🚨 if there are critical issues

The message content is:
${prMessage.content}`,
      { maxTokens: 1000 }
    );

    console.log('🔒 Security Analyst responded:\n');
    console.log(securityResponse.text?.slice(0, 500) || 'No response');
    console.log('\n');

  } catch (error) {
    console.error('Error during agent responses:', error);
  }

  // ==================== Summary ====================

  console.log('═'.repeat(60));
  console.log('\n📊 Session Summary\n');

  const messages = workspace.getMessages(reviews.id);
  console.log(`Messages in #code-reviews: ${messages.length}`);

  const thread = workspace.threads.getThread(prMessage.id);
  if (thread) {
    console.log(`Thread replies: ${thread.replyCount}`);
    console.log(`Participants: ${[...thread.participants].join(', ')}`);
  }

  const reactions = workspace.reactions.getReactions(prMessage.id);
  console.log(`Reactions on PR: ${reactions.toString() || 'None'}`);

  console.log('\n✅ LLM agent demo complete!\n');
}

main().catch(console.error);
