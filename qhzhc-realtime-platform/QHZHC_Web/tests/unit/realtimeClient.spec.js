import RealtimeClient from "@/views/DataVisualization/services/realtimeClient";

class MockSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.send = jest.fn();
    this.close = jest.fn(() => {
      this.readyState = WebSocket.CLOSED;
    });
    MockSocket.instances.push(this);
  }

  open() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  receive(message) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  serverClose(code, reason = "") {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }
}

function telemetryPoint(sequence) {
  return {
    sequence,
    robotId: "QH-ZHC-01",
    sampledAt: new Date(1_700_000_000_000 + sequence).toISOString(),
    longitude: 104.81,
    latitude: 28.16,
    altitude: 120,
    speed: 12,
    heading: 90,
    priCo2: 420,
    priCh4: 2,
    priC2h6: 0.1,
    priCo: 0.2,
    priN2o: 0.3,
    priH2o: 1,
    picarroCh4: 2,
    picarroCo2: 420,
    picarroH2o: 1,
    windSpeed: 3,
    windDirection: 110,
    temperature: 24,
    humidity: 50,
    pressure: 1010,
  };
}

describe("RealtimeClient", () => {
  let frameCallbacks;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    MockSocket.instances = [];
    frameCallbacks = [];
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    window.requestAnimationFrame = jest.fn((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    window.cancelAnimationFrame = jest.fn();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    sessionStorage.clear();
  });

  test("start is idempotent and sends an explicit resume handshake", () => {
    const onStatus = jest.fn();
    const client = new RealtimeClient({
      url: "ws://example.test/ws/robots/QH-ZHC-01",
      WebSocketImpl: MockSocket,
      initialSequence: 12,
      getAccessToken: () => "access.jwt",
      refreshAccessToken: jest.fn(),
      onPacket: jest.fn(),
      onStatus,
    });

    client.start();
    client.start();
    const socket = MockSocket.instances[0];
    socket.open();

    expect(MockSocket.instances).toHaveLength(1);
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({
      type: "authenticate",
      accessToken: "access.jwt",
      protocolVersion: 1,
      robotId: "QH-ZHC-01",
      lastSequence: 12,
    }));

    socket.receive({
      type: "welcome",
      protocolVersion: 1,
      connectionId: "test",
      heartbeatIntervalMs: 8000,
      latestSequence: 12,
    });
    expect(onStatus).toHaveBeenCalledWith("connected");

    client.stop();
    expect(socket.close).toHaveBeenCalledWith(1000, "page leave");
  });

  test("holds reversed batches until the gap arrives, then renders once in order", () => {
    const onPacket = jest.fn();
    const client = new RealtimeClient({
      url: "ws://example.test/ws/robots/QH-ZHC-01",
      WebSocketImpl: MockSocket,
      getAccessToken: () => "access.jwt",
      refreshAccessToken: jest.fn(),
      onPacket,
      onStatus: jest.fn(),
    });
    client.start();
    const socket = MockSocket.instances[0];
    socket.open();
    socket.receive({
      type: "telemetry_batch",
      firstSequence: 2,
      lastSequence: 3,
      points: [telemetryPoint(3), telemetryPoint(2)],
      replay: false,
    });
    expect(onPacket).not.toHaveBeenCalled();
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({
      type: "resend",
      fromSequence: 1,
      toSequence: 1,
    }));

    socket.receive({
      type: "telemetry_batch",
      firstSequence: 1,
      lastSequence: 1,
      points: [telemetryPoint(1)],
      replay: true,
    });
    frameCallbacks.shift()?.(0);

    expect(onPacket).toHaveBeenCalledTimes(1);
    expect(onPacket.mock.calls[0][0].data.map((point) => point.sequence)).toEqual([
      1,
      2,
      3,
    ]);
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({
      type: "ack",
      sequence: 3,
    }));
    client.stop();
  });

  test("skips missing history after a gap and renders the next live point", () => {
    const onPacket = jest.fn();
    const client = new RealtimeClient({
      url: "ws://example.test/ws/robots/QH-ZHC-01",
      WebSocketImpl: MockSocket,
      initialSequence: 12,
      getAccessToken: () => "access.jwt",
      refreshAccessToken: jest.fn(),
      onPacket,
      onStatus: jest.fn(),
    });

    client.start();
    const socket = MockSocket.instances[0];
    socket.open();
    socket.receive({
      type: "gap",
      requestedFrom: 13,
      earliestAvailable: 50,
      latestSequence: 100,
      action: "skip-to-latest",
    });

    expect(onPacket).not.toHaveBeenCalled();
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({
      type: "ack",
      sequence: 100,
    }));

    socket.receive({
      type: "telemetry_batch",
      firstSequence: 101,
      lastSequence: 101,
      points: [telemetryPoint(101)],
      replay: false,
    });
    frameCallbacks.shift()?.(0);

    expect(onPacket).toHaveBeenCalledTimes(1);
    expect(onPacket.mock.calls[0][0].data.map((point) => point.sequence)).toEqual([101]);
    client.stop();
  });

  test("refreshes an expired access token before reconnecting with the same cursor", async () => {
    let accessToken = "expired.jwt";
    const refreshAccessToken = jest.fn().mockImplementation(async () => {
      accessToken = "rotated.jwt";
      return accessToken;
    });
    const client = new RealtimeClient({
      url: "ws://example.test/ws/robots/QH-ZHC-01",
      WebSocketImpl: MockSocket,
      initialSequence: 12,
      getAccessToken: () => accessToken,
      refreshAccessToken,
      onPacket: jest.fn(),
      onStatus: jest.fn(),
    });

    client.start();
    const firstSocket = MockSocket.instances[0];
    firstSocket.open();
    firstSocket.serverClose(4001, "ACCESS_TOKEN_EXPIRED");
    await Promise.resolve();
    await Promise.resolve();

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(MockSocket.instances).toHaveLength(2);

    const secondSocket = MockSocket.instances[1];
    secondSocket.open();
    expect(secondSocket.send).toHaveBeenCalledWith(JSON.stringify({
      type: "authenticate",
      accessToken: "rotated.jwt",
      protocolVersion: 1,
      robotId: "QH-ZHC-01",
      lastSequence: 12,
    }));
    client.stop();
  });

  test("stops reconnecting and clears authentication when refresh fails", async () => {
    const onAuthenticationFailure = jest.fn();
    const onStatus = jest.fn();
    const client = new RealtimeClient({
      url: "ws://example.test/ws/robots/QH-ZHC-01",
      WebSocketImpl: MockSocket,
      getAccessToken: () => "expired.jwt",
      refreshAccessToken: jest.fn().mockRejectedValue(new Error("refresh expired")),
      onAuthenticationFailure,
      onPacket: jest.fn(),
      onStatus,
    });

    client.start();
    MockSocket.instances[0].open();
    MockSocket.instances[0].serverClose(4001, "ACCESS_TOKEN_EXPIRED");
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onAuthenticationFailure).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith("auth-recovering");
    expect(onStatus).toHaveBeenCalledWith("error");
    expect(MockSocket.instances).toHaveLength(1);
  });
});
