import { and, eq, gt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { eventTracks, eventStaff, eventStaffSessions } from "../drizzle/schema";
import { getDb } from "./db";
import { EVENT_CODE } from "./eventCareDb";

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "قاعدة البيانات غير متاحة",
    });
  return db;
}
export async function listTracks(publicOnly = false) {
  const db = await database();
  return db
    .select()
    .from(eventTracks)
    .where(
      and(
        eq(eventTracks.eventCode, EVENT_CODE),
        publicOnly ? eq(eventTracks.active, 1) : undefined
      )
    )
    .orderBy(eventTracks.id);
}
export async function requireTrack(id: number, active = true) {
  const db = await database();
  const [track] = await db
    .select()
    .from(eventTracks)
    .where(
      and(
        eq(eventTracks.id, id),
        eq(eventTracks.eventCode, EVENT_CODE),
        active ? eq(eventTracks.active, 1) : undefined
      )
    );
  if (!track)
    throw new TRPCError({ code: "NOT_FOUND", message: "المسار غير متاح" });
  return track;
}
export async function selectRegistrationTrack(id?: number) {
  if (id !== undefined) return requireTrack(id);
  const tracks = await listTracks(true);
  if (tracks.length === 0)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "التسجيل غير متاح حاليًا. يرجى التواصل مع منظم الفعالية.",
    });
  // Generic event links use the first active track; organizer links retain their explicit scope.
  return tracks[0];
}
export async function createTrack(name: string) {
  const db = await database();
  const [existing] = await db
    .select({ id: eventTracks.id })
    .from(eventTracks)
    .where(
      and(eq(eventTracks.eventCode, EVENT_CODE), eq(eventTracks.name, name))
    );
  if (existing)
    throw new TRPCError({
      code: "CONFLICT",
      message: "اسم المسار موجود بالفعل",
    });
  try {
    const [created] = await db
      .insert(eventTracks)
      .values({ eventCode: EVENT_CODE, name })
      .$returningId();
    return created;
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY")
      throw new TRPCError({
        code: "CONFLICT",
        message: "اسم المسار موجود بالفعل",
      });
    throw error;
  }
}
export async function changeTrack(id: number, name: string, active: boolean) {
  const db = await database();
  await requireTrack(id, false);
  await db.transaction(async tx => {
    await tx
      .update(eventTracks)
      .set({ name, active: Number(active) })
      .where(
        and(eq(eventTracks.id, id), eq(eventTracks.eventCode, EVENT_CODE))
      );
    // Pausing a track invalidates existing staff logins even after it is resumed.
    if (!active)
      await tx
        .update(eventStaff)
        .set({ credentialVersion: sql`${eventStaff.credentialVersion} + 1` })
        .where(
          and(eq(eventStaff.trackId, id), eq(eventStaff.eventCode, EVENT_CODE))
        );
  });
}
export async function listTeam() {
  const db = await database();
  // Never return hashes or credentials in administrator list responses.
  return db
    .select({
      id: eventStaff.id,
      trackId: eventStaff.trackId,
      name: eventStaff.name,
      duty: eventStaff.duty,
      active: eventStaff.active,
      hasCode: sql<number>`CASE WHEN ${eventStaff.codeHash} IS NULL THEN 0 ELSE 1 END`,
    })
    .from(eventStaff)
    .where(eq(eventStaff.eventCode, EVENT_CODE))
    .orderBy(eventStaff.id);
}
export async function createStaff(data: {
  trackId: number;
  name: string;
  duty: "nurse" | "doctor";
  codeHash: string;
}) {
  await requireTrack(data.trackId);
  const db = await database();
  const [created] = await db
    .insert(eventStaff)
    .values({ ...data, eventCode: EVENT_CODE })
    .$returningId();
  return created;
}
export async function changeStaff(
  id: number,
  data: { active?: boolean; codeHash?: string }
) {
  const db = await database();
  const [staff] = await db
    .select()
    .from(eventStaff)
    .where(and(eq(eventStaff.id, id), eq(eventStaff.eventCode, EVENT_CODE)));
  if (!staff)
    throw new TRPCError({ code: "NOT_FOUND", message: "الموظف غير موجود" });
  await db
    .update(eventStaff)
    .set({
      ...(data.active !== undefined ? { active: Number(data.active) } : {}),
      ...(data.codeHash !== undefined ? { codeHash: data.codeHash } : {}),
      credentialVersion: sql`${eventStaff.credentialVersion} + 1`,
    })
    .where(and(eq(eventStaff.id, id), eq(eventStaff.eventCode, EVENT_CODE)));
}
export async function staffByCodeHash(codeHash: string) {
  const db = await database();
  const [row] = await db
    .select({ staff: eventStaff, trackName: eventTracks.name })
    .from(eventStaff)
    .innerJoin(
      eventTracks,
      and(
        eq(eventTracks.id, eventStaff.trackId),
        eq(eventTracks.eventCode, eventStaff.eventCode)
      )
    )
    .where(
      and(
        eq(eventStaff.eventCode, EVENT_CODE),
        eq(eventStaff.codeHash, codeHash),
        eq(eventStaff.active, 1),
        eq(eventTracks.active, 1)
      )
    );
  return row;
}
export async function createStaffSession(
  staffId: number,
  credentialVersion: number,
  tokenHash: string,
  expiresAt: Date
) {
  const db = await database();
  await db
    .insert(eventStaffSessions)
    .values({ staffId, credentialVersion, tokenHash, expiresAt });
}
export async function staffBySessionHash(tokenHash: string) {
  const db = await database();
  const [row] = await db
    .select({ staff: eventStaff, trackName: eventTracks.name })
    .from(eventStaffSessions)
    .innerJoin(eventStaff, eq(eventStaff.id, eventStaffSessions.staffId))
    .innerJoin(
      eventTracks,
      and(
        eq(eventTracks.id, eventStaff.trackId),
        eq(eventTracks.eventCode, eventStaff.eventCode)
      )
    )
    .where(
      and(
        eq(eventStaffSessions.tokenHash, tokenHash),
        gt(eventStaffSessions.expiresAt, new Date()),
        eq(eventStaffSessions.credentialVersion, eventStaff.credentialVersion),
        eq(eventStaff.eventCode, EVENT_CODE),
        eq(eventStaff.active, 1),
        eq(eventTracks.active, 1)
      )
    );
  return row;
}
export async function endStaffSession(tokenHash: string) {
  const db = await database();
  await db
    .delete(eventStaffSessions)
    .where(eq(eventStaffSessions.tokenHash, tokenHash));
}
