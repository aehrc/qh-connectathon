// Your app's settings. Edit this file, commit, and GitHub Pages republishes in about a minute.
window.SMART_CONFIG = {
  // From Jim, after you send him your launch and redirect URI (both: this site's URL, with the trailing /)
  clientId: 'PUT-YOUR-CLIENT-ID-HERE',
  // Must be a subset of the scopes registered for your client ID. SMART v1 scopes only on Meld.
  scope: 'launch openid fhirUser patient/*.read',
  // Population app (population/): its own client ID, registered with launch URI .../population/launch.html
  populationClientId: 'PUT-YOUR-POPULATION-CLIENT-ID-HERE'
};
