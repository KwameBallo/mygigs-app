const nl = {
  back: "← Terug naar boekingen",
  title: "Review voor {dj}",
  subtitle:
    "Je feedback helpt {dj} verder en helpt andere organisatoren bij hun keuze.",
  ratingLabel: "Je beoordeling",
  ratingHint: "Kies 1 tot 5 sterren",
  commentLabel: "Toelichting (optioneel)",
  commentPlaceholder: "Hoe was het optreden? Wat viel op?",
  submit: "Review plaatsen",
  submitting: "Versturen…",
  errRating: "Kies een aantal sterren (1–5).",
  errGeneric: "Er ging iets mis. Probeer het later opnieuw.",
  alreadyTitle: "Je hebt al een review geplaatst",
  alreadyBody: "Bedankt! Per boeking kun je één review achterlaten.",
  notYetTitle: "Nog niet te reviewen",
  notYetBody:
    "Je kunt een review plaatsen zodra het optreden heeft plaatsgevonden.",
}

const en: typeof nl = {
  back: "← Back to bookings",
  title: "Review for {dj}",
  subtitle:
    "Your feedback helps {dj} grow and helps other organisers choose.",
  ratingLabel: "Your rating",
  ratingHint: "Pick 1 to 5 stars",
  commentLabel: "Comment (optional)",
  commentPlaceholder: "How was the performance? What stood out?",
  submit: "Submit review",
  submitting: "Sending…",
  errRating: "Please pick a number of stars (1–5).",
  errGeneric: "Something went wrong. Please try again later.",
  alreadyTitle: "You've already left a review",
  alreadyBody: "Thanks! You can leave one review per booking.",
  notYetTitle: "Not reviewable yet",
  notYetBody: "You can leave a review once the performance has taken place.",
}

export const dict = { nl, en }

export type Dict = typeof nl
