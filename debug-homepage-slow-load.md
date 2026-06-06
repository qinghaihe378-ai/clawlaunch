# [OPEN] Debug Session: homepage-slow-load

## Symptoms
- 首页已改走 `/api/tokens`，但用户仍感知加载偏慢。
- 目标是定位首屏慢的主要瓶颈，优先确认是否发生在后端接口链路。

## Scope
- Frontend: `web/src/pages/MarketPage.tsx`
- Backend: `server/src/routes.ts`, `server/src/token-service.ts`, `server/src/factory-adapters.ts`

## Hypotheses
1. `/api/tokens` 接口响应时间过长，前端主要在等待接口返回。
2. `v1` 工厂适配层对每个 token 做了串行链上读取，导致接口耗时随 token 数量线性变慢。
3. Redis/MongoDB 当前未配置或未命中，首页每次都回源链上。
4. 前端渲染和筛选不是主瓶颈，接口数据到达前的等待时间占大头。

## Evidence Plan
- 给后端 `/api/tokens` 路由增加最小化耗时日志。
- 给 `token-service` 增加缓存命中/未命中日志。
- 给 `factory-adapters` 增加列表读取阶段耗时日志。
- 复现首页请求并比较各阶段耗时。

## Status
- Waiting for instrumentation.
