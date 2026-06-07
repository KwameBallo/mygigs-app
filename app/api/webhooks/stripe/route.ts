import { NextResponse } from "next/server"

// Stripe Connect webhook (M4). Verify the signature against
// STRIPE_WEBHOOK_SECRET, then update payments/bookings server-side.
export async function POST() {
  return NextResponse.json(
    { error: "Stripe webhook not implemented yet" },
    { status: 501 },
  )
}
