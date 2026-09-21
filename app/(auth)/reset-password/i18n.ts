const nl = {
  heading: "Nieuw wachtwoord",
  checking: "Resetlink controleren…",
  invalidTitle: "Deze resetlink is ongeldig of verlopen.",
  invalidHint: "Vraag een nieuwe aan via de inlogpagina.",
  done: "Je wachtwoord is bijgewerkt. Je wordt doorgestuurd naar inloggen…",
  chooseLabel: "Kies een nieuw wachtwoord",
  minChars: "Je wachtwoord voldoet nog niet aan alle eisen.",
  saving: "Opslaan…",
  save: "Wachtwoord opslaan",
  saveFailed: "Opslaan lukte niet. Probeer het opnieuw of vraag een nieuwe resetlink aan.",
  mfaTitle: "Eerst je code uit de app",
  mfaIntro:
    "Je account is beveiligd met tweestapsverificatie. Vul de 6 cijfers uit je authenticator-app in, daarna kies je je nieuwe wachtwoord.",
  mfaCodeLabel: "Code uit je authenticator-app",
  mfaContinue: "Verder",
  mfaChecking: "Controleren…",
  mfaWrong: "Die code klopt niet of is verlopen. Probeer de code die nu in je app staat.",
  mfaNeeded: "Vul eerst opnieuw je code uit de app in.",
  mfaNoFactor:
    "We vinden geen authenticator-app bij dit account. Mail info@mygigs.nl, dan helpen we je verder.",
}

const en: typeof nl = {
  heading: "New password",
  checking: "Checking reset link…",
  invalidTitle: "This reset link is invalid or expired.",
  invalidHint: "Request a new one from the login page.",
  done: "Your password has been updated. You are being redirected to login…",
  chooseLabel: "Choose a new password",
  minChars: "Your password does not meet all the requirements yet.",
  saving: "Saving…",
  save: "Save password",
  saveFailed: "Saving didn't work. Please try again or request a new reset link.",
  mfaTitle: "First, your code from the app",
  mfaIntro:
    "Your account is protected with two-step verification. Enter the 6 digits from your authenticator app, then choose your new password.",
  mfaCodeLabel: "Code from your authenticator app",
  mfaContinue: "Continue",
  mfaChecking: "Checking…",
  mfaWrong: "That code is wrong or has expired. Try the code currently shown in your app.",
  mfaNeeded: "Enter your code from the app again first.",
  mfaNoFactor:
    "We can't find an authenticator app on this account. Email info@mygigs.nl and we'll help you.",
}

export const dict = { nl, en }
