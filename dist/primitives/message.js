/**
 * Message Primitive
 *
 * The fundamental unit of communication between agents. Messages are immutable
 * once sent - edits create new versions with edit history preserved.
 */
import { z } from 'zod';
import { nanoid } from 'nanoid';
// Message types for different communication patterns
export const MessageType = {
    TEXT: 'text',
    REQUEST: 'request',
    RESPONSE: 'response',
    STATUS_UPDATE: 'status_update',
    SYSTEM: 'system',
    CODE_BLOCK: 'code_block',
    ARTIFACT: 'artifact',
};
// Zod schema for message validation
export const MessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    messageType: z.enum(['text', 'request', 'response', 'status_update', 'system', 'code_block', 'artifact']),
    senderId: z.string(),
    channelId: z.string(),
    threadId: z.string().optional(),
    createdAt: z.date(),
    editedAt: z.date().optional(),
    artifactIds: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).default({}),
});
/**
 * A single message in a channel or thread.
 */
export class Message {
    id;
    content;
    messageType;
    senderId;
    channelId;
    threadId;
    createdAt;
    editedAt;
    artifactIds;
    metadata;
    edits;
    constructor(data) {
        this.id = data.id ?? nanoid();
        this.content = data.content;
        this.messageType = data.messageType ?? MessageType.TEXT;
        this.senderId = data.senderId;
        this.channelId = data.channelId;
        this.threadId = data.threadId;
        this.createdAt = data.createdAt ?? new Date();
        this.editedAt = data.editedAt;
        this.artifactIds = data.artifactIds ?? [];
        this.metadata = data.metadata ?? {};
        this.edits = [];
    }
    get isEdited() {
        return this.edits.length > 0;
    }
    get isThreadReply() {
        return this.threadId !== undefined;
    }
    /**
     * Create an edited version of this message.
     * Preserves edit history for auditability.
     */
    edit(newContent, editorId, reason) {
        const editRecord = {
            editedAt: new Date(),
            previousContent: this.content,
            editorId,
            reason,
        };
        const edited = new Message({
            ...this.toJSON(),
            content: newContent,
            editedAt: new Date(),
        });
        edited.edits.push(...this.edits, editRecord);
        return edited;
    }
    toJSON() {
        return {
            id: this.id,
            content: this.content,
            messageType: this.messageType,
            senderId: this.senderId,
            channelId: this.channelId,
            threadId: this.threadId,
            createdAt: this.createdAt,
            editedAt: this.editedAt,
            artifactIds: this.artifactIds,
            metadata: this.metadata,
        };
    }
    toString() {
        const edited = this.isEdited ? ' (edited)' : '';
        const thread = this.threadId ? ` [thread:${this.threadId.slice(0, 8)}]` : '';
        return `[${this.senderId}]${thread}${edited}: ${this.content.slice(0, 100)}`;
    }
}
// Helper functions for creating typed messages
export function createRequest(senderId, channelId, content, requestType, metadata = {}) {
    return new Message({
        senderId,
        channelId,
        content,
        messageType: MessageType.REQUEST,
        metadata: { requestType, ...metadata },
    });
}
export function createResponse(senderId, channelId, content, inResponseTo, threadId, metadata = {}) {
    return new Message({
        senderId,
        channelId,
        content,
        messageType: MessageType.RESPONSE,
        threadId,
        metadata: { inResponseTo, ...metadata },
    });
}
export function createStatusUpdate(senderId, channelId, content, status, metadata = {}) {
    return new Message({
        senderId,
        channelId,
        content,
        messageType: MessageType.STATUS_UPDATE,
        metadata: { status, ...metadata },
    });
}
//# sourceMappingURL=message.js.map