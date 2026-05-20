/**
 * CapInterest - AI Design Analyzer Client Library
 * Handles AI Scanning animations, API integration (via backend proxy), and rendering analysis results.
 */

const AIAnalyzer = {
  // Elements
  elements: {
    laserLine: null,
    scanViewport: null,
    scanPreview: null,
    dropzonePrompt: null,
    resultPlaceholder: null,
    resultContent: null,
    trendCirclePath: null,
    trendScoreNum: null,
    trendLevel: null,
    trendVerdict: null,
    resStyle: null,
    resMaterial: null,
    resPalette: null,
    resDesc: null,
    resOutfits: null,
    startScanBtn: null,
    resetScanBtn: null
  },

  // Initialize Elements
  init() {
    this.elements.laserLine = document.getElementById('laser-line');
    this.elements.scanViewport = document.getElementById('scan-viewport');
    this.elements.scanPreview = document.getElementById('scan-preview');
    this.elements.dropzonePrompt = document.getElementById('dropzone-prompt');
    this.elements.resultPlaceholder = document.getElementById('result-placeholder');
    this.elements.resultContent = document.getElementById('result-content');
    this.elements.trendCirclePath = document.getElementById('trend-circle-path');
    this.elements.trendScoreNum = document.getElementById('trend-score-num');
    this.elements.trendLevel = document.getElementById('trend-level');
    this.elements.trendVerdict = document.getElementById('trend-verdict');
    this.elements.resStyle = document.getElementById('res-style');
    this.elements.resMaterial = document.getElementById('res-material');
    this.elements.resPalette = document.getElementById('res-palette');
    this.elements.resDesc = document.getElementById('res-desc');
    this.elements.resOutfits = document.getElementById('res-outfits');
    this.elements.startScanBtn = document.getElementById('start-scan-btn');
    this.elements.resetScanBtn = document.getElementById('reset-scan-btn');
  },

  // Start the Scanner Animation and API Call
  async analyze(base64Image) {
    if (!base64Image) return;

    this.init();
    
    // 1. UI Feedback: Start laser scanning animation
    this.elements.laserLine.classList.add('scanning');
    this.elements.startScanBtn.disabled = true;
    this.elements.startScanBtn.innerHTML = `
      <div class="spinner" style="border-top-color:#fff; width:16px; height:16px;"></div>
      AI Đang Phân Tích Thiết Kế...
    `;
    
    // Show placeholder, hide previous results if any
    this.elements.resultPlaceholder.style.display = 'flex';
    this.elements.resultPlaceholder.innerHTML = `
      <div class="spinner" style="width: 40px; height: 40px;"></div>
      <p>AI đang giải mã cấu trúc sợi vải, phối màu và tính toán điểm xu hướng...</p>
    `;
    this.elements.resultContent.style.display = 'none';

    // Retrieve settings
    const configMode = localStorage.getItem('capinterest_mode') || 'demo';
    const apiKey = localStorage.getItem('capinterest_apikey') || '';

    try {
      // 2. Call backend proxy endpoint
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image,
          apiKey: configMode === 'gemini' ? apiKey : null // Send API Key if in Gemini mode
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Lỗi không xác định khi kết nối AI');
      }

      // 3. Stop scanning and render results
      this.elements.laserLine.classList.remove('scanning');
      this.renderResults(result.data);

    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      // Stop scanner
      this.elements.laserLine.classList.remove('scanning');
      
      // Show error in results panel
      this.elements.resultPlaceholder.innerHTML = `
        <svg viewBox="0 0 24 24" width="64" height="64" style="color: var(--accent-pink);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>
        <p style="color: var(--accent-pink); font-weight: 600;">Phân tích thất bại</p>
        <p style="font-size: 13px;">${error.message}.<br>Vui lòng kiểm tra lại cấu hình API trong phần cài đặt.</p>
      `;
    } finally {
      this.elements.startScanBtn.disabled = false;
      this.elements.startScanBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>
        Quét & Phân Tích Bằng AI
      `;
    }
  },

  // Render the data inside the results columns
  renderResults(data) {
    // Hide placeholder, show content
    this.elements.resultPlaceholder.style.display = 'none';
    this.elements.resultContent.style.display = 'flex';

    // Set Style & Material
    this.elements.resStyle.textContent = data.style || 'Nón Thời Trang';
    this.elements.resMaterial.textContent = data.material || 'Vải hỗn hợp';
    this.elements.resDesc.textContent = data.aestheticDescription || 'Không có đánh giá thẩm mỹ.';

    // Animate Trend Score
    const targetScore = data.trendScore || 50;
    this.animateScore(targetScore);

    // Setup Trend Level text based on score
    let levelText = 'Tiềm Năng';
    let verdictText = 'Thiết kế độc đáo, có tiềm năng tạo xu hướng mới.';
    let levelColor = 'var(--accent-cyan)';

    if (targetScore >= 90) {
      levelText = 'Siêu Xu Hướng (Hyper-Trend)';
      verdictText = 'Thiết kế đang cực kỳ bùng nổ, dẫn đầu xu hướng thời trang streetwear!';
      levelColor = 'var(--accent-pink)';
    } else if (targetScore >= 80) {
      levelText = 'Thịnh Hành (Trending)';
      verdictText = 'Sản phẩm đang được ưa chuộng rộng rãi bởi giới trẻ và cộng đồng fashionista.';
      levelColor = 'var(--accent-emerald)';
    } else if (targetScore < 70) {
      levelText = 'Phong Cách Ngách (Classic/Niche)';
      verdictText = 'Một thiết kế cổ điển, mang tính thẩm mỹ bền vững, phù hợp gu thời trang kén chọn.';
      levelColor = 'var(--text-secondary)';
    }

    this.elements.trendLevel.textContent = levelText;
    this.elements.trendLevel.style.color = levelColor;
    this.elements.trendVerdict.textContent = verdictText;

    // Render Color Swatches
    this.elements.resPalette.innerHTML = '';
    if (data.colorPalette && Array.isArray(data.colorPalette)) {
      data.colorPalette.forEach(hex => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.title = `Click để sao chép mã màu ${hex}`;
        swatch.innerHTML = `
          <div class="color-dot" style="background-color: ${hex};"></div>
          <span>${hex}</span>
        `;
        swatch.addEventListener('click', () => {
          navigator.clipboard.writeText(hex).then(() => {
            const span = swatch.querySelector('span');
            const originalText = span.textContent;
            span.textContent = 'Copied!';
            setTimeout(() => {
              span.textContent = originalText;
            }, 1000);
          });
        });
        this.elements.resPalette.appendChild(swatch);
      });
    }

    // Render Outfit matches
    this.elements.resOutfits.innerHTML = '';
    if (data.outfitMatches && Array.isArray(data.outfitMatches)) {
      data.outfitMatches.forEach(outfit => {
        const li = document.createElement('li');
        li.textContent = outfit;
        this.elements.resOutfits.appendChild(li);
      });
    }
  },

  // Animate the circle gauge and score counter
  animateScore(targetScore) {
    let currentScore = 0;
    this.elements.trendCirclePath.setAttribute('stroke-dasharray', `0, 100`);
    this.elements.trendScoreNum.textContent = '0%';

    // Add a SVG gradient to the document if not exists
    if (!document.getElementById('trend-grad')) {
      const svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgDefs.className = 'svg-gradient-def';
      svgDefs.innerHTML = `
        <defs>
          <linearGradient id="trend-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="var(--accent-cyan)" />
            <stop offset="100%" stop-color="var(--accent-purple)" />
          </linearGradient>
        </defs>
      `;
      document.body.appendChild(svgDefs);
    }

    const duration = 1200; // ms
    const intervalTime = 16; // ~60fps
    const step = targetScore / (duration / intervalTime);

    const timer = setInterval(() => {
      currentScore += step;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(timer);
      }
      
      const rounded = Math.round(currentScore);
      this.elements.trendScoreNum.textContent = `${rounded}%`;
      this.elements.trendCirclePath.setAttribute('stroke-dasharray', `${rounded}, 100`);
    }, intervalTime);
  }
};
