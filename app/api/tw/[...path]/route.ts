import { NextRequest } from "next/server";

const DEFAULT_TW_BASE_URL = "https://dev.api.trustlesswork.com";

const getUpstreamBaseUrl = () => {
    const candidates = [
        process.env.TW_BASE_URL,
        process.env.NEXT_PUBLIC_TW_BASE_URL,
        DEFAULT_TW_BASE_URL,
    ];

    for (const candidate of candidates) {
        if (candidate && /^https?:\/\//i.test(candidate)) {
            return candidate.replace(/\/+$/, "");
        }
    }

    return DEFAULT_TW_BASE_URL;
};

const getApiKey = () => {
    return process.env.TW_API_KEY || process.env.NEXT_PUBLIC_TW_API_KEY || "";
};

const forwardRequest = async (
    request: NextRequest,
    params: { path: string[] }
) => {
    const upstreamBaseUrl = getUpstreamBaseUrl();
    const targetPath = params.path.join("/");
    const targetUrl = `${upstreamBaseUrl}/${targetPath}${request.nextUrl.search}`;

    const headers = new Headers();
    const incomingContentType = request.headers.get("content-type");
    if (incomingContentType) {
        headers.set("content-type", incomingContentType);
    }

    headers.set("accept", "application/json, text/plain, */*");

    const apiKey = getApiKey();
    if (!apiKey) {
        console.error(
            "[TW Proxy] API key no encontrada. Configura TW_API_KEY (o NEXT_PUBLIC_TW_API_KEY como fallback local) en .env.local"
        );
        return new Response(
            JSON.stringify({
                error: "TW_API_KEY no configurada en el servidor",
            }),
            {
                status: 500,
                headers: { "content-type": "application/json" },
            }
        );
    }
    headers.set("x-api-key", apiKey);

    const hasBody = !["GET", "HEAD"].includes(request.method);
    const bodyText = hasBody ? await request.text() : undefined;

    console.log(`[TW Proxy] ${request.method} ${targetUrl}`);

    const upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: hasBody ? bodyText : undefined,
    });

    const responseHeaders = new Headers();
    const upstreamContentType = upstreamResponse.headers.get("content-type");
    if (upstreamContentType) {
        responseHeaders.set("content-type", upstreamContentType);
    }

    const responseBody = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
        console.error(`[TW Proxy] ${upstreamResponse.status} ${targetUrl}`, responseBody.slice(0, 500));
    }

    return new Response(responseBody, {
        status: upstreamResponse.status,
        headers: responseHeaders,
    });
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
    return forwardRequest(request, params);
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
    return forwardRequest(request, params);
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
    return forwardRequest(request, params);
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
    return forwardRequest(request, params);
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const params = await context.params;
    return forwardRequest(request, params);
}
