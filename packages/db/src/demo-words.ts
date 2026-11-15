import type { SampleItem, SampleTexts } from './sample-rentals.ts'

// What a demo shop is written in. The figures, the kinds and the order are the demo's own (demo-shop.ts); these are
// only its words, so a visitor who reads French meets a shop in French. The web app gives them from its messages.
export type DemoWords = {
  // The language its two people are registered in.
  readonly language: string
  // One for each entry of the demo's price list, in its order.
  readonly prices: readonly string[]
  // The bike and the car a visitor can book, each with one label for each view of its plan, in its order.
  readonly bike: { readonly name: string; readonly views: readonly string[] }
  readonly car: { readonly name: string; readonly views: readonly string[] }
  readonly dropPoint: string
  readonly wearPolicy: string
  readonly sampleItems: Readonly<Record<SampleItem, string>>
  // What the sample rentals' people wrote and what their findings say.
  readonly sampleTexts: SampleTexts
}

// The demo's words in the languages the site is written in, beside English (DEMO_WORDS in demo-shop.ts). Each list
// follows the demo's own order: the price list's entries, then each plan's views. demo-words.test.ts counts them.
const CAR_VIEWS = {
  fr: ['Avant', 'Arrière', 'Côté gauche', 'Côté droit', 'Angle avant gauche', 'Angle avant droit', 'Angle arrière gauche', 'Angle arrière droit', 'Roue avant gauche', 'Roue avant droite', 'Roue arrière gauche', 'Roue arrière droite', 'Pare-brise', 'Lunette arrière', 'Toit', 'Sièges avant', 'Sièges arrière', 'Coffre', 'Tableau de bord, avec kilométrage et carburant'],
  de: ['Vorne', 'Hinten', 'Linke Seite', 'Rechte Seite', 'Ecke vorne links', 'Ecke vorne rechts', 'Ecke hinten links', 'Ecke hinten rechts', 'Rad vorne links', 'Rad vorne rechts', 'Rad hinten links', 'Rad hinten rechts', 'Windschutzscheibe', 'Heckscheibe', 'Dach', 'Vordersitze', 'Rücksitze', 'Kofferraum', 'Armaturenbrett, mit Kilometerstand und Tankfüllung'],
  es: ['Delantera', 'Trasera', 'Lado izquierdo', 'Lado derecho', 'Esquina delantera izquierda', 'Esquina delantera derecha', 'Esquina trasera izquierda', 'Esquina trasera derecha', 'Rueda delantera izquierda', 'Rueda delantera derecha', 'Rueda trasera izquierda', 'Rueda trasera derecha', 'Parabrisas', 'Luneta trasera', 'Techo', 'Asientos delanteros', 'Asientos traseros', 'Maletero', 'Salpicadero, con kilómetros y combustible'],
} as const

