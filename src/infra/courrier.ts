// Lire un mail brut (RFC 5322, MIME) avec postal-mime (décision 008) : l'expéditeur de l'en-tête,
// le sujet, le texte, et le premier en-tête Authentication-Results (le plus haut, donc le dernier
// posé, celui du serveur qui a reçu le mail).
import PostalMime from 'postal-mime';

export interface MailLu {
  readonly de: string | null;
  readonly sujet: string | null;
  readonly texte: string | null;
  readonly resultats: string | null;
}

export async function lireMail(brut: ReadableStream<Uint8Array> | ArrayBuffer | string): Promise<MailLu> {
  const mail = await PostalMime.parse(brut);
  const de = mail.from && 'address' in mail.from && mail.from.address ? mail.from.address : null;
  const resultats = mail.headers.find((h) => h.key === 'authentication-results')?.value ?? null;
  const texte = mail.text ?? (mail.html ? texteDuHtml(mail.html) : null);
  return { de, sujet: mail.subject ?? null, texte, resultats };
}

/** Un mail seulement en HTML : le texte, sans balises, avec un saut de ligne par paragraphe. */
function texteDuHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
