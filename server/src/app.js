import express from "express";
import cors from "cors";

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




const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Stripe webhook must be registered BEFORE express.json()
// Webhook needs raw body for signature verification
import { getStripe } from "./utils/stripeService.js";

const stripeInstance = getStripe();
if (stripeInstance) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ [STRIPE] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(503).send("Webhook secret not configured");
    }

    let event;
    try {
      event = stripeInstance.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error(`❌ [STRIPE] Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const { handleCheckoutSuccess, handlePaymentFailure, handleSubscriptionDeleted } = await import("./utils/stripeService.js");
    const Institution = (await import("./models/Institution.js")).default;

    console.log(`📥 [STRIPE] Webhook received: ${event.type}`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          console.log(`✅ [STRIPE] Checkout session completed: ${session.id}`);
          await handleCheckoutSuccess(session);
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          console.log(`⚠️ [STRIPE] Payment failed for invoice: ${invoice.id}`);
          await handlePaymentFailure(invoice);
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          console.log(`⚠️ [STRIPE] Subscription deleted: ${subscription.id}`);
          await handleSubscriptionDeleted(subscription);
          break;
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          console.log(`📝 [STRIPE] Subscription updated: ${subscription.id}`);
          const institution = await Institution.findOne({ stripeSubscriptionId: subscription.id });
          if (institution) {
            institution.stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
            await institution.save();
            console.log(`✅ [STRIPE] Updated subscription period end for institution ${institution._id}`);
          }
          break;
        }
        default:
          console.log(`ℹ️ [STRIPE] Unhandled webhook event type: ${event.type}`);
      }
      res.json({ received: true });
    } catch (error) {
      console.error(`❌ [STRIPE] Error handling webhook ${event.type}:`, error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });
}

// JSON body parser for all other routes
app.use(express.json());

app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api", assignmentRoutes);
app.use("/api/institutions", institutionRoutes, inviteCodeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/institution-settings", institutionSettingsRoutes);
app.use("/api/timetables", timetableRoutes);
app.use("/api/audit-logs", auditLogRoutes);

// Stripe routes (webhook already registered above)
app.use("/api/stripe", stripeRoutes);


app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

export default app;
