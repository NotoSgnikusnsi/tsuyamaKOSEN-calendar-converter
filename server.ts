import { serve } from "https://deno.land/std@0.180.0/http/server.ts";
import { CreateCsv, CreateIcal } from "./app.ts";

serve(async (req) => {
  const pathname = new URL(req.url).pathname;
  console.log(pathname);

  let response;

  if (pathname === "/csv" && req.method === "GET") {
    response = await CreateCsv();
    return new Response(response, {
      headers: {
        "content-type": "text/csv",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  if (pathname === "/ical" && req.method === "GET") {
    const response = await CreateIcal();
    return new Response(response, {
      headers: {
        "content-type": "text/calendar",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
