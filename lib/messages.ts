import type { Customer, VinoraSavedEvent } from '@/types/customer'
import { fmt } from './rfm'

const RELATED: Record<string, string> = {
  'Riesling': 'Grauburgunder', 'Grauburgunder': 'Riesling', 'Spätburgunder': 'Lemberger',
  'Lemberger': 'Spätburgunder', 'Gewürztraminer': 'Muskateller', 'Muskateller': 'Gewürztraminer',
  'Sekt Brut': 'Riesling', 'Silvaner': 'Riesling', 'Dornfelder': 'Lemberger',
}

const TEMPLATES_A: Record<string, string> = {
  'Persönliche Einladung': 'Liebe/r [Vorname],\n\nals einer unserer geschätztesten Kunden möchten wir Sie herzlich zu unserer exklusiven Jahrgangspäsentation einladen. Als Erster erhalten Sie die Möglichkeit, unsere neuesten [Lieblingssorte]-Abfüllungen zu verkosten.\n\nIch würde mich freuen, Sie persönlich begrüßen zu dürfen.\n\nMit herzlichen Grüßen',
  'VIP-Angebot': 'Liebe/r [Vorname],\n\nder neue [Lieblingssorte]-Jahrgang ist abgefüllt – und wie immer möchten wir Sie als treuen Kunden als Ersten informieren, bevor er allgemein verfügbar ist.\n\nDarf ich Ihnen ein Angebot zukommen lassen?\n\nMit herzlichen Grüßen',
  'Treue-Anerkennung': 'Liebe/r [Vorname],\n\nwir möchten uns herzlich für Ihre treue Verbundenheit bedanken. Als kleines Dankeschön legen wir Ihrer nächsten Bestellung eine Flasche [Lieblingssorte] dazu – ganz ohne Aufpreis.\n\nMit herzlichen Grüßen',
  'Sofort: Persönlicher Anruf': '[KEIN TEXT – PER SÖNLICHER ANRUF]\n\nGesprächsleitfaden:\n– Erkundigen wie es geht\n– Ob alles mit der letzten Bestellung ok war\n– Ob sich der Geschmack verändert hat\n– NICHT sofort verkaufen\n– Zum Schluss: Einladung zur nächsten Weinprobe\n\nGeschätzter CLV: [CLV] – dieser Kunde ist es wert.',
  'Cross-Sell Empfehlung': 'Liebe/r [Vorname],\n\nda Sie unseren [Lieblingssorte] so schätzen, möchte ich Ihnen unseren [RelatedWein] ans Herz legen – gleiches Terroir, etwas anderer Charakter.\n\nDarf ich Ihnen eine kleine Probe schicken?\n\nMit herzlichen Grüßen',
  'Reaktivierung mit Probe': 'Liebe/r [Vorname],\n\nwir haben Sie eine Weile nicht gehört und würden uns freuen, Sie wieder bei uns zu begrüßen. Darf ich Ihnen eine Flasche unseres neuen [Lieblingssorte]-Jahrgangs zur Probe schicken – ganz ohne Verpflichtung?\n\nMit herzlichen Grüßen',
  'Reaktivierung mit Rabatt': 'Liebe/r [Vorname],\n\nwir würden Sie gerne wieder bei uns begrüßen. Als Willkommensgeschenk für Ihre Rückkehr erhalten Sie 10 % auf Ihre nächste Bestellung – unser neuer [Lieblingssorte] wartet auf Sie.\n\nMit herzlichen Grüßen',
  'Persönliche Reaktivierung': 'Liebe/r [Vorname],\n\nes ist eine Weile her – wir denken an Sie. Würden Sie uns wieder besuchen? Wir würden uns freuen, Ihnen unsere neuesten Abfüllungen zu zeigen.\n\nEine Flasche [Lieblingssorte] hält für Sie bereit.\n\nMit herzlichen Grüßen',
  'Letzte Chance': 'Liebe/r [Vorname],\n\nwir laden Sie herzlich zu unserem Weingutsfest ein. Kein Kaufzwang – einfach vorbeikommen, neue Jahrgänge probieren und alte Bekannte wiedersehen.\n\nMit herzlichen Grüßen',
  'Newsletter + Rabatt': 'Liebe/r [Vorname],\n\nder [Kaufsaison] steht vor der Tür – und mit ihm unser frischer [Lieblingssorte]-Jahrgang. Als Stammkunde erhalten Sie 5 % Frühbestellrabatt.\n\nWir freuen uns auf Ihre Bestellung.\n\nMit herzlichen Grüßen',
  'Kundenbindung aufbauen': 'Liebe/r [Vorname],\n\nschön dass Sie zu unseren Kunden gehören. Wir würden Sie gerne besser kennenlernen – beim nächsten Besuch erwartet Sie ein kleines Willkommensgeschenk und eine persönliche Sortenberatung.\n\nMit herzlichen Grüßen',
  'Förderung + Weinprobe': 'Liebe/r [Vorname],\n\nwir freuen uns sehr über Ihre regelmäßigen Bestellungen und möchten Sie herzlich zu einer privaten Weinprobe einladen – nur für ausgewählte Kunden.\n\nMit herzlichen Grüßen',
}

