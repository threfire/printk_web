<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## AHE image2 调用约束

修改 `src/app/api/image2/route.ts` 或 `src/app/image2/page.tsx` 时，保持 AHE API 的 OpenAI 兼容图片生成格式：

- 文生图调用 `POST {baseUrl}/v1/images/generations`。
- 图生图调用 `POST {baseUrl}/v1/images/edits`。
- 模型固定为 `gpt-image-2`。
- 返回格式使用 `response_format: "b64_json"`，页面按 `data[].b64_json` 渲染图片。
- 不要把该平台调用改成 Responses API、SSE 流式字段、`partial_images`、`output_format` 或仅适用于 OpenAI 官方新接口的参数，除非先用 AHE 当前文档和一次真实请求确认可用。
- 调试时查看 `../storage/logs/image2-api.log`，日志只记录请求编号、端点、状态码、耗时和错误摘要，不记录密钥。
