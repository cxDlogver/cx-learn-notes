import request, { setUnauthenticatedHandler } from "@/utils/request";
import { performanceMonitor } from "@/services/performance/monitor";
import { accessTokenManager } from "@/services/accessToken";
jest.mock("@/services/performance/monitor", () => ({ performanceMonitor: {
  isActive: true, stamp: jest.fn(() => ({at: 0, epoch: 1, view: "view"})),
  elapsed: jest.fn(() => 750), record: jest.fn()
}}));
jest.mock("@/services/accessToken", () => ({ accessTokenManager: {
  getAccessToken: jest.fn(() => "token"), refreshAccessToken: jest.fn(async () => "fresh"),
  clearAccessToken: jest.fn()
}}));
jest.mock("element-ui", () => ({ Message: { error: jest.fn() } }));
describe("logical performance through real Axios config merging", () => {
  const adapter = request.defaults.adapter;
  beforeEach(() => { jest.clearAllMocks(); setUnauthenticatedHandler(() => undefined); });
  afterEach(() => { request.defaults.adapter = adapter; });
  test("retains one measurement and two attempts across a 401 retry", async () => {
    const configs = [];
    request.defaults.adapter = async config => {
      configs.push(config);
      if (configs.length === 1) throw {config, response:{status:401}};
      return {config, status:200, data:{ok:true}, headers:{}, statusText:"OK"};
    };
    await request.get("/api/chart/dataTrans/5min");
    expect(accessTokenManager.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(configs[0]._performance).toBe(configs[1]._performance);
    expect(performanceMonitor.record.mock.calls.filter(c => c[0] === "apiDuration")).toHaveLength(1);
    expect(performanceMonitor.record).toHaveBeenCalledWith("apiAttempts", 2, "/api/chart/dataTrans/5min");
  });
  test("final repeated 401 is recorded once before redirect", async () => {
    const order = [];
    performanceMonitor.record.mockImplementation(name => { if(name === "apiFailure") order.push("failed"); });
    setUnauthenticatedHandler(() => { order.push("redirect"); });
    request.defaults.adapter = async config => { throw {config, response:{status:401}}; };
    await expect(request.get("/api/chart/dataTrans/5min")).rejects.toBeDefined();
    expect(order).toEqual(["failed", "redirect"]);
    expect(performanceMonitor.record.mock.calls.filter(c => c[0] === "apiDuration")).toHaveLength(1);
  });
});