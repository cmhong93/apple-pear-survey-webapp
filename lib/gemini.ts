export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

export async function runGeminiVisionStub() {
  return {
    configured: isGeminiConfigured(),
    summary: isGeminiConfigured()
      ? 'Gemini is configured but not connected in MVP foundation.'
      : 'Gemini is not configured. Vision QA remains a safe stub.',
  }
}
