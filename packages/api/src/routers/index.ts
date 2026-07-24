import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import prisma from "@graduaro/db";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";

function rsvpStatus(status: "ATTENDING" | "DECLINED") {
  return status === "ATTENDING" ? ("ATTENDING" as const) : ("DECLINED" as const);
}

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  myRsvp: protectedProcedure.handler(async ({ context }) => {
    const response = await prisma.rsvp.findUnique({
      where: { userId: context.session.user.id },
      select: { status: true, updatedAt: true },
    });
    return response && { ...response, status: rsvpStatus(response.status) };
  }),
  updateRsvp: protectedProcedure
    .input(z.object({ status: z.enum(["ATTENDING", "DECLINED"]) }))
    .handler(async ({ context, input }) => {
      const existingResponse = await prisma.rsvp.findUnique({
        where: { userId: context.session.user.id },
        select: { id: true },
      });
      if (existingResponse) {
        throw new ORPCError("CONFLICT");
      }
      const response = await prisma.rsvp.create({
        data: { userId: context.session.user.id, status: input.status },
        select: { status: true, updatedAt: true },
      });
      return { ...response, status: rsvpStatus(response.status) };
    }),
  organiserRsvps: protectedProcedure.handler(async ({ context }) => {
    if (context.session.user.email !== "mbuguacharlene@gmail.com") {
      throw new ORPCError("FORBIDDEN");
    }
    const responses = await prisma.rsvp.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
      },
    });
    return responses.map((response) => ({ ...response, status: rsvpStatus(response.status) }));
  }),
  organiserOverview: protectedProcedure.handler(async ({ context }) => {
    if (context.session.user.email !== "mbuguacharlene@gmail.com") {
      throw new ORPCError("FORBIDDEN");
    }

    const guestFilter = { email: { not: "mbuguacharlene@gmail.com" } };
    const [guestCount, attending, declined, photoCount, messageCount, recentMessages] = await Promise.all([
      prisma.user.count({ where: guestFilter }),
      prisma.rsvp.count({ where: { status: "ATTENDING", user: guestFilter } }),
      prisma.rsvp.count({ where: { status: "DECLINED", user: guestFilter } }),
      prisma.photo.count({ where: { user: guestFilter } }),
      prisma.guestbookMessage.count({ where: { user: guestFilter } }),
      prisma.guestbookMessage.findMany({
        where: { user: guestFilter },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, message: true, createdAt: true, user: { select: { name: true } } },
      }),
    ]);

    return { guestCount, attending, declined, awaiting: guestCount - attending - declined, photoCount, messageCount, recentMessages };
  }),
  celebrationPhotos: protectedProcedure.handler(async () => {
    return prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, mimeType: true, data: true, createdAt: true, user: { select: { name: true } } },
    });
  }),
  uploadCelebrationPhoto: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(150),
      mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/),
      data: z.string().min(1).max(4_000_000),
    }))
    .handler(async ({ context, input }) => {
      return prisma.photo.create({
        data: { ...input, userId: context.session.user.id },
        select: { id: true, name: true, mimeType: true, data: true, createdAt: true, user: { select: { name: true } } },
      });
    }),
  organiserPhotos: protectedProcedure.handler(async ({ context }) => {
    if (context.session.user.email !== "mbuguacharlene@gmail.com") {
      throw new ORPCError("FORBIDDEN");
    }
    return prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, mimeType: true, data: true, createdAt: true, user: { select: { name: true, email: true } } },
    });
  }),
  organiserUpdatePhoto: protectedProcedure
    .input(z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(150) }))
    .handler(async ({ context, input }) => {
      if (context.session.user.email !== "mbuguacharlene@gmail.com") {
        throw new ORPCError("FORBIDDEN");
      }
      return prisma.photo.update({
        where: { id: input.id },
        data: { name: input.name },
        select: { id: true, name: true, mimeType: true, data: true, createdAt: true, user: { select: { name: true, email: true } } },
      });
    }),
  organiserDeletePhoto: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      if (context.session.user.email !== "mbuguacharlene@gmail.com") {
        throw new ORPCError("FORBIDDEN");
      }
      await prisma.photo.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
  guestbookMessages: protectedProcedure.handler(async () => {
    return prisma.guestbookMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, message: true, createdAt: true, user: { select: { name: true } } },
    });
  }),
  signGuestbook: protectedProcedure
    .input(z.object({ message: z.string().trim().min(2).max(500) }))
    .handler(async ({ context, input }) => {
      return prisma.guestbookMessage.create({
        data: { message: input.message, userId: context.session.user.id },
        select: { id: true, message: true, createdAt: true, user: { select: { name: true } } },
      });
    }),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
