import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import teacherRoutes from "./routes/teacher.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import classRoutes from "./routes/class.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import institutionRoutes from "./routes/institution.routes.js";
import authRoutes from "./routes/authRoutes.js";
import institutionSettingsRoutes from "./routes/institutionSettings.routes.js";
import inviteCodeRoutes from "./routes/inviteCode.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import stripeRoutes from "./routes/stripe.routes.js";

import { getStripe } from "./utils/stripeService.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


const stripeInstance = getStripe();

if (stripeInstance) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("❌ STRIPE_WEBHOOK_SECRET missing");
        return res.status(503).send("Webhook secret not configured");
      }

      let event;
      try {
        event = stripeInstance.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
      } catch (err) {
        console.error("❌ Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`📥 [STRIPE] Webhook received: ${event.type}`);

      try {
        const {
          handleCheckoutSuccess,
          handlePaymentFailure,
          handleSubscriptionDeleted,
        } = await import("./utils/stripeService.js");

        const Institution = (await import("./models/Institution.js")).default;

        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutSuccess(event.data.object);
            break;

          case "invoice.payment_failed":
            await handlePaymentFailure(event.data.object);
            break;

          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(event.data.object);
            break;

          case "customer.subscription.updated": {
            const subscription = event.data.object;
            const institution = await Institution.findOne({
              stripeSubscriptionId: subscription.id,
            });

            if (institution) {
              institution.stripeCurrentPeriodEnd = new Date(
                subscription.current_period_end * 1000
              );
              await institution.save();
            }
            break;
          }

          default:
            console.log("ℹ️ Unhandled Stripe event:", event.type);
        }

        res.json({ received: true });
      } catch (err) {
        console.error("❌ Stripe webhook handler error:", err);
        res.status(500).json({ error: "Webhook failed" });
      }
    }
  );
}

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/institutions", institutionRoutes, inviteCodeRoutes);
app.use("/api/institution-settings", institutionSettingsRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api", assignmentRoutes);
app.use("/api/timetables", timetableRoutes);
app.use("/api/audit-logs", auditLogRoutes);

app.use("/api/stripe", stripeRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

export default app;
