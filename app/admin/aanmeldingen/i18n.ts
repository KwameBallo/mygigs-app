const nl = {
  title: "DJ-aanmeldingen",
  subtitle:
    "Alles wat binnenkomt voor een nieuw DJ-profiel. Niets gaat live zonder dat jij het hebt nagekeken.",
  backToDashboard: "Terug naar dashboard",

  tabOpen: "Open",
  tabApproved: "Goedgekeurd",
  tabRejected: "Afgewezen",
  tabClaimed: "Opgeëist",
  empty: "Hier staat nog niets.",

  sourceEmail: "Mail",
  sourceInstagram: "Instagram",
  sourceForm: "Formulier",
  sourceManual: "Zelf toegevoegd",

  statusNew: "Nieuw",
  statusReviewing: "In behandeling",
  statusApproved: "Goedgekeurd",
  statusRejected: "Afgewezen",
  statusClaimed: "Opgeëist",

  noName: "Naam nog onbekend",
  selfSubmitted: "Zelf aangemeld",
  foundByAdmin: "Door ons gevonden",

  addTitle: "DJ toevoegen",
  addIntro:
    "Plak hier alles wat je van een DJ hebt: een Instagram-bio, een mail, een WhatsApp-bericht, links. De bot haalt de gegevens eruit, jij kijkt ze daarna na.",
  addRawLabel: "Wat heb je van deze DJ?",
  addRawPlaceholder:
    "DJ Voorbeeld | Afro & Amapiano | Rotterdam\nBookings: boekingen@voorbeeld.nl\nsoundcloud.com/voorbeeld",
  addSourceLabel: "Waar komt dit vandaan?",
  addSourcePlaceholder: "Bijvoorbeeld: instagram.com/djvoorbeeld, of: WhatsApp aan Kwame op 21 september",
  addSourceHint:
    "Verplicht. Als de DJ later vraagt hoe we aan zijn gegevens komen, moet je dat kunnen laten zien.",
  addSelfLabel: "De DJ heeft dit zelf naar ons gestuurd",
  addSelfHint:
    "Aanvinken als de DJ zelf contact opnam, bijvoorbeeld via WhatsApp of in persoon. Niet aanvinken als je hem zelf hebt opgezocht.",
  addBtn: "Toevoegen en uitlezen",
  addBusy: "Bezig met uitlezen…",
  reextractBtn: "Opnieuw uitlezen",
  reextractBusy: "Bezig…",
  reextractHint: "Leest het bericht opnieuw en overschrijft de velden rechts.",
  aiOffTitle: "De AI deed niet mee. Reden:",
  msgReextracted: "Opnieuw uitgelezen.",
  msgReextractedNoAi: "Opnieuw uitgelezen, maar zonder AI. De reden staat links.",

  msgAdded: "Toegevoegd. Kijk de gegevens hieronder na.",
  msgDuplicate:
    "Er staat al een open aanmelding met dit e-mailadres of deze Instagram-naam.",
  msgSaved: "Opgeslagen.",
  msgApproved: "Goedgekeurd.",
  msgRejected: "Afgewezen.",
  msgReopened: "Weer opengezet.",
  msgNeedName: "Vul eerst een artiestennaam in.",
  msgNeedReason: "Geef een reden op voor het afwijzen.",
  msgNeedRaw: "Plak eerst iets in het tekstvak.",
  msgNeedSource: "Vul in waar de gegevens vandaan komen.",
  msgError: "Er ging iets mis. Probeer het opnieuw.",

  rawTitle: "Wat er binnenkwam",
  rawFrom: "Van",
  rawSubject: "Onderwerp",
  rawReceived: "Ontvangen",
  rawSourceNote: "Bron",
  rawReadBy: "Uitgelezen door",
  readByAi: "AI",
  readByHeuristic: "eenvoudige herkenning",
  readByAdmin: "beheerder",

  avgTitle: "Let op: deze DJ heeft zich niet zelf aangemeld",
  avgBody:
    "Hij moet binnen een maand horen dat we zijn gegevens hebben, met een link om ze te laten verwijderen. Zijn profiel blijft onzichtbaar tot hij het zelf opeist.",

  fieldsTitle: "Gegevens voor het profiel",
  fStageName: "Artiestennaam",
  fEmail: "E-mailadres",
  fCity: "Woonplaats",
  fGage: "Basistarief (euro)",
  fBio: "Bio",
  fInstagram: "Instagram-naam",
  fSoundcloud: "SoundCloud",
  fMixcloud: "Mixcloud",
  fSpotify: "Spotify",
  fWebsite: "Website",
  fGenres: "Genres",

  existsTitle: "Bestaat mogelijk al op MyGigs",

  saveBtn: "Opslaan",
  approveBtn: "Goedkeuren",
  approveHint:
    "Goedkeuren zet de aanmelding klaar. Het profiel aanmaken en de opeismail versturen bouwen we in de volgende stap.",
  rejectTitle: "Afwijzen",
  rejectLabel: "Reden",
  rejectPlaceholder: "Bijvoorbeeld: geen DJ, dubbel, onvoldoende gegevens",
  rejectBtn: "Afwijzen",
  reopenBtn: "Weer openzetten",
  reviewedBy: "Afgehandeld op",
}

