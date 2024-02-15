import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);
    //Map through the messages array and query each likes
    const messagesWithLikes = await Promise.all(
      messages.map(async (message) => {
        const likes = await ctx.db
          .query("likes")
          .withIndex("byMessageId", (q) => q.eq("messageId", message._id))
          .collect();

        return {
          ...message,
          likes: likes.length,
        };
      })
    );

    // Reverse the list so that it's in a chronological order.

    return messagesWithLikes.reverse().map((message) => ({
      ...message,
      body: message.body.replace(":)", "😁"),
    }));
  },
});

export const send = mutation({
  args: { body: v.string(), author: v.string() },
  handler: async (ctx, { body, author }) => {
    // Send a new message.
    await ctx.db.insert("messages", { body, author });
    if (body.startsWith("@gpt") && author !== "ChatGPT") {
      // Schedule the chat action to run immediately
      await ctx.scheduler.runAfter(0, api.openai.chat, {
        messageBody: body,
      });
    }
  },
});

export const like = mutation({
  args: { liker: v.string(), messageId: v.id("messages") },
  handler: async (ctx, { liker, messageId }) => {
    ctx.db.insert("likes", {
      liker,
      messageId,
    });
  },
});
