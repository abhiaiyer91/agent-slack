"""
Incident Response Scenario

Demonstrates how agents collaborate during an incident using Slack-like primitives.

Agents involved:
- Monitor Agent: Detects issues and raises alerts
- Oncall Agent: Initial responder, triages incidents
- Database Agent: Specialist for database issues
- Infra Agent: Specialist for infrastructure issues
- Comms Agent: Handles communication to stakeholders

Flow:
1. Monitor Agent detects high error rate
2. Alert posted to #incidents, oncall mentioned
3. Oncall Agent triages and identifies DB issue
4. Database Agent is brought in via handoff
5. Issue resolved, postmortem artifacts created
"""

import sys
sys.path.insert(0, '/workspace')

from datetime import datetime, timedelta

from agent_slack import (
    Workspace,
    Agent,
    Channel,
    Message,
    MessageType,
    Artifact,
)
from agent_slack.primitives.thread import ThreadManager
from agent_slack.primitives.reaction import ReactionManager
from agent_slack.primitives.presence import PresenceManager, PresenceStatus
from agent_slack.coordination.task import TaskManager, TaskPriority, TaskStatus
from agent_slack.coordination.handoff import (
    HandoffManager,
    HandoffReason,
    HandoffContext,
)


def create_agents():
    """Create incident response agents."""
    
    monitor = Agent(
        name="monitor-agent",
        description="Monitors systems and detects anomalies",
        avatar_emoji="📡",
    )
    monitor.add_capability("detect_anomaly", "Detect system anomalies")
    monitor.add_capability("alert", "Raise alerts")
    
    oncall = Agent(
        name="oncall-agent",
        description="On-call responder for incidents",
        avatar_emoji="🚨",
    )
    oncall.add_capability("triage", "Triage incidents")
    oncall.add_capability("coordinate", "Coordinate response")
    
    db_agent = Agent(
        name="db-agent",
        description="Database specialist",
        avatar_emoji="🗄️",
    )
    db_agent.add_capability("db_diagnosis", "Diagnose database issues")
    db_agent.add_capability("db_repair", "Repair database problems")
    db_agent.add_capability("query_optimize", "Optimize database queries")
    
    infra = Agent(
        name="infra-agent",
        description="Infrastructure specialist",
        avatar_emoji="🏗️",
    )
    infra.add_capability("infra_diagnosis", "Diagnose infrastructure issues")
    infra.add_capability("scale", "Scale infrastructure")
    
    comms = Agent(
        name="comms-agent",
        description="Handles stakeholder communication",
        avatar_emoji="📢",
    )
    comms.add_capability("status_update", "Send status updates")
    comms.add_capability("postmortem", "Write postmortems")
    
    return monitor, oncall, db_agent, infra, comms


