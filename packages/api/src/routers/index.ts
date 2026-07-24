import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import prisma from "@graduaro/db";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";

function rsvpStatus(status: "ATTENDING" | "DECLINED") {
  return status === "ATTENDING" ? ("ATTENDING" as const) : ("DECLINED" as const);
}

const ORGANISER_EMAIL = "mbuguacharlene@gmail.com";

function ensureOrganiser(email: string) {
  if (email !== ORGANISER_EMAIL) throw new ORPCError("FORBIDDEN");
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
    ensureOrganiser(context.session.user.email);
    const [responses, privateResponses] = await Promise.all([prisma.rsvp.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
      },
    }), prisma.guest.findMany({
      where: { rsvpStatus: { not: null } },
      orderBy: { rsvpUpdatedAt: "desc" },
      select: { id: true, name: true, contact: true, rsvpStatus: true, rsvpUpdatedAt: true },
    })]);
    return [
      ...responses.map((response) => ({ ...response, status: rsvpStatus(response.status) })),
      ...privateResponses.map((guest) => ({
        status: rsvpStatus(guest.rsvpStatus!),
        updatedAt: guest.rsvpUpdatedAt!,
        user: { name: guest.name, email: guest.contact || "Private invitation" },
      })),
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }),
  organiserOverview: protectedProcedure.handler(async ({ context }) => {
    ensureOrganiser(context.session.user.email);

    const guestFilter = { email: { not: "mbuguacharlene@gmail.com" } };
    const [accountGuestCount, privateGuests, attending, declined, photoCount, accountMessageCount, privateMessageCount, recentMessages, privateRecentMessages] = await Promise.all([
      prisma.user.count({ where: guestFilter }),
      prisma.guest.findMany({ select: { rsvpStatus: true } }),
      prisma.rsvp.count({ where: { status: "ATTENDING", user: guestFilter } }),
      prisma.rsvp.count({ where: { status: "DECLINED", user: guestFilter } }),
      prisma.photo.count({ where: { user: guestFilter } }),
      prisma.guestbookMessage.count({ where: { user: guestFilter } }),
      prisma.guestMessage.count(),
      prisma.guestbookMessage.findMany({
        where: { user: guestFilter },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, message: true, createdAt: true, user: { select: { name: true } } },
      }),
      prisma.guestMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, message: true, createdAt: true, guest: { select: { name: true } } },
      }),
    ]);

    const privateAttending = privateGuests.filter((guest) => guest.rsvpStatus === "ATTENDING").length;
    const privateDeclined = privateGuests.filter((guest) => guest.rsvpStatus === "DECLINED").length;
    const guestCount = accountGuestCount + privateGuests.length;
    const totalAttending = attending + privateAttending;
    const totalDeclined = declined + privateDeclined;
    const combinedMessages = [
      ...recentMessages.map((message) => ({ id: message.id, message: message.message, createdAt: message.createdAt, user: message.user })),
      ...privateRecentMessages.map((message) => ({ id: message.id, message: message.message, createdAt: message.createdAt, user: { name: message.guest.name } })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 3);
    return { guestCount, attending: totalAttending, declined: totalDeclined, awaiting: guestCount - totalAttending - totalDeclined, photoCount, messageCount: accountMessageCount + privateMessageCount, recentMessages: combinedMessages };
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
    ensureOrganiser(context.session.user.email);
    return prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, mimeType: true, data: true, createdAt: true, user: { select: { name: true, email: true } } },
    });
  }),
  organiserUpdatePhoto: protectedProcedure
    .input(z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(150) }))
    .handler(async ({ context, input }) => {
      ensureOrganiser(context.session.user.email);
      return prisma.photo.update({
        where: { id: input.id },
        data: { name: input.name },
        select: { id: true, name: true, mimeType: true, data: true, createdAt: true, user: { select: { name: true, email: true } } },
      });
    }),
  organiserDeletePhoto: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      ensureOrganiser(context.session.user.email);
      await prisma.photo.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
  organiserGuests: protectedProcedure.handler(async ({ context }) => {
    ensureOrganiser(context.session.user.email);
    return prisma.guest.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, contact: true, token: true, rsvpStatus: true, rsvpUpdatedAt: true, createdAt: true },
    });
  }),
  createOrganiserGuest: protectedProcedure
    .input(z.object({ name: z.string().trim().min(2).max(100), contact: z.string().trim().max(150).optional() }))
    .handler(async ({ context, input }) => {
      ensureOrganiser(context.session.user.email);
      return prisma.guest.create({
        data: { name: input.name, contact: input.contact || null, token: randomBytes(24).toString("base64url") },
        select: { id: true, name: true, contact: true, token: true, rsvpStatus: true, rsvpUpdatedAt: true, createdAt: true },
      });
    }),
  deleteOrganiserGuest: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      ensureOrganiser(context.session.user.email);
      await prisma.guest.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
  guestInvitation: publicProcedure
    .input(z.object({ token: z.string().min(20).max(100) }))
    .handler(async ({ input }) => {
      const guest = await prisma.guest.findUnique({
        where: { token: input.token },
        select: { name: true, rsvpStatus: true },
      });
      if (!guest) throw new ORPCError("NOT_FOUND");
      return guest;
    }),
  updateGuestRsvp: publicProcedure
    .input(z.object({ token: z.string().min(20).max(100), status: z.enum(["ATTENDING", "DECLINED"]) }))
    .handler(async ({ input }) => {
      const guest = await prisma.guest.findUnique({ where: { token: input.token }, select: { id: true, rsvpStatus: true } });
      if (!guest) throw new ORPCError("NOT_FOUND");
      if (guest.rsvpStatus) throw new ORPCError("CONFLICT");
      return prisma.guest.update({
        where: { id: guest.id },
        data: { rsvpStatus: input.status, rsvpUpdatedAt: new Date() },
        select: { name: true, rsvpStatus: true },
      });
    }),
  guestCelebrationMessages: publicProcedure
    .input(z.object({ token: z.string().min(20).max(100) }))
    .handler(async ({ input }) => {
      const guest = await prisma.guest.findFirst({ where: { token: input.token, rsvpStatus: "ATTENDING" }, select: { id: true } });
      if (!guest) throw new ORPCError("FORBIDDEN");
      return prisma.guestMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, message: true, createdAt: true, guest: { select: { name: true } } },
      });
    }),
  signGuestCelebrationMessage: publicProcedure
    .input(z.object({ token: z.string().min(20).max(100), message: z.string().trim().min(2).max(500) }))
    .handler(async ({ input }) => {
      const guest = await prisma.guest.findFirst({ where: { token: input.token, rsvpStatus: "ATTENDING" }, select: { id: true } });
      if (!guest) throw new ORPCError("FORBIDDEN");
      return prisma.guestMessage.create({
        data: { guestId: guest.id, message: input.message },
        select: { id: true, message: true, createdAt: true, guest: { select: { name: true } } },
      });
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
