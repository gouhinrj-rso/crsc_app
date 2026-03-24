import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'npm:stripe@14.21.0'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

// Create PostgreSQL client for Google Cloud
async function getDbClient(): Promise<Client> {
  const client = new Client({
    hostname: Deno.env.get('DB_HOST')!,
    port: parseInt(Deno.env.get('DB_PORT') || '5432'),
    user: Deno.env.get('DB_USER')!,
    password: Deno.env.get('DB_PASSWORD')!,
    database: Deno.env.get('DB_NAME')!,
    tls: {
      enabled: true,
      enforce: true,
    },
  })
  await client.connect()
  return client
}

serve(async (req: Request) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  })

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    console.error('[stripe-webhook] Missing signature or webhook secret')
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event
  const body = await req.text()

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  let db: Client | null = null

  try {
    db = await getDbClient()

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const userId = paymentIntent.metadata?.userId

        // Update payment status to completed
        await db.queryObject`
          UPDATE payments SET
            status = 'completed',
            paid_at = NOW()
          WHERE stripe_payment_id = ${paymentIntent.id}
        `

        // Update user packet status
        if (userId) {
          await db.queryObject`
            UPDATE users SET
              packet_status = 'payment_completed',
              updated_at = NOW()
            WHERE id = ${userId}
          `

          // Update packet_status step
          await db.queryObject`
            INSERT INTO packet_status (user_id, step_name, step_status, completed_at, updated_at)
            VALUES (${userId}, 'payment', 'completed', NOW(), NOW())
            ON CONFLICT (user_id, step_name) DO UPDATE SET
              step_status = 'completed',
              completed_at = NOW(),
              updated_at = NOW()
          `

          // Audit log
          await db.queryObject`
            INSERT INTO audit_log (user_id, action, resource_type, details, created_at)
            VALUES (${userId}, 'payment_completed', 'payment', ${JSON.stringify({
              payment_intent_id: paymentIntent.id,
              amount: paymentIntent.amount / 100,
            })}, NOW())
          `
        }

        console.log(`[stripe-webhook] Payment succeeded: ${paymentIntent.id}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const userId = paymentIntent.metadata?.userId

        await db.queryObject`
          UPDATE payments SET
            status = 'failed'
          WHERE stripe_payment_id = ${paymentIntent.id}
        `

        if (userId) {
          await db.queryObject`
            INSERT INTO audit_log (user_id, action, resource_type, details, created_at)
            VALUES (${userId}, 'payment_failed', 'payment', ${JSON.stringify({
              payment_intent_id: paymentIntent.id,
              error: paymentIntent.last_payment_error?.message,
            })}, NOW())
          `
        }

        console.log(`[stripe-webhook] Payment failed: ${paymentIntent.id}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string

        await db.queryObject`
          UPDATE payments SET
            status = 'refunded'
          WHERE stripe_payment_id = ${paymentIntentId}
        `

        console.log(`[stripe-webhook] Charge refunded for: ${paymentIntentId}`)
        break
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }

    await db.end()
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[stripe-webhook] Error processing webhook:', error)
    if (db) {
      try { await db.end() } catch { /* ignore */ }
    }
    return new Response('Webhook handler failed', { status: 500 })
  }
})
