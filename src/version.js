/* Fassung und Ausgabe – zwei Angaben, die das ganze Spiel betreffen.

   APP_VERSION steigt bei jeder Auslieferung um eins. Der Service Worker leitet daraus den Namen
   seines Speichers ab, der Startbildschirm zeigt sie klein an: So lässt sich beim Nachfragen
   sofort sagen, welcher Stand gerade läuft.

   VORSCHAU sagt, ob dieser Stand die Vorschau ist. Erkannt wird das am Pfad: Die Vorschau liegt
   unter …/vorschau/, das fertige Spiel darüber. Beide liegen auf derselben Adresse und teilen
   sich damit den Browser-Speicher – deshalb bekommt die Vorschau eigene Schlüssel und eigene
   Themen beim Vermittler. Sonst würde ein Testlauf die echten Rekorde der Freunde überschreiben
   oder man landete versehentlich in ihrem Spielraum.

   Diese Datei wird sowohl von der Seite als auch vom Service Worker geladen (importScripts),
   darum steht hier nichts, was ein Fenster braucht. */
const APP_VERSION = 70;

/* location gibt es in der Seite und im Service Worker – in beiden Fällen mit dem Pfad, unter dem
   die Datei liegt. Fehlt es (etwa beim Prüfen mit Node), gilt „kein Vorschau-Stand". */
const VORSCHAU = (() => {
  try { return /(^|\/)vorschau\//.test(location.pathname || ''); } catch (e) { return false; }
})();

/* Marke für alles, was Spiel und Vorschau getrennt halten müssen */
const APP_MARKE = VORSCHAU ? 'vorschau' : 'spiel';
/* Vorsatz für Einträge im Browser-Speicher: fantasygolf.name bzw. fantasygolf.vorschau.name */
const SPEICHER_VORSATZ = VORSCHAU ? 'fantasygolf.vorschau.' : 'fantasygolf.';
/* Schlüssel im Browser-Speicher – immer über diese Funktion, nie von Hand zusammengesetzt */
const speicherSchluessel = name => SPEICHER_VORSATZ + name;
