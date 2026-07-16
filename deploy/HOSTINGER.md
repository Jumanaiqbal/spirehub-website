# Deploying to Hostinger

This app is a Vite-built React frontend plus a small Node API server
(`server/prod-server.ts`) that talks to Odoo and the AFS payment gateway.
It needs a place that can run a persistent Node process — that's a
**Hostinger VPS** (KVM plan), not shared/Business hosting.

Shared hosting's Node.js support (via Passenger/CloudLinux) works for very
simple apps, but it's awkward for a server that does outbound HTTPS calls to
three different external APIs and needs a handful of secret env vars — a VPS
gives you a normal Linux box where this just works like it does locally.

**Plan:** KVM 2 (2 vCPU / 8 GB RAM / 100 GB NVMe) — comfortable headroom for
this site plus room to grow. Pick a data center region close to Bahrain if
offered.

## 1. Provision the VPS

- In hPanel, order a KVM VPS, choose **Ubuntu 24.04 LTS** as the OS.
- Note the server's public IP.
- In Namecheap's DNS zone editor for `spire.bh`, add two **A records**
  pointing at that IP (not a CNAME — a VPS is a plain static IP, not a
  routable hostname like Vercel/Netlify give you, and a CNAME isn't valid
  at the root domain anyway):
  - `@` (root, `spire.bh`) → VPS IP
  - `www` (`www.spire.bh`) → VPS IP

## 2. Initial server setup

SSH in as root, then:

```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx git

# Node 24 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

npm install -g pm2

# non-root user to run the app
adduser --disabled-password --gecos "" spire
usermod -aG sudo spire
```

## 3. Deploy the app

As the `spire` user:

```bash
su - spire
git clone git@github.com:Jumanaiqbal/spirehub-website.git spire-hub-website
cd spire-hub-website
npm install
cp .env.example .env
nano .env   # fill in real ODOO_/AFS_ credentials — see below
npm run build
```

The `.env` values are the same ones already configured wherever this was
running before (Vercel project settings) — copy them over rather than
re-generating: `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY`,
`AFS_ENTITY_ID`, `AFS_ACCESS_TOKEN`, `AFS_BASE_URL`, `AFS_CURRENCY`, the
`ODOO_INVOICE_JOURNAL_ID`/`ODOO_AFS_JOURNAL_ID`/etc. invoicing IDs, and the
`VITE_SPIRE_BANK_*` bank transfer details. See `.env.example` for the full
list.

**AFS payment gateway:** its redirect URL is derived from the page URL at
checkout time, so no code change is needed there — but if AFS has your
Vercel domain allow-listed on their end, contact AFS to add the new
Hostinger domain before going live, or card payments will fail at the
redirect step.

**Automated invoicing:** this only works in production once the same Odoo
Automation Rule that was created in the testing database (via
`base.automation`, triggered on invoices' `payment_state` changing to
`paid`) also exists in the **production** Odoo database — automation rules
are Odoo-side configuration, not code, so they don't carry over
automatically. Ask before recreating it there, since it touches the live
accounting system.

## 4. Run it with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed instructions to enable boot-start
```

`ecosystem.config.cjs` (committed in the repo) runs
`server/prod-server.ts` via `tsx`, loading `.env` and listening on port
3000. Check it's up:

```bash
curl -s localhost:3000/api/health
```

## 5. nginx + TLS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/spire.bh
sudo ln -s /etc/nginx/sites-available/spire.bh /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d spire.bh -d www.spire.bh
```

Certbot edits the nginx config in place to add the HTTPS server block and
sets up auto-renewal.

## 6. Automated deploys — push to `main` → live

A GitHub Actions workflow (`.github/workflows/deploy.yml`) is already set up:
on every push to `main`, it SSHs into the VPS, pulls the latest code,
rebuilds, and restarts the app via PM2. It needs a deploy key and three
GitHub Secrets to actually run.

**One-time setup, as the `spire` user on the VPS:**

```bash
# 1. Generate a dedicated deploy key (no passphrase — it runs unattended)
ssh-keygen -t ed25519 -f ~/.ssh/deploy_github -N ""

# 2. Add the PUBLIC key as a "Deploy key" on the GitHub repo
#    (Repo → Settings → Deploy keys → Add deploy key, read-only is enough
#    since the workflow only pulls, never pushes)
cat ~/.ssh/deploy_github.pub

# 3. Tell git to use this key for GitHub
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/deploy_github
EOF
```

**Then, in the GitHub repo → Settings → Secrets and variables → Actions,**
add three repository secrets:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | the VPS's public IP |
| `DEPLOY_USER` | `spire` |
| `DEPLOY_SSH_KEY` | a **separate** SSH keypair's private key, whose matching public key you've added to `~/.ssh/authorized_keys` on the VPS for the `spire` user (don't reuse the GitHub deploy key above — that one's read-only for pulling code, this one needs to actually log into the server) |

Generate that second keypair locally (not on the VPS):

```bash
ssh-keygen -t ed25519 -f ./spire_deploy_key -N ""
# copy spire_deploy_key.pub's contents into the VPS's
# ~/.ssh/authorized_keys (as the spire user)
# paste spire_deploy_key's contents (the private half) into the
# DEPLOY_SSH_KEY GitHub secret
```

Once all three secrets are set, any push to `main` (including merging a PR)
triggers a deploy automatically. Check progress under the repo's **Actions**
tab. You can also trigger it manually from there (`workflow_dispatch`).

## Updating after future code changes

With CI/CD set up, this happens automatically on push. To do it manually
(or if CI is down):

```bash
su - spire
cd spire-hub-website
git pull
npm install
npm run build
pm2 restart spire-hub-website
```

## Rollback

```bash
pm2 logs spire-hub-website   # check what broke
git log --oneline -5         # find the last good commit
git checkout <commit>
npm install && npm run build
pm2 restart spire-hub-website
```
