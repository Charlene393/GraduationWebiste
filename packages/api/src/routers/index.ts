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
      const response = await prisma.rsvp.upsert({
        where: { userId: context.session.user.id },
        create: { userId: context.session.user.id, status: input.status },
        update: { status: input.status },
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
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