const en: typeof nl = {
  title: "DJ sign-ups",
  subtitle:
    "Everything that comes in for a new DJ profile. Nothing goes live without your review.",
  backToDashboard: "Back to dashboard",

  tabOpen: "Open",
  tabApproved: "Approved",
  tabRejected: "Rejected",
  tabClaimed: "Claimed",
  empty: "Nothing here yet.",

  sourceEmail: "Email",
  sourceInstagram: "Instagram",
  sourceForm: "Form",
  sourceManual: "Added manually",

  statusNew: "New",
  statusReviewing: "In review",
  statusApproved: "Approved",
  statusRejected: "Rejected",
  statusClaimed: "Claimed",

  noName: "Name unknown",
  selfSubmitted: "Signed up themselves",
  foundByAdmin: "Found by us",

  addTitle: "Add a DJ",
  addIntro:
    "Paste everything you have on a DJ: an Instagram bio, an email, a WhatsApp message, links. The bot extracts the details, you review them afterwards.",
  addRawLabel: "What do you have on this DJ?",
  addRawPlaceholder:
    "DJ Example | Afro & Amapiano | Rotterdam\nBookings: bookings@example.com\nsoundcloud.com/example",
  addSourceLabel: "Where does this come from?",
  addSourcePlaceholder: "For example: instagram.com/djexample, or: WhatsApp to Kwame on 21 September",
  addSourceHint:
    "Required. If the DJ later asks how we got their details, you need to be able to show it.",
  addSelfLabel: "The DJ sent this to us themselves",
  addSelfHint:
    "Tick if the DJ contacted us, for example via WhatsApp or in person. Leave unticked if you looked them up yourself.",
  addBtn: "Add and extract",
  addBusy: "Extracting…",
  reextractBtn: "Extract again",
  reextractBusy: "Working…",
  reextractHint: "Reads the message again and overwrites the fields on the right.",
  aiOffTitle: "The AI did not run. Reason:",
  msgReextracted: "Extracted again.",
  msgReextractedNoAi: "Extracted again, but without AI. The reason is shown on the left.",

  msgAdded: "Added. Review the details below.",
  msgDuplicate:
    "There is already an open sign-up with this email address or Instagram name.",
  msgSaved: "Saved.",
  msgApproved: "Approved.",
  msgRejected: "Rejected.",
  msgReopened: "Reopened.",
  msgNeedName: "Fill in a stage name first.",
  msgNeedReason: "Give a reason for rejecting.",
  msgNeedRaw: "Paste something in the text box first.",
  msgNeedSource: "Fill in where the details come from.",
  msgError: "Something went wrong. Please try again.",

  rawTitle: "What came in",
  rawFrom: "From",
  rawSubject: "Subject",
  rawReceived: "Received",
  rawSourceNote: "Source",
  rawReadBy: "Extracted by",
  readByAi: "AI",
  readByHeuristic: "simple matching",
  readByAdmin: "admin",

  avgTitle: "Note: this DJ did not sign up themselves",
  avgBody:
    "They must be told within a month that we hold their details, with a link to have them removed. Their profile stays hidden until they claim it.",

  fieldsTitle: "Profile details",
  fStageName: "Stage name",
  fEmail: "Email address",
  fCity: "City",
  fGage: "Base fee (euro)",
  fBio: "Bio",
  fInstagram: "Instagram name",
  fSoundcloud: "SoundCloud",
  fMixcloud: "Mixcloud",
  fSpotify: "Spotify",
  fWebsite: "Website",
  fGenres: "Genres",

  existsTitle: "May already exist on MyGigs",

  saveBtn: "Save",
  approveBtn: "Approve",
  approveHint:
    "Approving marks the sign-up as ready. Creating the profile and sending the claim email come in the next step.",
  rejectTitle: "Reject",
  rejectLabel: "Reason",
  rejectPlaceholder: "For example: not a DJ, duplicate, not enough details",
  rejectBtn: "Reject",
  reopenBtn: "Reopen",
  reviewedBy: "Handled on",
}

export const dict = { nl, en }
