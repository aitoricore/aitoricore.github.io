---
date : '2026-08-12T21:23:59+08:00'
draft : false
title : 'html 测试'
tags:
  - '文章'
  - '过敏原提示：AI 内容'
weight: 1
showFullContent: true
info: |
  如题所述。
---
<div class="cool-panel">
  <div class="cool-panel-header">
    <span class="cool-dot"></span>
    <span class="cool-dot"></span>
    <span class="cool-dot"></span>
    <span class="cool-title">OBSERVATION // 041</span>
  </div>
  <div class="cool-panel-body">
    <div class="cool-label">今日观测报告</div>
    <div class="cool-status">鸽子拒绝承认自己是鸽子。</div>
    <div class="cool-divider"></div>
    <div class="cool-text">
      <p>21:17，天空没有发生任何值得记录的事情。云依旧按照自己的想法缓慢移动，月亮表现得像一枚被遗忘在抽屉深处的硬币，而那只鸽子站在窗台上，以一种非常没有说服力的姿势思考宇宙。</p>
      <p>我问它：“你在想什么？”</p>
      <p>它没有回答。这很正常，因为鸽子通常不会回答问题。但它随后往左走了三步，停下，又往右走了一步。我因此认为它已经给出了答案。</p>
      <p class="cool-quote">“如果世界真的有尽头，那么鸽子大概会在尽头发现一块写着‘禁止鸽子进入’的牌子。”</p>
      <p>于是我决定今天先不拯救世界。毕竟明天还要上课。</p>
    </div>
  </div>
  <div class="cool-panel-footer">
    <span>STATUS: UNEXPLAINED</span>
    <span>///</span>
    <span>请勿投喂鸽子</span>
  </div>
</div>

<style>
.cool-panel {
  margin: 2.5rem auto;
  max-width: 720px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 14px;
  overflow: hidden;
  background:
    linear-gradient(
      135deg,
      rgba(255,255,255,.08),
      rgba(255,255,255,.025)
    ),
    rgba(15,15,18,.92);
  color: #eee;
  box-shadow:
    0 18px 50px rgba(0,0,0,.25),
    inset 0 1px 0 rgba(255,255,255,.08);
  font-family:
    "SFMono-Regular",
    Consolas,
    "Liberation Mono",
    monospace;
}

.cool-panel-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 15px;
  border-bottom: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.035);
}

.cool-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,.3);
}

.cool-title {
  margin-left: 8px;
  font-size: .72rem;
  letter-spacing: .16em;
  opacity: .55;
}

.cool-panel-body {
  padding: 28px 30px;
}

.cool-label {
  font-size: .7rem;
  letter-spacing: .25em;
  opacity: .45;
}

.cool-status {
  margin-top: 8px;
  font-size: 1.7rem;
  line-height: 1.5;
  font-weight: 700;
  letter-spacing: .04em;
}

.cool-divider {
  height: 1px;
  margin: 25px 0 18px;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,.25),
    transparent
  );
}

.cool-text {
  font-size: .9rem;
  line-height: 1.9;
  color: rgba(255,255,255,.78);
}

.cool-text p {
  margin: 0 0 1.2em;
}

.cool-quote {
  padding-left: 16px;
  border-left: 2px solid rgba(255,255,255,.25);
  color: rgba(255,255,255,.55);
  font-style: italic;
}

.cool-panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 9px 15px;
  border-top: 1px solid rgba(255,255,255,.08);
  font-size: .65rem;
  letter-spacing: .12em;
  opacity: .35;
}

@media (max-width: 600px) {
  .cool-panel-body {
    padding: 22px 20px;
  }

  .cool-panel-footer {
    flex-direction: column;
    gap: 5px;
  }
}
</style>