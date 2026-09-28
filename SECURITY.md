# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

StudyOS does not yet publish an official private security-reporting address. Do not send StudyOS vulnerability reports to Open Sunsama's upstream contacts: those contacts are not StudyOS support.

Until StudyOS publishes a dedicated private reporting channel, do not include vulnerability details, proof-of-concept code, secrets, or user data in a public issue. If you are already coordinating with a StudyOS maintainer, use a private channel that you have agreed on directly.

For a vulnerability that also affects the inherited Open Sunsama foundation, consult the [upstream Open Sunsama repository](https://github.com/ShadowWalker2014/open-sunsama) and follow its current security policy. Any contacts listed there belong to the upstream project and should be used only for upstream issues.

### Please Do

- **Provide details** about the vulnerability, including:
  - Type of issue (e.g., SQL injection, XSS, authentication bypass)
  - Full paths of source file(s) related to the issue
  - Location of the affected source code (tag/branch/commit or direct URL)
  - Step-by-step instructions to reproduce the issue
  - Proof-of-concept or exploit code (if possible)
  - Impact of the issue, including how an attacker might exploit it
- **Give us reasonable time** to respond before public disclosure

### Please Don't

- **Don't open a public GitHub issue** for security vulnerabilities
- **Don't access or modify other users' data** without explicit permission
- **Don't perform actions** that could negatively impact other users
- **Don't use automated scanners** against production systems without permission

## Disclosure Policy

We follow a coordinated disclosure process:

1. Security issues are reported privately
2. We confirm the vulnerability and determine its scope
3. We develop and test a fix
4. We release the fix and publish a security advisory
5. We credit the reporter (unless they prefer to remain anonymous)

## Security Best Practices for Self-Hosters

If you're self-hosting StudyOS, please ensure:

### Environment

- [ ] Use strong, unique values for `JWT_SECRET`
- [ ] Keep `DATABASE_URL` credentials secure
- [ ] Use HTTPS in production
- [ ] Set appropriate `CORS_ORIGIN` values

### Database

- [ ] Use a strong PostgreSQL password
- [ ] Limit database network access
- [ ] Enable SSL for database connections
- [ ] Regular backups

### API Keys

- [ ] API keys are hashed before storage (SHA-256)
- [ ] Use minimal required scopes for API keys
- [ ] Rotate API keys periodically
- [ ] Set expiration dates when possible

### Infrastructure

- [ ] Keep dependencies updated
- [ ] Use a reverse proxy (nginx, Caddy) with rate limiting
- [ ] Enable firewall rules
- [ ] Monitor logs for suspicious activity

## Known Security Features

StudyOS implements the following security measures:

- **Password Hashing**: bcrypt with appropriate work factor
- **API Key Hashing**: SHA-256 (keys cannot be recovered)
- **JWT Tokens**: Short expiration, secure signing
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: React's built-in escaping + CSP headers
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: Available via reverse proxy configuration

## Bug Bounty and Response Times

StudyOS does not currently operate a formal bug bounty program and does not publish guaranteed response or remediation times.

## Contact Status

- **StudyOS security contact**: Not yet published
- **Upstream Open Sunsama issues**: Consult the upstream repository's current security policy; upstream contacts are not StudyOS contacts.

Thank you for helping keep StudyOS and our users safe!