def run_incident_scenario():
    """Execute the incident response scenario."""
    
    print("\n" + "="*60)
    print("🚨 INCIDENT RESPONSE SCENARIO")
    print("="*60 + "\n")
    
    # Setup
    workspace = Workspace(name="acme-ops")
    monitor, oncall, db_agent, infra, comms = create_agents()
    
    workspace.register(monitor, oncall, db_agent, infra, comms)
    
    # Initialize managers
    presence_mgr = PresenceManager()
    thread_mgr = ThreadManager()
    reaction_mgr = ReactionManager()
    task_mgr = TaskManager()
    handoff_mgr = HandoffManager()
    
    # Set presence
    for agent in [monitor, oncall, db_agent, infra, comms]:
        presence = presence_mgr.get_or_create(agent.id)
        presence.go_online()
    
    # Mark oncall as on-call (in status)
    oncall_presence = presence_mgr.get(oncall.id)
    oncall_presence.set_status(PresenceStatus.ONLINE, "🔔 On-call this week")
    
    print(f"📦 Workspace: {workspace}")
    print(f"\n👥 Agent Presence:")
    for p in presence_mgr.get_all():
        agent = workspace.get_agent(p.agent_id)
        if agent:
            print(f"   {p}")
    
    # Create #incidents channel
    incidents_channel = workspace.create_channel(
        "incidents",
        purpose="Active incident coordination"
    )
    
    for agent in [monitor, oncall, db_agent, infra, comms]:
        workspace.join_channel(agent.id, incidents_channel.id)
    
    print(f"\n📢 Channel: {incidents_channel}")
    
    # ============ Step 1: Monitor detects issue ============
    print("\n" + "-"*40)
    print("STEP 1: Monitor Agent detects high error rate")
    print("-"*40)
    
    alert_content = """🚨 **ALERT: High Error Rate Detected**

**Severity**: P1 (Critical)
**Service**: api-gateway
**Started**: 2 minutes ago

**Metrics**:
- Error rate: 45% (threshold: 5%)
- P99 latency: 12s (threshold: 500ms)
- Affected endpoints: `/api/users/*`, `/api/orders/*`

**Impact**:
- Estimated 30% of requests failing
- Customer-facing impact confirmed

@oncall-agent please investigate immediately

---
*Alert ID: INC-2024-0142*
"""
    
    alert_msg = workspace.post_message(
        sender_id=monitor.id,
        channel_id=incidents_channel.id,
        content=alert_content,
        message_type=MessageType.REQUEST,
        metadata={"alert_id": "INC-2024-0142", "severity": "P1"},
    )
    
    print(f"\n{monitor.avatar_emoji} {monitor.name} posted alert:")
    print(f"   Severity: P1, Service: api-gateway")
    print(f"   Error rate: 45%, Customer impact: Yes")
    
    # Create incident thread
    incident_thread = thread_mgr.get_or_create_thread(alert_msg)
    
    # ============ Step 2: Oncall acknowledges ============
    print("\n" + "-"*40)
    print("STEP 2: Oncall Agent acknowledges and starts triage")
    print("-"*40)
    
    # React with eyes (investigating)
    reaction_mgr.add_reaction(alert_msg.id, "eyes", oncall.id)
    
    # Set status to busy
    oncall_presence.go_busy("🔥 Handling INC-2024-0142")
    oncall_presence.increment_workload()
    
    ack_content = """🚨 **Acknowledged** - Starting investigation

**Incident Commander**: @oncall-agent
**Status**: Investigating

Initial observations:
- Checking API gateway logs
- Correlating with recent deployments
- No deployments in last 6 hours

Stand by for updates...
"""
    
    ack_reply = Message(
        sender_id=oncall.id,
        content=ack_content,
    )
    incident_thread.add_reply(ack_reply)
    
    print(f"\n{oncall.avatar_emoji} {oncall.name}:")
    print(f"   Acknowledged incident, starting triage")
    print(f"   Status: {oncall_presence}")
    
    # Create triage task
    triage_task = task_mgr.create(
        title="Triage INC-2024-0142",
        description="Investigate high error rate on api-gateway",
        created_by=oncall.id,
        assigned_to=oncall.id,
        priority=TaskPriority.CRITICAL,
        channel_id=incidents_channel.id,
    )
    triage_task.start()
    
    print(f"\n📋 Task created: {triage_task}")
    
    # ============ Step 3: Initial findings ============
    print("\n" + "-"*40)
    print("STEP 3: Oncall identifies database as root cause")
    print("-"*40)
    
    findings_content = """🔍 **Investigation Update**

**Root Cause Identified**: Database connection pool exhaustion

**Evidence**:
- DB connection pool at 100% utilization
- Query queue depth: 847 (normal: <10)
- Slow query log shows full table scans
- Started after spike in `/api/orders` traffic

**Hypothesis**: 
Marketing campaign drove 10x orders traffic, triggering 
expensive unoptimized queries that exhausted DB connections.

**Proposed Actions**:
1. Scale up DB connections (short-term)
2. Optimize problematic queries (medium-term)
3. Add query result caching (long-term)

@db-agent need your expertise on the query optimization.
Handing off database investigation to you.
"""
    
    findings_reply = Message(
        sender_id=oncall.id,
        content=findings_content,
    )
    incident_thread.add_reply(findings_reply)
    
    print(f"\n{oncall.avatar_emoji} {oncall.name}:")
    print(f"   Root cause: DB connection pool exhaustion")
    print(f"   Handing off to database specialist")
    
    # Create handoff to DB agent
    handoff_context = HandoffContext(
        summary="DB connection pool exhausted due to slow queries",
        background="Marketing campaign caused 10x order traffic spike",
        current_state="API errors at 45%, DB connections at 100%",
        expected_outcome="Identify and fix slow queries, restore service",
        thread_ids=[incident_thread.id],
        data={
            "slow_queries": [
                "SELECT * FROM orders WHERE status = 'pending'",
                "SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders)",
            ],
            "affected_tables": ["orders", "order_items"],
        },
    )
    
    handoff = handoff_mgr.create(
        from_agent=oncall.id,
        to_agent=db_agent.id,
        reason=HandoffReason.CAPABILITY_NEEDED,
        context=handoff_context,
        channel_id=incidents_channel.id,
        is_urgent=True,
    )
    
    print(f"\n🤝 Handoff created: {handoff}")
    
    # Update triage task
    triage_task.update_progress(50, "Root cause identified, handed to DB specialist")
    
    # ============ Step 4: DB Agent takes over ============
    print("\n" + "-"*40)
    print("STEP 4: Database Agent accepts handoff and fixes")
    print("-"*40)
    
    # DB agent accepts handoff
    handoff_mgr.accept(handoff.id, db_agent.id)
    handoff.start()
    
    # Update presence
    db_presence = presence_mgr.get(db_agent.id)
    db_presence.go_busy("🔥 Fixing INC-2024-0142 DB issues")
    db_presence.increment_workload()
    
    db_response = """🗄️ **Database Analysis**

Accepting handoff. Analyzing the slow queries...

**Findings**:
1. `orders` table missing index on `status` column
2. Subquery in order_items causing N+1 problem
3. No query result caching for common queries

**Immediate Actions**:
```sql
-- Add missing index (executing now)
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);

-- Rewrite N+1 query as JOIN
SELECT oi.* FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'pending';
```

Applying fixes now. Monitor should see improvement in ~2 minutes.
"""
    
    db_reply = Message(
        sender_id=db_agent.id,
        content=db_response,
    )
    incident_thread.add_reply(db_reply)
    
    # Attach query optimization artifact
    query_fix = Artifact.from_code(
        code="""-- Optimized queries for orders service

-- Add index for status lookups
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY idx_orders_created ON orders(created_at);

-- Rewrite N+1 query as efficient JOIN
SELECT 
    o.id as order_id,
    o.status,
    oi.product_id,
    oi.quantity
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'pending'
  AND o.created_at > NOW() - INTERVAL '7 days';

-- Add query result cache hint
-- CACHE_TTL: 60 seconds for pending orders count
SELECT COUNT(*) FROM orders WHERE status = 'pending';
""",
        language="sql",
        title="Query Optimizations for INC-2024-0142",
        created_by=db_agent.id,
    )
    
    print(f"\n{db_agent.avatar_emoji} {db_agent.name}:")
    print(f"   Identified missing index and N+1 query")
    print(f"   Applying fixes...")
    print(f"   📎 Created: {query_fix}")
    
    # ============ Step 5: Monitor confirms recovery ============
    print("\n" + "-"*40)
    print("STEP 5: Monitor confirms service recovery")
    print("-"*40)
    
    recovery_content = """📡 **RECOVERY DETECTED**

**Service**: api-gateway
**Status**: ✅ Recovering

**Current Metrics**:
- Error rate: 2.3% ⬇️ (was 45%)
- P99 latency: 380ms ⬇️ (was 12s)
- DB connection pool: 34% (was 100%)

**Trend**: Improving, expect full recovery in ~5 minutes

All metrics returning to normal parameters.
"""
    
    recovery_reply = Message(
        sender_id=monitor.id,
        content=recovery_content,
    )
    incident_thread.add_reply(recovery_reply)
    
    # React with checkmark
    reaction_mgr.add_reaction(alert_msg.id, "white_check_mark", monitor.id)
    
    print(f"\n{monitor.avatar_emoji} {monitor.name}:")
    print(f"   Error rate dropped to 2.3%")
    print(f"   Service recovering")
    
    # ============ Step 6: Resolve incident ============
    print("\n" + "-"*40)
    print("STEP 6: Incident resolved, postmortem initiated")
    print("-"*40)
    
    # Complete handoff
    handoff_mgr.complete(handoff.id, "Index added, queries optimized, service recovered")
    
    # DB agent done
    db_presence.decrement_workload()
    db_presence.go_online()
    
    resolve_content = """✅ **INCIDENT RESOLVED**

**INC-2024-0142**: High Error Rate on api-gateway
**Duration**: 23 minutes
**Severity**: P1 → Resolved

**Root Cause**: 
Missing database index caused slow queries during traffic spike.

**Resolution**:
1. Added index on `orders.status` column
2. Optimized N+1 query in order_items
3. Service fully recovered

**Follow-up Actions**:
- [ ] Add query performance monitoring
- [ ] Review all high-traffic tables for missing indexes
- [ ] Implement query result caching

@comms-agent please draft the postmortem.

All responders: Thank you for the quick response! 🙏
"""
    
    resolve_reply = Message(
        sender_id=oncall.id,
        content=resolve_content,
    )
    incident_thread.add_reply(resolve_reply)
    
    # Complete tasks
    triage_task.complete(output={"resolution": "Index added, queries optimized"})
    
    # Oncall back to normal
    oncall_presence.decrement_workload()
    oncall_presence.set_status(PresenceStatus.ONLINE, "🔔 On-call this week")
    
    # Add celebration reaction
    reaction_mgr.add_reaction(alert_msg.id, "tada", oncall.id)
    reaction_mgr.add_reaction(alert_msg.id, "tada", db_agent.id)
    
    print(f"\n{oncall.avatar_emoji} {oncall.name}:")
    print(f"   Incident resolved after 23 minutes")
    print(f"   Task: {triage_task}")
    
    # ============ Step 7: Comms creates postmortem ============
    print("\n" + "-"*40)
    print("STEP 7: Comms Agent creates postmortem")
    print("-"*40)
    
    postmortem = Artifact.from_report(
        title="Postmortem: INC-2024-0142",
        sections={
            "Summary": "High error rate on api-gateway due to database performance issues during marketing campaign traffic spike.",
            "Timeline": """
- 14:32 UTC: Marketing campaign launched
- 14:45 UTC: Error rate exceeded threshold
- 14:47 UTC: Alert triggered, oncall paged
- 14:52 UTC: Root cause identified (DB connection exhaustion)
- 14:58 UTC: Database index added
- 15:05 UTC: Service fully recovered
- 15:08 UTC: Incident resolved
""",
            "Root Cause": "Missing index on `orders.status` column caused full table scans under high load, exhausting connection pool.",
            "Impact": "~30% of API requests failed for 23 minutes. Estimated 2,400 affected customer requests.",
            "Action Items": """
1. [P0] Add monitoring for query performance - Owner: @db-agent
2. [P1] Audit all tables for missing indexes - Owner: @db-agent  
3. [P1] Implement query result caching - Owner: @infra-agent
4. [P2] Add load testing for marketing campaigns - Owner: @oncall-agent
""",
            "Lessons Learned": "Need proactive index monitoring and load testing before major campaigns.",
        },
        created_by=comms.id,
    )
    
    postmortem_content = f"""📝 **Postmortem Created**

I've drafted the postmortem for INC-2024-0142.

📎 **Attached**: {postmortem.title}

Key points:
- Duration: 23 minutes
- Impact: ~2,400 affected requests
- Root cause: Missing database index
- 4 action items assigned

Please review and add any additional context.

The postmortem will be shared with leadership on Monday.
"""
    
    postmortem_reply = Message(
        sender_id=comms.id,
        content=postmortem_content,
        artifact_ids=[postmortem.id],
    )
    incident_thread.add_reply(postmortem_reply)
    
    print(f"\n{comms.avatar_emoji} {comms.name}:")
    print(f"   Created postmortem document")
    print(f"   📎 {postmortem}")
    
    # ============ Summary ============
    print("\n" + "="*60)
    print("📊 INCIDENT SUMMARY")
    print("="*60)
    
    print(f"\n📝 Thread: {incident_thread}")
    print(f"   Replies: {incident_thread.reply_count}")
    print(f"   Participants: {incident_thread.participants}")
    
    reactions = reaction_mgr.get_reactions(alert_msg.id)
    print(f"\n👍 Reactions: {reactions}")
    
    print(f"\n🤝 Handoffs:")
    for h in handoff_mgr.get_sent_by(oncall.id, open_only=False):
        print(f"   {h}")
    
    print(f"\n📋 Tasks:")
    for t in task_mgr.list_all():
        print(f"   {t}")
    
    print(f"\n✅ Incident resolved successfully!")
    print(f"   - Fast detection by monitor")
    print(f"   - Efficient triage by oncall")
    print(f"   - Expert fix by database specialist")
    print(f"   - Clear communication throughout")


if __name__ == "__main__":
    run_incident_scenario()
