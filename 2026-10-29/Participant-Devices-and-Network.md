# Participant devices & network — what to expect on the day

**Applies to all tracks.** Guidance from Harry Hobson (QH), 29 September 2026, in response to
questions about what QH laptops can do during the connectathon.

## Headline

**Assume any laptop on a non-QH network.** The simplest, most equal setup is that everyone —
QH staff or not — brings a laptop and connects to a **non-QH network** (e.g. venue wifi or a
mobile hotspot). This gives all participants the same access method and **avoids the QH-network
restrictions**, most of which are enforced by the QH network itself, not the device. Nothing in
the planned activities is expected to require QH network access.

## Devices

- Not everyone will have a QH device; QH supports personal devices via remote access
  (Citrix Workspace / VMware Horizon), and QH devices can also use VPN.
- QH laptop builds are largely uniform. Developers typically (but not always) have local admin.
- For the developer deep dive: ask participants to **bring their own device with local admin /
  Docker** (or a QH laptop). Some developers install software on utility servers rather than
  their device.

## Regular participants

| Question | Answer (Harry) |
|----------|----------------|
| Browser | Microsoft Edge on Windows 11 (e.g. 150.0.4078.65). |
| Postman / curl / PowerShell | Postman is likely blocked/restricted (proxy config needed if used, or use the Postman cloud version). **curl and PowerShell are available** and use OS proxy settings. |
| Reaching public HTTPS sites | Generally allowed; some categories (shopping/forums) blocked. **Test the exact URLs beforehand.** New-domain exception requests can take ~a week and may need escalation. Enforced by the QH network. |
| Non-443 outbound ports | FTP/SFTP blocked; standard HTTP/S ports fine. Port 8080 tested OK. Enforced by the QH network. |

## Developer participants

- **Bring-your-own-device** with local admin is recommended (or a QH laptop).
- **HL7 MLLP (plain TCP, e.g. port 2575) outbound** from a QH laptop: likely works, **must be
  tested**. Enforced by the QH network.

## Action

Harry has agreed to run a **real-laptop test**, from both a QH network and a mobile hotspot.
Tracked in the Services-track infra issues (`track:services`, e.g. the Harry Hobson chase and the
Appendix A laptop test). Key implication for all tracks: **prefer a non-QH network and pre-test
every external URL and port participants will use.**

*Source: email "RE: Connectathon Track 2: what can QH laptops do on the day? [SEC=OFFICIAL]",
Harry Hobson, 29 Sep 2026.*
