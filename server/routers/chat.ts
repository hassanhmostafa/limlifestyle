/**
 * Chat tRPC router.
 * Stored-message conversations between regular users and health experts.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, expertProcedure, router } from "../_core/trpc";
import {
  findOrCreateConversation,
  getUserConversations,
  getExpertConversations,
  getConversationMessages,
  sendMessage,
  getConversationById,
  listExperts,
} from "../db";

export const chatRouter = router({
  /**
   * List all approved experts (role = 'expert').
   * Accessible to any authenticated user so they can browse and start conversations.
   * Frontend: trpc.chat.listExperts.useQuery()
   */
  listExperts: protectedProcedure.query(async () => {
    return listExperts();
  }),

  /**
   * Start (or resume) a conversation with an expert.
   * Returns the conversation object.
   * Frontend: trpc.chat.startConversation.useMutation()
   */
  startConversation: protectedProcedure
    .input(z.object({ expertId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.expertId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot start a conversation with yourself." });
      }
      const conversation = await findOrCreateConversation(ctx.user.id, input.expertId);
      return conversation;
    }),

  /**
   * Get all conversations for the current user.
   * Frontend: trpc.chat.myConversations.useQuery()
   */
  myConversations: protectedProcedure.query(async ({ ctx }) => {
    return getUserConversations(ctx.user.id);
  }),

  /**
   * Get the expert's inbox — all conversations assigned to them.
   * Frontend: trpc.chat.expertInbox.useQuery()
   */
  expertInbox: expertProcedure.query(async ({ ctx }) => {
    return getExpertConversations(ctx.user.id);
  }),

  /**
   * Get messages for a conversation.
   * Both the user and the expert in the conversation can access this.
   * Frontend: trpc.chat.getMessages.useQuery({ conversationId })
   */
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const conv = await getConversationById(input.conversationId);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

      // Security: only participants can read messages
      if (conv.userId !== ctx.user.id && conv.expertId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a participant in this conversation" });
      }

      return getConversationMessages(input.conversationId);
    }),

  /**
   * Send a message in a conversation.
   * Both the user and the expert can send messages.
   * Supports optional file attachment (fileUrl + fileName from S3).
   * Frontend: trpc.chat.sendMessage.useMutation()
   */
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().max(5000).default(""),
      fileUrl: z.string().url().optional(),
      fileName: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conv = await getConversationById(input.conversationId);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

      // Security: only participants can send messages
      if (conv.userId !== ctx.user.id && conv.expertId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a participant in this conversation" });
      }

      // Must have either content or a file
      if (!input.content && !input.fileUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message must have content or a file attachment" });
      }

      await sendMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
      });

      return { success: true };
    }),

  /**
   * Upload a file to S3 for use as a chat attachment.
   * Accepts base64-encoded file data from the frontend.
   * Frontend: trpc.chat.uploadFile.useMutation()
   */
  uploadFile: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      fileName: z.string().max(255),
      fileBase64: z.string(), // base64 encoded file content
      mimeType: z.string().default("application/pdf"),
    }))
    .mutation(async ({ ctx, input }) => {
      const conv = await getConversationById(input.conversationId);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      if (conv.userId !== ctx.user.id && conv.expertId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a participant in this conversation" });
      }

      // Decode base64 and upload to S3
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.fileBase64, "base64");

      // Limit: 10 MB
      if (buffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "File must be under 10 MB" });
      }

      const suffix = Date.now();
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `chat-attachments/${ctx.user.id}/${suffix}-${safeFileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      return { url, fileName: input.fileName };
    }),
});
