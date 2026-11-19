# Horizon X

An independent browser launcher for Horizon Web (Minecraft Java 26.3) and a compatible Classic 1.8.8 client. The dashboard checks WebGPU, WebAssembly and WebGL and launches configured clients in separate tabs.

## Run locally

Use Node.js 24, or another Vite-supported version (20.19+ or 22.12+).

```sh
npm ci
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge. For a production check, run `npm run build`, then `npm run preview` and open **http://localhost:4173**.

## Modern Mode

1. Install Minecraft Java Edition 26.3 from an account you own and start it once. Prepare the local Horizon resources as documented in [Horizon’s native client guide](https://github.com/nobuildersnotools/horizon-web/blob/web/docs/native-client.md#build-from-source). Keep the resources private and put them in the Horizon Web checkout at `.local/horizon-client/26.3`.
2. In a separate checkout of [Horizon Web’s web branch](https://github.com/nobuildersnotools/horizon-web/tree/web), follow the [browser build guide](https://github.com/nobuildersnotools/horizon-web/blob/web/web/README.md#build-and-run). It specifies Rust nightly `nightly-2026-10-14` with `rust-src`, the `wasm32-unknown-unknown` target, wasm-bindgen CLI `0.2.129`, and Binaryen for optimized release builds. Run `PROFILE=fast web/build.sh` for development, then `python3 web/serve.py`.
3. In Horizon X, open **Settings**, set Modern client URL to `http://localhost:8080/`, and save. Return to **Play** and select **Launch Modern**.
4. Use a Chromium browser with a working WebGPU adapter. The game server must send COOP `same-origin` and COEP `require-corp` or use upstream’s packaged service worker. World saves, sound, controller input, profiles, and game settings are handled by the client. Keep using the same game origin to access its browser saves.

For a private remote deployment, use an HTTPS address and upstream's packaging instructions. The generated Horizon Web folder includes game resources. Keep it outside this repository and out of the public launcher deployment.

## Classic Mode

In **Settings**, enter the HTTPS address of a compatible 1.8.8 browser client you are authorized to use. A localhost address also works for a local build. Save, return to **Play**, and select **Launch Classic**. The launcher checks WebGL and the chosen client determines actual compatibility.

## Stage 1 smoke test

- Verify both unconfigured modes link to Settings and the browser capability checks resolve.
- Set both client URLs, save, reload, and verify both remain set. Launch each and confirm it opens the expected address in a new tab. Clear the addresses and verify setup links return.
- Open Multiplayer and About, and check the dashboard in a narrow browser window.
- With a prepared Modern build, verify the title screen, create a world, return to the menu and reopen that world. Gameplay verification requires private game resources and working WebGPU.

## Upstream review

[Horizon Web](https://github.com/nobuildersnotools/horizon-web/tree/web) is the primary target. Its current original work is LGPL-3.0-or-later, with earlier MIT code and third-party notices. Its threaded WebAssembly browser build documents single-player, offline-mode and compatible WebSocket servers, shared worlds, and origin-private storage.

[Astris](https://github.com/Ragalikx/Astris) is an MIT-licensed alternative with prepared-resource folder/ZIP import. Its README describes multiplayer as unavailable. Its hosted deployment could not be reached from the development environment.

The requested EaglercraftX source returned a [GitHub takedown notice](https://github.com/github/dmca/blob/master/2026/09/2026-09-14-minecraft-2.md) during inspection, so its license and build requirements could not be verified. This launcher ships its own interface and artwork and links to independently hosted clients.

## Publish the launcher

Deploy `dist/` after `npm ci && npm run build` to any static host, such as Cloudflare Pages (build command `npm run build`, output directory `dist`) or GitHub Pages. For GitHub Pages, set **Settings → Pages → Source** to **GitHub Actions**, then manually run **Deploy Horizon X to GitHub Pages** from the repository’s Actions tab. The workflow requires Pages deployment permission. Only deploy the launcher output. Client isolation headers belong on the separately hosted game, as described above.

The launcher has no account system and is unaffiliated with Mojang Studios or Microsoft.
