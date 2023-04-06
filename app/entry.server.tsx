import * as Sentry from "@sentry/remix";
import type { EntryContext } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";
import { db } from "~/utils/db.server";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

Sentry.init({
  dsn: "https://b622e598f00a4f409b22e88e4cea70be:214e29096a7d45be83247ba471b1bda4@o4504969122611200.ingest.sentry.io/4504969125167104",
  tracesSampleRate: 1,
  integrations: [new Sentry.Integrations.Prisma({ client: db })],
});
