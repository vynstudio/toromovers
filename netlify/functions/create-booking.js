// netlify/functions/create-booking.js
// Handles $50 deposit charge for Toro Movers bookings

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': 'https://toromovers.net',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { paymentMethodId, priceId, customer } = JSON.parse(event.body);

    if (!paymentMethodId || !priceId || !customer) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Create or retrieve Stripe customer
    const stripeCustomer = await stripe.customers.create({
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      metadata: {
        service:      customer.service,
        from_address: customer.fromAddr,
        to_address:   customer.toAddr,
        move_date:    customer.date,
        move_time:    customer.time,
        movers:       customer.movers || 'N/A',
        notes:        customer.notes || ''
      }
    });

    // Create PaymentIntent for $50 (5000 cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000,
      currency: 'usd',
      customer: stripeCustomer.id,
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `Toro Movers — ${customer.service} Deposit`,
      receipt_email: customer.email,
      metadata: {
        service:      customer.service,
        from_address: customer.fromAddr,
        to_address:   customer.toAddr,
        move_date:    customer.date,
        move_time:    customer.time,
        movers:       customer.movers || 'N/A',
        notes:        customer.notes || '',
        price_id:     priceId
      }
    });

    // Handle 3D Secure / requires_action
    if (paymentIntent.status === 'requires_action') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret
        })
      };
    }

    if (paymentIntent.status === 'succeeded') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'succeeded',
          paymentIntentId: paymentIntent.id,
          customerId: stripeCustomer.id
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Payment did not complete. Please try again.' })
    };

  } catch (err) {
    console.error('Stripe error:', err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: err.message || 'Payment failed. Please try again.' })
    };
  }
};