export const TRANSLATED_DEMO_WORDS: Readonly<Record<'fr' | 'de' | 'es', DemoWords>> = {
  fr: {
    language: 'fr',
    prices: [
      'Rayure sur la carrosserie, jusqu’à la tôle',
      'Bosse sur un élément de carrosserie',
      'Éclat sur le pare-brise',
      'Vitre fêlée ou brisée',
      'Clé perdue',
      'Retour en retard, par jour entamé',
      'Nettoyage après un retour sale',
      'Chaque kilomètre au-delà de ceux inclus',
      'Chaque huitième de réservoir manquant',
      'Rayure sur le cadre, jusqu’au métal',
      'Patte de dérailleur arrière tordue',
      'Antivol perdu',
      'Éclairage avant perdu',
      'Nettoyage après une sortie boueuse',
    ],
    bike: { name: 'Vélo de ville', views: ['Cadre, côté transmission', 'Roue avant', 'Roue arrière'] },
    car: { name: 'Citadine', views: CAR_VIEWS.fr },
    dropPoint: 'Place 4 derrière le bureau, ou le râtelier fermé à gauche de la porte pour un vélo. Laissez la clé dans la boîte à clés, avec le code de votre réservation.',
    wearPolicy:
      'Les éclats plus petits qu’une pièce de monnaie, les légères traces sur les pneus et les enjoliveurs, et l’usure normale des sièges et des pédales ne sont jamais facturés. Une marque déjà notée à la remise n’est jamais facturée de nouveau.',
    sampleItems: { hatchback: 'Compacte', saloon: 'Berline', scooter: 'Scooter 125', estate: 'Break', seat: 'Siège enfant', suv: 'SUV', ebike: 'Vélo électrique' },
    sampleTexts: {
      contestReply: 'La clé n’a jamais été perdue : elle était dans la boîte à gants quand j’ai rendu la voiture.',
      renterMessage: 'La clé était dans la boîte à gants, sous le manuel. Quelqu’un peut-il vérifier ?',
      shopMessage: 'Merci, nous allons vérifier la boîte à gants et les photos du retour, et nous déciderons avant la date indiquée ci-dessus.',
      sampleReason: 'Donnée d’exemple, ajoutée pour montrer à quoi ressemble une réclamation.',
      cleaningReason: { car: 'Donnée d’exemple : de la boue sur les tapis et les seuils au retour.', bike: 'Donnée d’exemple : de la boue sur la chaîne et le cadre au retour, nettoyée au comptoir.' },
      marks: {
        car: {
          scuffMark: 'Une légère éraflure au bas de la portière arrière.',
          scuffFinding: 'La légère éraflure au bas de la portière arrière, notée à la remise. Elle n’est pas facturée de nouveau.',
          chipFinding: 'Un éclat de peinture sur la portière arrière, jusqu’à la tôle. Il n’y était pas à la remise.',
        },
        bike: {
          scuffMark: 'Une légère éraflure sur le tube diagonal.',
          scuffFinding: 'La légère éraflure sur le tube diagonal, notée à la remise. Elle n’est pas facturée de nouveau.',
          chipFinding: 'Un éclat de peinture sur le tube diagonal, jusqu’au métal. Il n’y était pas à la remise.',
        },
      },
    },
  },
  de: {
    language: 'de',
    prices: [
      'Kratzer in der Karosserie, bis auf das Blech',
      'Delle in einem Karosserieteil',
      'Steinschlag in der Windschutzscheibe',
      'Gesprungenes oder zerbrochenes Glas',
      'Verlorener Schlüssel',
      'Verspätete Rückgabe, je angefangenem Tag',
      'Reinigung nach schmutziger Rückgabe',
      'Jeder Kilometer über die inklusiven hinaus',
      'Jedes fehlende Achtel Tankfüllung',
      'Kratzer am Rahmen, bis auf das Metall',
      'Verbogenes Schaltauge hinten',
      'Verlorenes Schloss',
      'Verlorenes Vorderlicht',
      'Reinigung nach einer Schlammfahrt',
    ],
    bike: { name: 'Stadtrad', views: ['Rahmen, Antriebsseite', 'Vorderrad', 'Hinterrad'] },
    car: { name: 'Kleinwagen', views: CAR_VIEWS.de },
    dropPoint: 'Stellplatz 4 hinter dem Büro, oder für ein Fahrrad der abgeschlossene Ständer links neben der Tür. Legen Sie den Schlüssel in den Schlüsselkasten, mit dem Code aus Ihrer Buchung.',
    wearPolicy:
      'Steinschläge, die kleiner sind als eine Münze, leichte Spuren an Reifen und Radkappen und die normale Abnutzung von Sitzen und Pedalen werden nie berechnet. Eine Spur, die bei der Übergabe schon vermerkt war, wird nie erneut berechnet.',
    sampleItems: { hatchback: 'Kompaktwagen', saloon: 'Limousine', scooter: 'Roller 125', estate: 'Kombi', seat: 'Kindersitz', suv: 'SUV', ebike: 'E-Bike' },
    sampleTexts: {
      contestReply: 'Der Schlüssel war nie verloren: Er lag im Handschuhfach, als ich das Auto zurückgab.',
      renterMessage: 'Der Schlüssel lag im Handschuhfach, unter dem Handbuch. Könnte jemand dort nachsehen?',
      shopMessage: 'Danke, wir prüfen das Handschuhfach und die Fotos der Rückgabe und entscheiden vor dem oben genannten Datum.',
      sampleReason: 'Beispieldaten, hinzugefügt, um zu zeigen, wie eine Forderung aussieht.',
      cleaningReason: { car: 'Beispieldaten: Schlamm auf den Fußmatten und den Schwellern bei der Rückgabe.', bike: 'Beispieldaten: Schlamm an Kette und Rahmen bei der Rückgabe, am Tresen gereinigt.' },
      marks: {
        car: {
          scuffMark: 'Eine leichte Schramme unten an der hinteren Tür.',
          scuffFinding: 'Die leichte Schramme unten an der hinteren Tür, bei der Übergabe vermerkt. Sie wird nicht erneut berechnet.',
          chipFinding: 'Ein Lackabplatzer an der hinteren Tür, bis auf das blanke Blech. Bei der Übergabe war er nicht da.',
        },
        bike: {
          scuffMark: 'Eine leichte Schramme am Unterrohr.',
          scuffFinding: 'Die leichte Schramme am Unterrohr, bei der Übergabe vermerkt. Sie wird nicht erneut berechnet.',
          chipFinding: 'Ein Lackabplatzer am Unterrohr, bis auf das blanke Metall. Bei der Übergabe war er nicht da.',
        },
      },
    },
  },
  es: {
    language: 'es',
    prices: [
      'Arañazo en la carrocería, hasta la chapa',
      'Abolladura en un panel de la carrocería',
      'Impacto de piedra en el parabrisas',
      'Cristal agrietado o roto',
      'Llave perdida',
      'Devolución tardía, por día empezado',
      'Limpieza tras una devolución sucia',
      'Cada kilómetro más allá de los incluidos',
      'Cada octavo de depósito que falte',
      'Arañazo en el cuadro, hasta el metal',
      'Patilla del cambio trasero doblada',
      'Candado perdido',
      'Luz delantera perdida',
      'Limpieza tras una salida con barro',
    ],
    bike: { name: 'Bici de ciudad', views: ['Cuadro, lado de la transmisión', 'Rueda delantera', 'Rueda trasera'] },
    car: { name: 'Utilitario', views: CAR_VIEWS.es },
    dropPoint: 'Plaza 4 detrás de la oficina, o el aparcabicis cerrado a la izquierda de la puerta para una bici. Deja la llave en la caja de llaves, con el código de tu reserva.',
    wearPolicy:
      'Los impactos más pequeños que una moneda, los roces leves en neumáticos y tapacubos y el desgaste normal de asientos y pedales nunca se cobran. Una marca ya anotada en la entrega nunca se cobra de nuevo.',
    sampleItems: { hatchback: 'Compacto', saloon: 'Berlina', scooter: 'Scooter 125', estate: 'Familiar', seat: 'Silla infantil', suv: 'SUV', ebike: 'Bici eléctrica' },
    sampleTexts: {
      contestReply: 'La llave nunca se perdió: estaba en la guantera cuando devolví el coche.',
      renterMessage: 'La llave estaba en la guantera, debajo del manual. ¿Puede mirar alguien ahí?',
      shopMessage: 'Gracias, revisaremos la guantera y las fotos de la devolución, y decidiremos antes de la fecha indicada arriba.',
      sampleReason: 'Datos de ejemplo, añadidos para mostrar cómo es una reclamación.',
      cleaningReason: { car: 'Datos de ejemplo: barro en las alfombrillas y los umbrales en la devolución.', bike: 'Datos de ejemplo: barro en la cadena y el cuadro en la devolución, limpiado en el mostrador.' },
      marks: {
        car: {
          scuffMark: 'Un roce leve en la parte baja de la puerta trasera.',
          scuffFinding: 'El roce leve en la parte baja de la puerta trasera, anotado en la entrega. No se cobra de nuevo.',
          chipFinding: 'Un desconchón en la pintura de la puerta trasera, hasta la chapa. No estaba en la entrega.',
        },
        bike: {
          scuffMark: 'Un roce leve en el tubo diagonal.',
          scuffFinding: 'El roce leve en el tubo diagonal, anotado en la entrega. No se cobra de nuevo.',
          chipFinding: 'Un desconchón en la pintura del tubo diagonal, hasta el metal. No estaba en la entrega.',
        },
      },
    },
  },
}
