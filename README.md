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

1. Install Minecraft Java Edition 26.3 from an account you own and start it once. Prepare the resources with the Horizon launcher or follow [Horizon's native resource guide](https://github.com/nobuildersnotools/horizon-web/blob/web/docs/native-client.md#build-from-source). Keep the prepared files outside the launcher checkout.
2. Clone Horizon Web next to Horizon X and pin the tested source revision.

   ```sh
   git clone --branch web https://github.com/nobuildersnotools/horizon-web.git ../horizon-web
   git -C ../horizon-web checkout --detach 83eb3376109f0676fc8d12c6b2455dd3258c84db
   ```

3. From the Horizon Web checkout, install the [upstream browser toolchain](https://github.com/nobuildersnotools/horizon-web/blob/web/web/README.md#build-and-run). Use Python 3.11+ for launcher verification.

   ```sh
   rustup toolchain install nightly-2026-10-14 --component rust-src --target wasm32-unknown-unknown
   cargo +nightly-2026-10-14 install --locked wasm-bindgen-cli --version 0.2.129
   ```

4. From Horizon X, build with a private resource folder and serve using Horizon Web's loopback server. Omit `HORIZON_RESOURCES` if the prepared version folder is at `.local/horizon-client/26.3` inside Horizon Web. The scripts verify the WebAssembly header and upstream artifact hashes before serving. Use `PROFILE=release` and install Binaryen for an optimized build.

   ```sh
   HORIZON_RESOURCES=/absolute/path/to/prepared/26.3 npm run modern -- build ../horizon-web
   npm run modern -- serve ../horizon-web
   ```

5. In Horizon X, open **Settings**, select **Use local Horizon Web address**, and save. Return to **Play** and select **Launch Modern**. Horizon Web manages download and startup progress, handles game errors, and saves worlds in origin-private browser storage. Keep using the same client origin, including the port, to access those saves.

For a private remote deployment, use HTTPS with COOP `same-origin` and COEP `require-corp`, or upstream's packaged service worker. Use Chrome or Edge with a working WebGPU adapter. Keep the generated Horizon Web folder private because its resource bundle contains your game files.

Astris is an alternative for users who already have a prepared folder or ZIP and prefer the browser import flow. Set a trusted Astris address as the Modern URL. Its documented feature set differs from Horizon Web, particularly for multiplayer.

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
