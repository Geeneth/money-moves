import { z } from "zod";
import { handle, ok, badRequest, parseBody } from "@/lib/api-helpers";
import { setPassword, removePassword, verifyPassword, isPasswordSet } from "@/lib/auth";

const setSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(4, "Password must be at least 4 characters"),
});

const removeSchema = z.object({
  currentPassword: z.string().min(1),
});

/** POST — set or change password */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const { currentPassword, newPassword } = await parseBody(request, setSchema);
    const alreadySet = await isPasswordSet();
    if (alreadySet) {
      if (!currentPassword) throw badRequest("Current password is required to change password");
      const valid = await verifyPassword(currentPassword);
      if (!valid) throw badRequest("Current password is incorrect");
    }
    await setPassword(newPassword);
    return ok({ success: true });
  });
}

/** DELETE — remove password protection */
export async function DELETE(request: Request): Promise<Response> {
  return handle(async () => {
    const { currentPassword } = await parseBody(request, removeSchema);
    const valid = await verifyPassword(currentPassword);
    if (!valid) throw badRequest("Incorrect password");
    await removePassword();
    return ok({ success: true });
  });
}
