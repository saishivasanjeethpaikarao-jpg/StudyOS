import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: #090a0f;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 64px 72px;
      position: relative;
      overflow: hidden;
    }
    .glow-1 {
      position: absolute;
      top: -120px;
      right: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%);
      pointer-events: none;
    }
    .glow-2 {
      position: absolute;
      bottom: -150px;
      left: 100px;
      width: 550px;
      height: 550px;
      background: radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0) 70%);
      pointer-events: none;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 2;
    }
    .brand-logo {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #ff9a43, #f464b3, #9c52f5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 28px;
      color: #fff;
      box-shadow: 0 8px 24px rgba(244, 100, 179, 0.4);
    }
    .brand-name {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #ffffff 65%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tag {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
      font-size: 13px;
      font-weight: 600;
      padding: 5px 14px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-left: 8px;
    }
    .content {
      z-index: 2;
      max-width: 950px;
      margin-top: 20px;
    }
    h1 {
      font-size: 56px;
      font-weight: 800;
      line-height: 1.14;
      letter-spacing: -1.5px;
      margin-bottom: 20px;
      background: linear-gradient(180deg, #ffffff 30%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.lead {
      font-size: 23px;
      line-height: 1.48;
      color: #94a3b8;
      font-weight: 400;
      max-width: 850px;
    }
    .badges {
      display: flex;
      gap: 16px;
      z-index: 2;
      margin-top: 36px;
    }
    .badge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(30, 33, 48, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 18px;
      font-size: 16px;
      font-weight: 600;
      color: #e2e8f0;
      backdrop-filter: blur(8px);
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 22px;
      color: #64748b;
      font-size: 15px;
      font-weight: 500;
    }
    .url {
      color: #818cf8;
      font-weight: 600;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <div class="brand-row">
    <div class="brand-logo">S</div>
    <div class="brand-name">StudyOS</div>
    <div class="tag">AI Student Workspace</div>
  </div>

  <div class="content">
    <h1>Your study life, in one place.</h1>
    <p class="lead">Assignments, subjects, FocusTube video courses, and instant AI tutoring synchronized across web, desktop, and Telegram.</p>

    <div class="badges">
      <div class="badge">📅 Day & Month Planner</div>
      <div class="badge">🤖 24/7 AI Tutor</div>
      <div class="badge">🎯 FocusTube</div>
      <div class="badge">📱 Telegram Real-Time Sync</div>
    </div>
  </div>

  <div class="footer">
    <span>Built for high-performance students</span>
    <span class="url">studyos-web-8ruc.onrender.com</span>
  </div>
</body>
</html>
`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
const targetPath = path.resolve('apps/web/public/og-image.png');
await page.screenshot({ path: targetPath });
await browser.close();
console.log('Successfully generated StudyOS og-image.png at', targetPath);
