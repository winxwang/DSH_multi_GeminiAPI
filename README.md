# DSH Multi Gemini API

A DeepSeek Harness Web Client extension that adds multi-key management to the native Google Gemini provider card in **Settings → Models**.

## Features

- Store multiple Gemini API keys through the Harness credential service. Secret values are never written to browser storage, settings documents, logs, or this repository.
- Add a human-readable note for each key.
- Enable or disable each key independently.
- Manually choose the one active key. There is no automatic key rotation or fallback rotation.
- The selected key is applied by updating the native `llm-pi-ai` Google provider profile's `apiKeyEnv`. The Harness pi-ai adapter resolves that credential reference on each request, so the next request uses the selected key without replacing the Google provider.
- Removing or disabling the active key switches the profile to a deliberately missing credential reference. This prevents silent use of an ambient fallback key; choose another enabled key explicitly.
- Explain Google quota semantics in the card: Gemini API quotas are generally project-level and shared across keys, not independent per-key balances.

## Quota and usage

Google does not expose a dependable per-API-key remaining-quota balance through the Gemini API key itself. The card therefore does **not** fabricate a remaining quota or claim that a key has an independent allowance. Check the Google AI Studio / Google Cloud project quota and usage pages for authoritative project-level limits and usage.

This initial version shows each key's saved/active/enabled state and last selection time. It does not claim to count all inference requests or tokens: the native provider currently does not expose a per-key usage feed to this Client extension.

## Install

Install this bundle through the DeepSeek Harness Plugin Manager using the repository/package directory, or package it according to your Harness bundle workflow.

The bundle expects the Harness built-in packages:
- `@deepseek-ai/dsh-client-ui-settings-models`
- `@deepseek-ai/dsh-api-remotes`
- the native `@deepseek-ai/dsh-llm-pi-ai` provider adapter and credential service.

After installation, open **Settings → Models → Google**. Add keys, enable the ones you want available, and explicitly select the active key.

## Security

- Never commit API keys.
- Never paste API keys into issues, pull requests, or chat.
- Key values are sent only to `remote.credentials.set` and are never read back by the UI.
- Key labels, references, enabled state, and active selection are stored in this browser's local storage. They contain no secret values. If browser storage is cleared or you switch browsers, the labels may need to be recreated; credential records remain in the Harness credential store.
- The profile's `apiKeyEnv` contains only a credential reference, never the key.

## Development

No build step is required for the plain JavaScript Client bundle.

Check syntax with:

```sh
node --check client.js
```

Check the manifest JSON with:

```sh
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
```

## License

MIT
