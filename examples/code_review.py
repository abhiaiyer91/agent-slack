"""
Code Review Scenario

Demonstrates how agents collaborate on code review using Slack-like primitives.

Agents involved:
- Code Agent: Submits code for review
- Security Agent: Reviews for vulnerabilities  
- Quality Agent: Reviews for code quality
- Lead Agent: Final approval

Flow:
1. Code Agent posts PR summary to #code-reviews
2. Security Agent and Quality Agent are mentioned for review
3. Each reviews in a thread, posting findings
4. Agents react to acknowledge/approve
5. Lead Agent gives final approval
"""

import asyncio
from datetime import datetime

# Add parent directory to path for imports
import sys
sys.path.insert(0, '/workspace')

from agent_slack import (
    Workspace,
    Agent,
    Channel,
    Message,
    MessageType,
    Artifact,
    ArtifactType,
    Reaction,
    SEMANTIC_REACTIONS,
)
from agent_slack.primitives.thread import ThreadManager
from agent_slack.primitives.reaction import ReactionManager
from agent_slack.primitives.mention import parse_mentions
from agent_slack.coordination.task import TaskManager, TaskPriority


def create_agents():
    """Create the agents involved in code review."""
    
    code_agent = Agent(
        name="code-agent",
        description="Writes and submits code for review",
        avatar_emoji="💻",
    )
    code_agent.add_capability("write_code", "Write and modify source code")
    code_agent.add_capability("submit_pr", "Submit pull requests")
    
    security_agent = Agent(
        name="security-agent", 
        description="Reviews code for security vulnerabilities",
        avatar_emoji="🔒",
    )
    security_agent.add_capability("security_scan", "Scan code for vulnerabilities")
    security_agent.add_capability("audit", "Perform security audits")
    
    quality_agent = Agent(
        name="quality-agent",
        description="Reviews code for quality and best practices",
        avatar_emoji="✨",
    )
    quality_agent.add_capability("code_review", "Review code for quality")
    quality_agent.add_capability("suggest_improvements", "Suggest code improvements")
    
    lead_agent = Agent(
        name="lead-agent",
        description="Team lead who gives final approval",
        avatar_emoji="👔",
    )
    lead_agent.add_capability("approve", "Give final approval")
    lead_agent.add_capability("merge", "Merge approved changes")
    
    return code_agent, security_agent, quality_agent, lead_agent


