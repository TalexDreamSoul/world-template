/**
 * 统一对外暴露 Renderer 入口，方便恋综定制将来集中到这里。
 * 当前只是薄层包装 SandboxRenderer，后续要拆成 hooks/slots
 * 就直接改这一处即可，避免到处散落 import。
 */
export { SandboxRenderer as LoveVarietyRenderer } from "../../sandbox/SandboxRenderer.tsx";
