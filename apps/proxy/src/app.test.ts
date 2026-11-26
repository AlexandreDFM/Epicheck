/**
 * Proxy tests: run with `pnpm test` (node:test on the compiled output).
 * No request reaches the Intranet: every case is refused before.
 */
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import app, { buildIntraUrl } from "./app";

describe("buildIntraUrl", () => {
    it("accepts Intranet paths", () => {
        assert.equal(
            buildIntraUrl("/user/?format=json"),
            "https://intra.epitech.eu/user/?format=json",
        );
    });

    for (const endpoint of [
        "@evil.example/x",
        ".evil.example/x",
        ":8080@evil.example/",
        "//evil.example/x",
        "/\\evil.example/x",
        "https://evil.example/x",
        "",
        42,
        undefined,
    ]) {
        it(`refuses ${JSON.stringify(endpoint)}`, () => {
            assert.equal(buildIntraUrl(endpoint), null);
        });
    }
});

describe("HTTP", () => {
    let server: Server;
    let base: string;

    before(async () => {
        server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    after(() => server.close());

    const proxy = (body: unknown, headers: Record<string, string> = {}) =>
        fetch(`${base}/api/intra-proxy`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(body),
        });

    it("answers the health checks", async () => {
        for (const path of ["/health", "/api/health"]) {
            const res = await fetch(base + path);
            assert.equal(res.status, 200);
            const body = (await res.json()) as { status: string };
            assert.equal(body.status, "ok");
        }
    });

    it("refuses an endpoint outside the Intranet", async () => {
        const res = await proxy({ endpoint: "@evil.example/", cookie: "x" });
        assert.equal(res.status, 400);
    });

    it("refuses other methods", async () => {
        const res = await proxy({
            endpoint: "/user/",
            cookie: "x",
            method: "DELETE",
        });
        assert.equal(res.status, 400);
    });

    it("requires a cookie", async () => {
        const res = await proxy({ endpoint: "/user/" });
        assert.equal(res.status, 400);
    });

    it("sends no CORS header to unknown origins", async () => {
        const res = await fetch(`${base}/api/health`, {
            headers: { Origin: "https://evil.example" },
        });
        assert.equal(res.headers.get("access-control-allow-origin"), null);
    });

    it("answers malformed JSON with 400 and no stack trace", async () => {
        const res = await fetch(`${base}/api/intra-proxy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
        });
        assert.equal(res.status, 400);
        assert.deepEqual(await res.json(), { error: "Bad Request" });
    });
});