def run_code_review_scenario():
    """Execute the code review scenario."""
    
    print("\n" + "="*60)
    print("🔄 CODE REVIEW SCENARIO")
    print("="*60 + "\n")
    
    # Create workspace and register agents
    workspace = Workspace(name="acme-engineering")
    code_agent, security_agent, quality_agent, lead_agent = create_agents()
    
    workspace.register(code_agent, security_agent, quality_agent, lead_agent)
    
    # Set agents online
    for agent in [code_agent, security_agent, quality_agent, lead_agent]:
        agent.go_online()
    
    print(f"📦 Created workspace: {workspace}")
    print(f"👥 Registered agents:")
    for agent in workspace.list_agents():
        print(f"   {agent}")
    
    # Create #code-reviews channel
    reviews_channel = workspace.create_channel(
        "code-reviews",
        purpose="Pull request discussions and code reviews"
    )
    
    # All agents join the channel
    for agent in [code_agent, security_agent, quality_agent, lead_agent]:
        workspace.join_channel(agent.id, reviews_channel.id)
    
    print(f"\n📢 Created channel: {reviews_channel}")
    
    # Initialize managers
    thread_manager = ThreadManager()
    reaction_manager = ReactionManager()
    task_manager = TaskManager()
    
    # ============ Step 1: Code Agent submits PR ============
    print("\n" + "-"*40)
    print("STEP 1: Code Agent submits PR for review")
    print("-"*40)
    
    pr_content = """📋 **New PR Ready for Review**

**PR #1234**: Add user authentication system

**Changes**: +342 / -28 lines

**Summary**:
Implements JWT-based authentication with the following features:
- User login/logout endpoints
- Password hashing with bcrypt
- Session management with Redis
- Rate limiting on auth endpoints

**Files Changed**:
- `src/auth/jwt.py` - JWT token handling
- `src/auth/password.py` - Password hashing
- `src/auth/session.py` - Session management
- `src/api/auth_routes.py` - API endpoints

@security-agent please review the auth implementation for vulnerabilities
@quality-agent please review for code quality and best practices

cc: @lead-agent for awareness
"""
    
    pr_message = workspace.post_message(
        sender_id=code_agent.id,
        channel_id=reviews_channel.id,
        content=pr_content,
        message_type=MessageType.REQUEST,
    )
    
    print(f"\n{code_agent.avatar_emoji} {code_agent.name} posted:")
    print(f"   {pr_content[:100]}...")
    
    # Parse mentions
    def resolve_agent(name):
        agent = workspace.get_agent_by_name(name)
        return agent.id if agent else None
    
    mentions = parse_mentions(pr_content, resolve_agent=resolve_agent)
    print(f"\n📣 Mentions found: {[str(m) for m in mentions]}")
    
    # ============ Step 2: Agents acknowledge ============
    print("\n" + "-"*40)
    print("STEP 2: Agents acknowledge the review request")
    print("-"*40)
    
    # Security agent reacts with eyes (looking at it)
    reaction_manager.add_reaction(pr_message.id, "eyes", security_agent.id)
    print(f"   {security_agent.avatar_emoji} {security_agent.name} reacted with 👀")
    
    # Quality agent reacts with eyes
    reaction_manager.add_reaction(pr_message.id, "eyes", quality_agent.id)
    print(f"   {quality_agent.avatar_emoji} {quality_agent.name} reacted with 👀")
    
    # ============ Step 3: Security Agent reviews in thread ============
    print("\n" + "-"*40)
    print("STEP 3: Security Agent reviews in thread")
    print("-"*40)
    
    # Create thread from PR message
    thread = thread_manager.get_or_create_thread(pr_message)
    
    security_review = """🔒 **Security Review Complete**

**Overall**: ⚠️ Some issues found

**Findings**:

1. ✅ **Password Hashing** - Good
   - bcrypt with cost factor 12 is appropriate
   - Salt is properly generated
   
2. ⚠️ **JWT Configuration** - Medium Risk
   - Secret is hardcoded in config file
   - Recommend: Move to environment variable
   
3. 🚨 **Rate Limiting** - High Risk
   - No rate limiting on `/login` endpoint
   - Vulnerable to brute force attacks
   - Recommend: Add 5 attempts per minute limit
   
4. ⚠️ **Session Management** - Medium Risk
   - No session invalidation on password change
   - Recommend: Invalidate all sessions when password changes

**Blocking**: Issue #3 must be fixed before merge.

See attached report for details.
"""
    
    # Create security report artifact
    security_report = Artifact.from_report(
        title="Security Review - PR #1234",
        sections={
            "Summary": "Found 1 high-risk and 2 medium-risk issues",
            "High Risk": "Missing rate limiting on login endpoint",
            "Medium Risk": "Hardcoded JWT secret, no session invalidation",
            "Recommendations": "1. Add rate limiting\n2. Use env vars\n3. Invalidate sessions on password change",
        },
        created_by=security_agent.id,
    )
    
    security_reply = Message(
        sender_id=security_agent.id,
        content=security_review,
        message_type=MessageType.RESPONSE,
        artifact_ids=[security_report.id],
    )
    thread.add_reply(security_reply)
    
    print(f"\n{security_agent.avatar_emoji} {security_agent.name} replied in thread:")
    print(f"   {security_review[:150]}...")
    print(f"   📎 Attached: {security_report.title}")
    
    # Security agent reacts with warning (issues found)
    reaction_manager.add_reaction(pr_message.id, "warning", security_agent.id)
    
    # ============ Step 4: Quality Agent reviews in thread ============
    print("\n" + "-"*40)
    print("STEP 4: Quality Agent reviews in thread")  
    print("-"*40)
    
    quality_review = """✨ **Code Quality Review Complete**

**Overall**: 👍 Good with minor suggestions

**Findings**:

1. ✅ **Code Structure** - Good
   - Clean separation of concerns
   - Well-organized modules
   
2. ✅ **Naming** - Good
   - Clear function and variable names
   - Consistent naming conventions
   
3. 💡 **Suggestion**: Add docstrings
   - `generate_token()` needs parameter documentation
   - `validate_password()` needs return value docs
   
4. 💡 **Suggestion**: Error handling
   - Consider custom exception classes for auth errors
   - Would improve error messages for API consumers

**Not blocking**: All suggestions are nice-to-have.
"""
    
    quality_reply = Message(
        sender_id=quality_agent.id,
        content=quality_review,
        message_type=MessageType.RESPONSE,
    )
    thread.add_reply(quality_reply)
    
    print(f"\n{quality_agent.avatar_emoji} {quality_agent.name} replied in thread:")
    print(f"   {quality_review[:150]}...")
    
    # Quality agent reacts with thumbsup (approved with suggestions)
    reaction_manager.add_reaction(pr_message.id, "thumbsup", quality_agent.id)
    
    # ============ Step 5: Code Agent addresses feedback ============
    print("\n" + "-"*40)
    print("STEP 5: Code Agent addresses security findings")
    print("-"*40)
    
    fix_response = """Thanks for the reviews! 🙏

Addressing the security findings:

1. ✅ **Rate Limiting** - Fixed
   - Added `slowapi` rate limiter
   - 5 attempts per minute on `/login`
   - See commit `a1b2c3d`
   
2. ✅ **JWT Secret** - Fixed
   - Moved to `JWT_SECRET` environment variable
   - Updated deployment docs
   
3. ✅ **Session Invalidation** - Fixed
   - Added `invalidate_user_sessions()` 
   - Called on password change

@security-agent ready for re-review 🔄
"""
    
    fix_reply = Message(
        sender_id=code_agent.id,
        content=fix_response,
        message_type=MessageType.STATUS_UPDATE,
    )
    thread.add_reply(fix_reply)
    
    print(f"\n{code_agent.avatar_emoji} {code_agent.name} replied:")
    print(f"   {fix_response[:150]}...")
    
    # ============ Step 6: Security Agent approves ============
    print("\n" + "-"*40)
    print("STEP 6: Security Agent verifies fixes and approves")
    print("-"*40)
    
    approval_response = """🔒 **Re-review Complete**

All security issues have been addressed:
- ✅ Rate limiting implemented correctly
- ✅ JWT secret moved to env var
- ✅ Session invalidation working

**Security: APPROVED** ✅
"""
    
    approval_reply = Message(
        sender_id=security_agent.id,
        content=approval_response,
        message_type=MessageType.RESPONSE,
    )
    thread.add_reply(approval_reply)
    
    # Remove warning, add checkmark
    reaction_manager.remove_reaction(pr_message.id, "warning", security_agent.id)
    reaction_manager.add_reaction(pr_message.id, "white_check_mark", security_agent.id)
    
    print(f"\n{security_agent.avatar_emoji} {security_agent.name} approved:")
    print(f"   {approval_response[:100]}...")
    
    # ============ Step 7: Lead Agent gives final approval ============
    print("\n" + "-"*40)
    print("STEP 7: Lead Agent gives final approval")
    print("-"*40)
    
    final_approval = """👔 **Lead Review**

Great work on addressing the security feedback quickly!

✅ Security approved
✅ Quality approved  
✅ Changes look good

**APPROVED FOR MERGE** 🚀

@code-agent go ahead and merge when ready.
"""
    
    final_reply = Message(
        sender_id=lead_agent.id,
        content=final_approval,
        message_type=MessageType.RESPONSE,
    )
    thread.add_reply(final_reply)
    
    # Lead reacts with rocket (ship it!)
    reaction_manager.add_reaction(pr_message.id, "rocket", lead_agent.id)
    
    print(f"\n{lead_agent.avatar_emoji} {lead_agent.name} approved:")
    print(f"   {final_approval[:100]}...")
    
    # ============ Summary ============
    print("\n" + "="*60)
    print("📊 SCENARIO SUMMARY")
    print("="*60)
    
    print(f"\n📝 Thread: {thread}")
    print(f"   Participants: {thread.participants}")
    
    reactions = reaction_manager.get_reactions(pr_message.id)
    print(f"\n👍 Reactions on PR message: {reactions}")
    
    print(f"\n✅ Code review completed successfully!")
    print(f"   - Security issues identified and fixed")
    print(f"   - Quality suggestions noted")
    print(f"   - Final approval granted")
    print(f"   - Ready for merge")


if __name__ == "__main__":
    run_code_review_scenario()
