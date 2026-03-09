async function verifyPaymentReference(payload) {
  const endpoint = import.meta.env.VITE_PAYMENT_VERIFY_API_URL;

  if (!endpoint) {
    return {
      enabled: false,
      status: 'Pending Review',
      reason: 'Auto-verification API not configured.',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        enabled: true,
        status: 'Pending Review',
        reason: `Verification API returned ${response.status}.`,
      };
    }

    const result = await response.json();

    if (result?.verified) {
      return {
        enabled: true,
        status: 'Verified',
        reason: result?.reason || 'Reference number verified by API.',
      };
    }

    return {
      enabled: true,
      status: 'Needs Review',
      reason: result?.reason || 'Reference number was not auto-verified.',
    };
  } catch {
    return {
      enabled: true,
      status: 'Pending Review',
      reason: 'Verification API unavailable. Sent to admin review queue.',
    };
  }
}

export { verifyPaymentReference };
