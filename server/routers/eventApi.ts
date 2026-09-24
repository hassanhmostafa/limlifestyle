import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getClinicianParticipants, getUserByOpenId, getUserByPhone, getUserReadings, hasClinicianHealthAccess } from "../db";
import { sdk } from "../_core/sdk";
import { EVENT_ACCESS_TOKEN_TTL_MS, readBearerToken } from "../lib/apiSecurity";
import { toEventHealthReading } from "../lib/eventHealth";
import { normalizeSaudiMobilePhone } from "../lib/phone";

const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

function sendUnauthorized(res: Response, message = "Valid participant access token required.") {
  return res.status(401).json({ error: "unauthorized", message });
}

/**
 * Event-app sign-in: a participant proves ownership of their LIM phone account,
 * then receives a time-limited Bearer token. When OTP is enabled, replace only
 * the password validation in this handler; the result-access contract remains.
 */
export async function handleEventPhoneLogin(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", message: "phone and password are required." });
  }

  const normalizedPhone = normalizeSaudiMobilePhone(parsed.data.phone);
  if (!normalizedPhone.ok) {
    return res.status(400).json({ error: "invalid_phone", message: "Enter a valid Saudi mobile number." });
  }

  const user = await getUserByPhone(normalizedPhone.e164);
  if (!user || !user.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return sendUnauthorized(res, "Invalid phone number or password.");
  }

  const accessToken = await sdk.createSessionToken(user.openId, {
    name: user.name || "LIM Participant",
    expiresInMs: EVENT_ACCESS_TOKEN_TTL_MS,
  });

  return res.json({
    accessToken,
    tokenType: "Bearer",
    expiresIn: EVENT_ACCESS_TOKEN_TTL_MS / 1000,
    participant: {
      name: user.name,
      phone: normalizedPhone.national,
    },
  });
}

/**
 * Returns only the authenticated participant's health readings. This endpoint
 * deliberately accepts no `phone`, `participantId`, or `userId` parameter, so
 * an event application cannot substitute another participant's identity.
 */
export async function handleEventMyResults(req: Request, res: Response) {
  const accessToken = readBearerToken(req);
  const session = await sdk.verifySession(accessToken);
  if (!session) return sendUnauthorized(res);

  const user = await getUserByOpenId(session.openId);
  if (!user) return sendUnauthorized(res);

  const readings = await getUserReadings(user.id);
  const normalizedPhone = user.phone ? normalizeSaudiMobilePhone(user.phone) : null;
  return res.json({
    participant: {
      name: user.name,
      phone: normalizedPhone?.ok ? normalizedPhone.national : null,
    },
    readings: readings.map(toEventHealthReading),
  });
}

async function authenticateEventUser(req: Request, res: Response) {
  const accessToken = readBearerToken(req);
  const session = await sdk.verifySession(accessToken);
  if (!session) { sendUnauthorized(res); return null; }
  const user = await getUserByOpenId(session.openId);
  if (!user) { sendUnauthorized(res); return null; }
  return user;
}

/** Lists only participants who explicitly granted this expert account access. */
export async function handleClinicianParticipants(req: Request, res: Response) {
  const clinician = await authenticateEventUser(req, res);
  if (!clinician) return;
  if (clinician.role !== "expert") return res.status(403).json({ error: "forbidden", message: "Clinician access is required." });
  const participants = await getClinicianParticipants(clinician.id);
  return res.json({ participants });
}

/** Returns full metrics only after verifying the participant's active consent grant. */
export async function handleClinicianParticipantResults(req: Request, res: Response) {
  const clinician = await authenticateEventUser(req, res);
  if (!clinician) return;
  if (clinician.role !== "expert") return res.status(403).json({ error: "forbidden", message: "Clinician access is required." });

  const participantUserId = Number(req.params.participantUserId);
  if (!Number.isSafeInteger(participantUserId) || participantUserId <= 0) {
    return res.status(400).json({ error: "invalid_request", message: "A valid participantUserId is required." });
  }
  if (!(await hasClinicianHealthAccess(clinician.id, participantUserId))) {
    return res.status(403).json({ error: "forbidden", message: "This participant has not authorized access." });
  }
  const readings = await getUserReadings(participantUserId);
  return res.json({ participantUserId, readings: readings.map(toEventHealthReading) });
}
