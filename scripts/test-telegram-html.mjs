const token = '9182072811:AAFRPXdF5dQsl0xdOCZVwyS5O5YztmX0weA';
const chatId = '8556795729';

function markdownToTelegramHtml(md) {
  let s = md;
  // 1. Extract code blocks
  const codeBlocks = [];
  s = s.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
    const idx = codeBlocks.length;
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push('<pre><code>' + escapedCode + '</code></pre>');
    return '___CB_' + idx + '___';
  });

  // 2. Extract inline code
  const inlineCodes = [];
  s = s.replace(/`([^`\n]+)`/g, (match, code) => {
    const idx = inlineCodes.length;
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    inlineCodes.push('<code>' + escapedCode + '</code>');
    return '___IC_' + idx + '___';
  });

  // 3. Escape HTML special characters in regular text
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 4. Headers to clean bold titles
  s = s.replace(/^#{3,6}\s*(.+)$/gm, '📌 <b>$1</b>');
  s = s.replace(/^##\s*(.+)$/gm, '📁 <b>$1</b>');
  s = s.replace(/^#\s*(.+)$/gm, '📚 <b>$1</b>');

  // 5. Bold **text** and *text*
  s = s.replace(/\*\*([^\*\n]+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/\*([^\*\n]+?)\*/g, '<b>$1</b>');

  // 6. Horizontal dividers
  s = s.replace(/^[*\-_]{3,}$/gm, '─────────────────────────');

  // 7. Restore inline code and code blocks
  s = s.replace(/___IC_(\d+)___/g, (_, idx) => inlineCodes[Number(idx)]);
  s = s.replace(/___CB_(\d+)___/g, (_, idx) => codeBlocks[Number(idx)]);

  return s.trim();
}

const testText = `
# C Systems & Variables Guide
Here is how \`uint32_t\`, \`size_t\`, and \`<stdio.h>\` work:

\`\`\`c
#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint32_t user_counter = 42;
    printf("Counter: %u\\n", user_counter);
    return 0;
}
\`\`\`

**Takeaway:** Variables with snake_case and underscores now render perfectly!
`;

const html = markdownToTelegramHtml(testText);
console.log('HTML:\n', html);

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  })
});
const json = await res.json();
console.log('Result:', json);