const TEMPLATES_B: Record<string, string> = {
  'Persönliche Einladung': 'Hallo [Vorname],\n\nkurze Nachricht: Unser neuer [Lieblingssorte]-Jahrgang ist bereit – und Sie sind der Erste, dem ich davon erzähle. Ich würde Sie gerne persönlich zur Verkostung einladen.\n\nWann passt es Ihnen?',
  'VIP-Angebot': 'Hallo [Vorname],\n\nfür ausgewählte Kunden reserviere ich jedes Jahr ein paar Kisten des neuen [Lieblingssorte], bevor er offiziell verkauft wird. Dieses Jahr denke ich dabei an Sie.\n\nSoll ich Ihnen ein Angebot schicken?',
  'Treue-Anerkennung': 'Hallo [Vorname],\n\nSie sind einer unserer treuesten Kunden – und das schätzen wir sehr. Ihrer nächsten Bestellung lege ich eine Flasche [Lieblingssorte] als Dankeschön dazu.',
  'Sofort: Persönlicher Anruf': '[KEIN TEXT – PERSÖNLICHER ANRUF]\n\nFokus Gespräch:\n– Wie läuft\'s? Irgendwas mit letzter Lieferung nicht gepasst?\n– Was trinken Sie gerade gerne?\n– NICHT verkaufen – zuhören\n– Einladung zur nächsten Probe am Ende\n\nCLV dieser Person: [CLV]',
  'Cross-Sell Empfehlung': 'Hallo [Vorname],\n\nwer unseren [Lieblingssorte] mag, dem gefällt oft auch der [RelatedWein] – ähnlich, aber mit eigenem Charakter. Ich schicke Ihnen gerne eine Probe, damit Sie selbst entscheiden können.',
  'Reaktivierung mit Probe': 'Hallo [Vorname],\n\nes ist eine Weile her – wie geht es Ihnen? Ich schicke Ihnen gerne eine Flasche unseres neuen [Lieblingssorte] zu, einfach so, damit wir wieder in Kontakt kommen.',
  'Reaktivierung mit Rabatt': 'Hallo [Vorname],\n\nwir würden uns freuen, Sie wieder bei uns zu haben. Mit dem Code WILLKOMMEN10 bekommen Sie 10 % auf Ihre nächste Bestellung. Unser neuer [Lieblingssorte] wartet auf Sie.',
  'Persönliche Reaktivierung': 'Hallo [Vorname],\n\nwir haben Sie vermisst. Ich würde mich sehr freuen, wenn Sie uns wieder besuchen würden – ich lege eine Flasche [Lieblingssorte] für Sie zurück.',
  'Letzte Chance': 'Hallo [Vorname],\n\nwir laden Sie herzlich ein – kein Programm, kein Verkaufsgespräch. Einfach vorbeikommen, neue Jahrgänge probieren.',
  'Newsletter + Rabatt': 'Hallo [Vorname],\n\n[Kaufsaison] ist da – und unser frischer [Lieblingssorte]-Jahrgang auch. Als Stammkunde: 5 % Rabatt auf Ihre nächste Bestellung, einfach bis Ende des Monats bestellen.',
  'Kundenbindung aufbauen': 'Hallo [Vorname],\n\nschön, dass Sie bei uns sind! Beim nächsten Besuch lade ich Sie auf eine persönliche Sortenberatung ein – und ein kleines Willkommensgeschenk wartet auch.',
  'Förderung + Weinprobe': 'Hallo [Vorname],\n\nwir schätzen Ihre regelmäßigen Bestellungen sehr. Ich würde Sie gerne zu einer kleinen privaten Weinprobe einladen – exklusiv, nur für ein paar ausgewählte Kunden.',
}

export function buildMessage(
  c: Customer,
  matchingEvents: VinoraSavedEvent[] = [],
  customTemplatesA: Record<string, string> = {},
  customTemplatesB: Record<string, string> = {},
  abTestingEnabled = true
): string {
  const fn = c.vorname
  const ls = c.lieblingssorte
  const ks = c.kaufsaison
  const clv = fmt(c.clv)
  const related = RELATED[ls] || 'Grauburgunder'
  const firstEvent = matchingEvents[0]

  const useB = abTestingEnabled && c.abGroup === 'B'
  const templates = useB ? TEMPLATES_B : TEMPLATES_A
  const customOverrides = useB ? customTemplatesB : customTemplatesA
  const customText = customOverrides[c.massnahmenTyp]

  let msg = customText
    ? customText.replace(/\[Vorname\]/g, fn).replace(/\[Lieblingssorte\]/g, ls).replace(/\[Kaufsaison\]/g, ks).replace(/\[CLV\]/g, clv)
    : (templates[c.massnahmenTyp] || templates['Förderung + Weinprobe'])
        .replace(/\[Vorname\]/g, fn)
        .replace(/\[Lieblingssorte\]/g, ls)
        .replace(/\[Kaufsaison\]/g, ks)
        .replace(/\[CLV\]/g, clv)
        .replace(/\[RelatedWein\]/g, related)

  if (firstEvent) {
    msg += `\n\nPS: Am ${firstEvent.datum} findet in ${firstEvent.ort} „${firstEvent.name}“ statt – vielleicht eine schöne Gelegenheit, unseren ${ls} für den Anlass zu bestellen?`
  }
  return msg
}

export const ALL_ACTION_TYPES = Object.keys(TEMPLATES_A)
