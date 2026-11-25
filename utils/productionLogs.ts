/**
 * File Name: productionLogs.ts
 * Description: Quiet console output in release builds.
 *
 * Imported first by index.ts. In release builds (__DEV__ false):
 * - console.log / info / debug do nothing: they traced requests, logins and
 *   cookie handling and end up in the device log (adb logcat, Console.app);
 * - console.warn / error are kept, but an axios error is reduced to its
 *   method, URL and status: the full object holds the request headers, with
 *   the Intranet cookie (Bearer) or the Jenkins token (Basic).
 */

import { isAxiosError } from "axios";

function summarize(arg: unknown): unknown {
    if (!isAxiosError(arg)) {
        return arg;
    }
    const method = arg.config?.method?.toUpperCase() ?? "";
    const url = (arg.config?.url ?? "").split("?")[0];
    const status = arg.response?.status ?? arg.code ?? "no response";
    return `${arg.message} (${method} ${url} -> ${status})`;
}

if (!__DEV__) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;

    const warn = console.warn.bind(console);
    const error = console.error.bind(console);
    console.warn = (...args: unknown[]) => warn(...args.map(summarize));
    console.error = (...args: unknown[]) => error(...args.map(summarize));
}

export {};
