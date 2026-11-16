# MultiWallet: what is still missing before real money

This prototype uses **test money only**. Phase 10 added the technical basics (PIN with lockout,
limits, audit log, tests, restricted CORS, shorter login sessions). This file lists what a real
payments business still needs. It is a planning list, **not legal advice**. Talk to a lawyer and
to the regulator (Finansinspektionen in Sweden) before handling anyone's money.

## 1. Licence or licensed partner (the biggest one)
- Holding or moving customers' money in Sweden is regulated. Either get an e-money or payment
  institution licence (this needs capital, fit-and-proper managers, governance and safeguarding of
  customer funds) or build on a **licensed partner** that holds the money and lets you build the app.
- Until then: keep it clearly labelled "prototype, test money" everywhere.

## 2. Know your customer
- Real identity checks: Swedish **BankID** (through a provider such as Signicat or Criipto), not
  just email + password.
- Anti-money-laundering (AML) rules: customer due diligence, sanctions and PEP screening,
  transaction monitoring, suspicious-activity reporting.

## 3. Strong customer authentication (PSD2)
- Payments need two independent factors. Our PIN + logged-in device is a start. Real apps bind the
  login to the device, use biometrics, and use BankID for sensitive steps.

## 4. Account security still missing
- Email/phone **verification** and **password reset** (not built yet)
- **Refresh tokens** with short access tokens (we use 1-day tokens plus "log out everywhere")
- httpOnly **cookies** for the website instead of localStorage
- 2FA for business accounts and an admin panel with its own strict login
- Fraud rules: new-device alerts, velocity checks, blocking and freezing accounts

## 5. Data protection (GDPR)
- Privacy policy, lawful basis, data retention rules, a way for users to export and request deletion.
- Plan for the conflict between "ledger can never be deleted" and "right to erasure": usually
  you keep the financial record (legal duty) but remove or anonymise personal details.
- Keep all data in the EU, sign data processing agreements with every provider.

## 6. Operations
- Backups with a tested restore, monitoring and alerts, an on-call plan
- Secrets in a proper secrets manager, never in files
- Incident response plan, including who you must notify and how fast
- Independent **penetration test** before launch
- Terms and conditions, complaints handling, customer support

## 7. Money handling
- Reconciliation: your ledger must match the real bank account every day
- Real top-up and withdrawal rails (open banking, cards, bank transfer) through the partner
- Refunds, chargebacks, disputes, and what happens when a merchant is closed
