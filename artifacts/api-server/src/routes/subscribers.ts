import { Router, type IRouter } from "express";
import { db, emailSubscribersTable } from "@workspace/db";
import { SubscribeBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/subscribers", async (req, res) => {
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { email } = parsed.data;

  try {
    await db.insert(emailSubscribersTable).values({ email });
    res.status(201).json({
      message: "Successfully subscribed! You'll get notified when killer deals drop.",
      email,
    });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === "23505") {
      res.status(409).json({
        error: "already_subscribed",
        message: "This email is already subscribed.",
      });
      return;
    }
    throw err;
  }
});

export default router;
