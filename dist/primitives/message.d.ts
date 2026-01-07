/**
 * Message Primitive
 *
 * The fundamental unit of communication between agents. Messages are immutable
 * once sent - edits create new versions with edit history preserved.
 */
import { z } from 'zod';
export declare const MessageType: {
    readonly TEXT: "text";
    readonly REQUEST: "request";
    readonly RESPONSE: "response";
    readonly STATUS_UPDATE: "status_update";
    readonly SYSTEM: "system";
    readonly CODE_BLOCK: "code_block";
    readonly ARTIFACT: "artifact";
};
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export declare const MessageSchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    messageType: z.ZodEnum<["text", "request", "response", "status_update", "system", "code_block", "artifact"]>;
    senderId: z.ZodString;
    channelId: z.ZodString;
    threadId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    editedAt: z.ZodOptional<z.ZodDate>;
    artifactIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string;
    messageType: "text" | "request" | "response" | "status_update" | "system" | "code_block" | "artifact";
    senderId: string;
    channelId: string;
    createdAt: Date;
    artifactIds: string[];
    metadata: Record<string, unknown>;
    threadId?: string | undefined;
    editedAt?: Date | undefined;
}, {
    id: string;
    content: string;
    messageType: "text" | "request" | "response" | "status_update" | "system" | "code_block" | "artifact";
    senderId: string;
    channelId: string;
    createdAt: Date;
    threadId?: string | undefined;
    editedAt?: Date | undefined;
    artifactIds?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type MessageData = z.infer<typeof MessageSchema>;
export interface MessageEdit {
    editedAt: Date;
    previousContent: string;
    editorId: string;
    reason?: string;
}
/**
 * A single message in a channel or thread.
 */
export declare class Message {
    readonly id: string;
    readonly content: string;
    readonly messageType: MessageType;
    readonly senderId: string;
    readonly channelId: string;
    readonly threadId?: string;
    readonly createdAt: Date;
    readonly editedAt?: Date;
    readonly artifactIds: string[];
    readonly metadata: Record<string, unknown>;
    readonly edits: MessageEdit[];
    constructor(data: Partial<MessageData> & {
        content: string;
        senderId: string;
        channelId: string;
    });
    get isEdited(): boolean;
    get isThreadReply(): boolean;
    /**
     * Create an edited version of this message.
     * Preserves edit history for auditability.
     */
    edit(newContent: string, editorId: string, reason?: string): Message;
    toJSON(): MessageData;
    toString(): string;
}
export declare function createRequest(senderId: string, channelId: string, content: string, requestType: string, metadata?: Record<string, unknown>): Message;
export declare function createResponse(senderId: string, channelId: string, content: string, inResponseTo: string, threadId?: string, metadata?: Record<string, unknown>): Message;
export declare function createStatusUpdate(senderId: string, channelId: string, content: string, status: string, metadata?: Record<string, unknown>): Message;
//# sourceMappingURL=message.d.ts.map