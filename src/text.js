/* Alles, was Menschen eintippen oder was von fremden Geräten hereinkommt, geht hier durch.

   Warum an einer Stelle: Namen, Bahnnamen und Spielernamen tauchen an vielen Stellen in der
   Anzeige auf – im Kopf, auf den Ergebnistafeln, in der Rangliste, im Warteraum. Wären die
   Regeln überall einzeln hingeschrieben, würde früher oder später eine Stelle vergessen. Darum
   gibt es genau eine Stelle, die entscheidet, was ein Name sein darf.

   Zwei Verteidigungslinien:
   1. Beim Hereinkommen wird gefiltert (name, label): nur erlaubte Zeichen bleiben übrig, alles
      andere fällt weg. Damit kann ein Name schon im Speicher kein Markup mehr enthalten.
   2. Beim Anzeigen wird zusätzlich entschärft (esc), falls doch einmal etwas an der ersten Linie
      vorbeikommt – etwa aus einer alten gespeicherten Datei oder von einem Gerät mit anderer
      Fassung. Doppelt hält besser.

   Grundsatz: Ein Name ist ein Name, kein Markup und kein Programm. */
const Text = (() => {
  const NAME_MAX = 16;      // reicht für Vornamen und Spitznamen
  const LABEL_MAX = 24;     // Bahnnamen dürfen etwas länger sein

  /* Buchstaben (auch Umlaute und andere Sprachen), Ziffern, Leerzeichen, Strich und Unterstrich */
  const NAME_ERLAUBT = /[^\p{L}\p{N} \-_]/gu;
  /* Für Bahnnamen zusätzlich die üblichen Satzzeichen – „Der Tempel (innen)" soll gehen */
  const LABEL_ERLAUBT = /[^\p{L}\p{N} \-_.,:!?()']/gu;

  const kuerzen = (v, max, muster) => String(v == null ? '' : v)
    .replace(muster, '')          // alles Unerlaubte entfernen
    .replace(/\s+/g, ' ')         // Zeilenumbrüche und Mehrfach-Leerzeichen zusammenfassen
    .trim()
    .slice(0, max)
    .trim();

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  return {
    NAME_MAX, LABEL_MAX,
    /* Spielername: kurz und ohne Sonderzeichen */
    name: v => kuerzen(v, NAME_MAX, NAME_ERLAUBT),
    /* Beschriftung wie ein Bahnname */
    label: (v, max = LABEL_MAX) => kuerzen(v, max, LABEL_ERLAUBT),
    /* Letzte Verteidigungslinie: entschärft die fünf Zeichen, die in HTML eine Bedeutung haben */
    esc: v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ESC[c]),
    /* Text in ein Element setzen, ohne dass er als HTML gelesen wird */
    set(el, v) { if (el) el.textContent = String(v == null ? '' : v); return el; },
  };
})();
