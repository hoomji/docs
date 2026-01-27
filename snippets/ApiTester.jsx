const { useMemo, useState } = React;

export const ApiTester = ({
  title = 'Try it',
  endpoint, // e.g. "https://api.uniblock.dev/uni/v1/json-rpc?chainId=1"
  method = 'POST',
  defaultBody, // string OR object
  defaultHeaders = { 'content-type': 'application/json' },
  showEndpoint = true,
  height = 220,
  useProxy = true,
  proxyPath = '/_mintlify/api/request',
}) => {
  const initialBodyString = useMemo(() => {
    if (typeof defaultBody === 'string') return defaultBody;
    if (defaultBody == null) return '';
    try {
      return JSON.stringify(defaultBody, null, 2);
    } catch {
      return '';
    }
  }, [defaultBody]);

  const [body, setBody] = useState(initialBodyString);
  const [headersText, setHeadersText] = useState(() => {
    try {
      return JSON.stringify(defaultHeaders, null, 2);
    } catch {
      return `{"content-type":"application/json"}`;
    }
  });

  const [status, setStatus] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const parseJson = (text, fallback) => {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  };

  const run = async () => {
    setIsLoading(true);
    setErrorText('');
    setStatus(null);
    setResponseText('');

    const headersObj = parseJson(headersText, null);
    if (
      !headersObj ||
      typeof headersObj !== 'object' ||
      Array.isArray(headersObj)
    ) {
      setIsLoading(false);
      setErrorText(
        'Headers must be a JSON object, e.g. { "content-type": "application/json" }',
      );
      return;
    }

    let bodyToSend = body;
    // If content-type is json, validate body JSON (nice UX)
    const ct = String(
      headersObj['content-type'] ?? headersObj['Content-Type'] ?? '',
    ).toLowerCase();
    if (ct.includes('application/json')) {
      const parsed = parseJson(body, null);
      if (parsed == null) {
        setIsLoading(false);
        setErrorText('Body must be valid JSON for application/json requests.');
        return;
      }
      bodyToSend = JSON.stringify(parsed);
    }

    try {
      const isGet = method.toUpperCase() === 'GET';
      const requestBody = isGet ? undefined : bodyToSend;

      const res = await fetch(
        useProxy ? proxyPath : endpoint,
        useProxy
          ? {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                url: endpoint,
                method,
                headers: headersObj,
                body: requestBody,
              }),
            }
          : {
              method,
              headers: headersObj,
              body: requestBody,
            },
      );

      const text = await res.text();
      const maybeJson = parseJson(text, null);

      if (useProxy && maybeJson && typeof maybeJson === 'object') {
        const proxyStatus =
          maybeJson.status ?? maybeJson.statusCode ?? maybeJson.code ?? null;
        setStatus(proxyStatus ?? res.status);

        const proxyBody =
          maybeJson.body ?? maybeJson.data ?? maybeJson.response ?? maybeJson;
        const proxyBodyText =
          typeof proxyBody === 'string'
            ? proxyBody
            : JSON.stringify(proxyBody, null, 2);
        const proxyJson = parseJson(proxyBodyText, null);
        setResponseText(
          proxyJson != null
            ? JSON.stringify(proxyJson, null, 2)
            : proxyBodyText,
        );
      } else {
        setStatus(res.status);
        // Pretty print JSON responses if possible
        if (maybeJson != null) {
          setResponseText(JSON.stringify(maybeJson, null, 2));
        } else {
          setResponseText(text);
        }
      }
    } catch (err) {
      setErrorText(err?.message || 'Request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 600 }}>{title}</div>
        {showEndpoint ? (
          <div
            style={{ opacity: 0.75, fontSize: 12, overflowWrap: 'anywhere' }}
          >
            {method.toUpperCase()} {endpoint}
          </div>
        ) : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => copy(body)}
            type='button'
            style={{
              border: '1px solid rgba(0,0,0,0.18)',
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
              background: 'transparent',
            }}
          >
            Copy body
          </button>
          <button
            onClick={run}
            type='button'
            disabled={isLoading || !endpoint}
            style={{
              border: '1px solid rgba(0,0,0,0.18)',
              borderRadius: 10,
              padding: '6px 12px',
              fontSize: 12,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
            Headers (JSON)
          </div>
          <textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            style={{
              width: '100%',
              height: 90,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.15)',
              padding: 10,
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
            Body
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              width: '100%',
              height,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.15)',
              padding: 10,
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Response {status != null ? `(HTTP ${status})` : ''}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => copy(responseText)}
                type='button'
                style={{
                  border: '1px solid rgba(0,0,0,0.18)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                Copy response
              </button>
            </div>
          </div>

          {errorText ? (
            <pre
              style={{
                marginTop: 8,
                background: 'rgba(255,0,0,0.06)',
                border: '1px solid rgba(255,0,0,0.20)',
                borderRadius: 10,
                padding: 10,
                overflowX: 'auto',
                fontSize: 12,
              }}
            >
              {errorText}
            </pre>
          ) : (
            <pre
              style={{
                marginTop: 8,
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 10,
                padding: 10,
                overflowX: 'auto',
                fontSize: 12,
                minHeight: 80,
              }}
            >
              {responseText || 'Run a request to see the response here.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
