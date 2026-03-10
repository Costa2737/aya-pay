export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://aya-academy.ru');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tariff } = req.body;

  const tariffs = {
    basic:    { amount: '690.00',  description: 'Курс «ИИ для детей» — Базовый тариф' },
    advanced: { amount: '990.00',  description: 'Курс «ИИ для взрослых» — Продвинутый тариф' },
    expert:   { amount: '1390.00', description: 'Курс «ИИ для бизнеса» — Экспертный тариф' },
  };

  const selected = tariffs[tariff];
  if (!selected) return res.status(400).json({ error: 'Unknown tariff' });

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;
  const idempotenceKey = `${tariff}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: { value: selected.amount, currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          // Передаём тариф в return_url чтобы сайт знал какой курс открыть
          return_url: `https://aya-academy.ru/?payment=success&tariff=${tariff}`,
        },
        capture: true,
        description: selected.description,
        metadata: { tariff },
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Payment creation failed', details: data });
    return res.status(200).json({ confirmationUrl: data.confirmation.confirmation_url });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
