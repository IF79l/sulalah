/**
 * The WhatsApp message templates, ready for Meta. Without --submit it prints them as Meta's
 * API takes them (also what to type in WhatsApp Manager by hand); with --submit it sends each
 * to the Sulalah WhatsApp Business Account for approval. The button links use the app's
 * domain, so run it once per domain.
 *
 *   NEXT_PUBLIC_APP_URL=https://sulalah.sa pnpm whatsapp:templates
 *   NEXT_PUBLIC_APP_URL=https://sulalah.sa WHATSAPP_TOKEN=... \
 *   WHATSAPP_BUSINESS_ACCOUNT_ID=... pnpm whatsapp:templates --submit
 */
import { metaTemplates, submitTemplates, whatsappConfig } from '@sulalah/messaging';

async function main() {
  const config = whatsappConfig(process.env);
  if (config.appUrl.includes('localhost') && process.argv.includes('--submit'))
    throw new Error('set NEXT_PUBLIC_APP_URL to the real domain: Meta keeps it in every button');
  const list = metaTemplates(config.appUrl, config.language, config.names);
  if (!process.argv.includes('--submit')) {
    console.log(JSON.stringify(list, null, 2));
    return;
  }
  for (const r of await submitTemplates(config, list))
    console.log(`${r.ok ? 'sent ' : 'error'} ${r.name}: ${r.answer}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
